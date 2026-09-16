<?php

declare(strict_types=1);

namespace Tests\Feature\Filament;

use App\Filament\Resources\Companies\Pages\ListCompanies;
use App\Mail\CompanyJoinInviteMail;
use App\Mail\CompanyStatusUpdateMail;
use App\Models\Company;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Livewire\Livewire;
use Tests\TestCase;

class CompanyResourceTest extends TestCase
{
    use RefreshDatabase;

    private function createCoordinatorUser(): User
    {
        $user = User::factory()->create(['status' => 'active']);
        $role = Role::firstOrCreate(['name' => 'training_coordinator'], [
            'display_name' => ['en' => 'Training Coordinator', 'ar' => 'منسق التدريب'],
            'description' => 'Manages company partnerships and training workflows.',
        ]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $role->id,
            'scope_type' => null,
            'scope_id' => null,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        return $user;
    }

    private function createStudentUser(): User
    {
        $user = User::factory()->create(['status' => 'active']);
        $role = Role::firstOrCreate(['name' => 'student'], [
            'display_name' => ['en' => 'Student', 'ar' => 'طالب'],
            'description' => 'Enrolled university trainee student.',
        ]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $role->id,
            'scope_type' => null,
            'scope_id' => null,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        return $user;
    }

    public function test_guest_is_redirected_from_admin_panel(): void
    {
        $response = $this->get('/admin');

        $response->assertRedirect('/admin/login');
    }

    public function test_student_cannot_access_filament_admin_panel(): void
    {
        $student = $this->createStudentUser();

        $response = $this->actingAs($student)->get('/admin');

        $response->assertStatus(403);
    }

    public function test_training_coordinator_can_access_filament_admin_panel(): void
    {
        $coordinator = $this->createCoordinatorUser();

        $response = $this->actingAs($coordinator)->get('/admin');

        $response->assertStatus(200);
    }

    public function test_company_resource_table_lists_all_records_by_default_and_filters_by_tabs(): void
    {
        $coordinator = $this->createCoordinatorUser();

        $pendingCompany = Company::factory()->create([
            'name' => ['en' => 'Pending Tech', 'ar' => 'التقنية المعلقة'],
            'contact_email' => 'pending@tech.com',
            'status' => 'pending_verification',
        ]);

        $underReviewCompany = Company::factory()->create([
            'name' => ['en' => 'Review Logistics', 'ar' => 'لوجستيات قيد المراجعة'],
            'contact_email' => 'review@logistics.com',
            'status' => 'under_review',
        ]);

        $approvedCompany = Company::factory()->create([
            'name' => ['en' => 'Approved Corp', 'ar' => 'المؤسسة المعتمدة'],
            'contact_email' => 'approved@corp.com',
            'status' => 'approved',
        ]);

        $rejectedCompany = Company::factory()->create([
            'name' => ['en' => 'Rejected LLC', 'ar' => 'الشركة المرفوضة'],
            'contact_email' => 'rejected@llc.com',
            'status' => 'rejected',
        ]);

        $this->actingAs($coordinator);

        // Default 'all' tab shows all records
        Livewire::test(ListCompanies::class)
            ->assertCanSeeTableRecords([$pendingCompany, $underReviewCompany, $approvedCompany, $rejectedCompany]);

        // 'pending_verification' tab shows merged pending & under_review records
        Livewire::test(ListCompanies::class)
            ->set('activeTab', 'pending_verification')
            ->assertCanSeeTableRecords([$pendingCompany, $underReviewCompany])
            ->assertCanNotSeeTableRecords([$approvedCompany, $rejectedCompany]);

        // 'approved' tab shows only approved records
        Livewire::test(ListCompanies::class)
            ->set('activeTab', 'approved')
            ->assertCanSeeTableRecords([$approvedCompany])
            ->assertCanNotSeeTableRecords([$pendingCompany, $underReviewCompany, $rejectedCompany]);
    }

    public function test_coordinator_can_approve_company_from_table_action(): void
    {
        Mail::fake();

        $coordinator = $this->createCoordinatorUser();
        $this->actingAs($coordinator);

        $company = Company::factory()->create([
            'contact_email' => 'candidate@company.org',
            'status' => 'pending_verification',
        ]);

        Livewire::test(ListCompanies::class)
            ->callTableAction('approve', $company)
            ->assertHasNoTableActionErrors();

        $company->refresh();
        $this->assertSame('approved', $company->status);
        $this->assertSame($coordinator->id, $company->approved_by);
        $this->assertNotNull($company->approved_at);

        Mail::assertSent(CompanyJoinInviteMail::class, 1);
    }

    public function test_coordinator_can_reject_company_from_table_action(): void
    {
        Mail::fake();

        $coordinator = $this->createCoordinatorUser();
        $this->actingAs($coordinator);

        $company = Company::factory()->create([
            'contact_email' => 'rejectable@company.org',
            'status' => 'pending_verification',
        ]);

        Livewire::test(ListCompanies::class)
            ->callTableAction('reject', $company, data: [
                'status' => 'rejected',
                'reason' => 'Commercial license is not valid for cooperative training.',
            ])
            ->assertHasNoTableActionErrors();

        $company->refresh();
        $this->assertSame('rejected', $company->status);
        $this->assertSame('Commercial license is not valid for cooperative training.', $company->status_reason);
        $this->assertNull($company->approved_by);

        Mail::assertSent(CompanyStatusUpdateMail::class, function (CompanyStatusUpdateMail $mail) {
            $this->assertSame('rejected', $mail->status);
            $this->assertSame('Commercial license is not valid for cooperative training.', $mail->reason);

            return true;
        });
    }

    public function test_coordinator_can_request_changes_from_table_action(): void
    {
        Mail::fake();

        $coordinator = $this->createCoordinatorUser();
        $this->actingAs($coordinator);

        $company = Company::factory()->create([
            'contact_email' => 'incomplete@company.org',
            'status' => 'under_review',
        ]);

        Livewire::test(ListCompanies::class)
            ->callTableAction('reject', $company, data: [
                'status' => 'changes_requested',
                'reason' => 'Please provide complete contact phone and valid company website.',
            ])
            ->assertHasNoTableActionErrors();

        $company->refresh();
        $this->assertSame('changes_requested', $company->status);
        $this->assertSame('Please provide complete contact phone and valid company website.', $company->status_reason);
        $this->assertNull($company->approved_by);

        Mail::assertSent(CompanyStatusUpdateMail::class, function (CompanyStatusUpdateMail $mail) {
            $this->assertSame('changes_requested', $mail->status);
            $this->assertStringContainsString('contact phone', $mail->reason);

            return true;
        });
    }

    public function test_approve_and_reject_actions_are_visible_for_queue_companies(): void
    {
        $coordinator = $this->createCoordinatorUser();
        $this->actingAs($coordinator);

        $pendingCompany = Company::factory()->create([
            'contact_email' => 'pending@company.org',
            'status' => 'pending_verification',
        ]);

        $underReviewCompany = Company::factory()->create([
            'contact_email' => 'review@company.org',
            'status' => 'under_review',
        ]);

        $changesRequestedCompany = Company::factory()->create([
            'contact_email' => 'changes@company.org',
            'status' => 'changes_requested',
        ]);

        Livewire::test(ListCompanies::class)
            ->assertTableActionVisible('approve', $pendingCompany)
            ->assertTableActionVisible('reject', $pendingCompany)
            ->assertTableActionVisible('approve', $underReviewCompany)
            ->assertTableActionVisible('reject', $underReviewCompany)
            ->assertTableActionHidden('reject', $changesRequestedCompany);
    }

    public function test_unauthorized_user_is_forbidden_from_accessing_company_resource(): void
    {
        $student = $this->createStudentUser();

        $response = $this->actingAs($student)->get('/admin/companies');

        $response->assertStatus(403);
    }

    public function test_suspend_requires_a_reason(): void
    {
        $coordinator = $this->createCoordinatorUser();
        $this->actingAs($coordinator);

        $company = Company::factory()->create([
            'status' => 'approved',
            'status_reason' => null,
        ]);

        Livewire::test(ListCompanies::class)
            ->callTableAction('suspend', $company, data: ['reason' => ''])
            ->assertHasTableActionErrors(['reason' => 'required']);

        $company->refresh();
        $this->assertSame('approved', $company->status);
        $this->assertNull($company->status_reason);
    }
}
