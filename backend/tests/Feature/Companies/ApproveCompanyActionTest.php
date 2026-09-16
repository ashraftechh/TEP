<?php

declare(strict_types=1);

namespace Tests\Feature\Companies;

use App\Actions\Companies\ApproveCompanyAction;
use App\Actions\Companies\GenerateCompanyJoinInvite;
use App\Exceptions\CompanyApprovalException;
use App\Mail\CompanyJoinInviteMail;
use App\Models\AuditLog;
use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use RuntimeException;
use Tests\TestCase;

class ApproveCompanyActionTest extends TestCase
{
    use RefreshDatabase;

    public function test_successfully_approves_company_in_pending_verification_status(): void
    {
        Mail::fake();

        $approver = User::factory()->create();
        $this->actingAs($approver);

        $company = Company::factory()->create([
            'contact_email' => 'partner@company.org',
            'status' => 'pending_verification',
            'approved_by' => null,
            'approved_at' => null,
        ]);

        $action = app(ApproveCompanyAction::class);
        $result = $action->execute($company);
        $updatedCompany = $result['company'];

        // Assert company status updated
        $this->assertSame('approved', $updatedCompany->status);
        $this->assertTrue($result['mail_sent']);
        $this->assertSame($approver->id, $updatedCompany->approved_by);
        $this->assertNotNull($updatedCompany->approved_at);

        $this->assertDatabaseHas('companies', [
            'id' => $company->id,
            'status' => 'approved',
            'approved_by' => $approver->id,
        ]);

        // Assert invitation email sent
        Mail::assertSent(CompanyJoinInviteMail::class, function (CompanyJoinInviteMail $mail) use ($company) {
            $this->assertTrue($mail->hasTo('partner@company.org'));
            $this->assertSame($company->id, $mail->company->id);
            $this->assertStringContainsString('/companies/join/'.$company->id, $mail->inviteUrl);
            $this->assertStringContainsString('signature=', $mail->inviteUrl);

            return true;
        });

        // Assert audit log created
        $this->assertDatabaseHas('audit_logs', [
            'actor_id' => $approver->id,
            'action' => 'companies.approve',
            'entity_type' => 'companies',
            'entity_id' => $company->id,
        ]);

        $auditLog = AuditLog::where('entity_id', $company->id)->first();
        $this->assertNotNull($auditLog);
        $this->assertSame('pending_verification', $auditLog->before_state['status']);
        $this->assertSame('approved', $auditLog->after_state['status']);
        $this->assertSame($approver->id, $auditLog->after_state['approved_by']);
    }

    public function test_successfully_approves_company_in_under_review_status(): void
    {
        Mail::fake();

        $approver = User::factory()->create();

        $company = Company::factory()->create([
            'contact_email' => 'review@company.org',
            'status' => 'under_review',
            'approved_by' => null,
            'approved_at' => null,
        ]);

        $action = app(ApproveCompanyAction::class);
        $result = $action->execute($company, $approver->id);
        $updatedCompany = $result['company'];

        $this->assertSame('approved', $updatedCompany->status);
        $this->assertTrue($result['mail_sent']);
        $this->assertSame($approver->id, $updatedCompany->approved_by);
        $this->assertNotNull($updatedCompany->approved_at);

        Mail::assertSent(CompanyJoinInviteMail::class, 1);
    }

    public function test_does_not_approve_company_when_invitation_email_fails(): void
    {
        $approver = User::factory()->create();
        $this->actingAs($approver);

        $company = Company::factory()->create([
            'contact_email' => 'unavailable@company.org',
            'status' => 'pending_verification',
            'approved_by' => null,
            'approved_at' => null,
        ]);

        Mail::shouldReceive('to')
            ->once()
            ->with('unavailable@company.org')
            ->andThrow(new RuntimeException('Mail server unavailable'));

        $action = app(ApproveCompanyAction::class);

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Mail server unavailable');

        try {
            $action->execute($company);
        } finally {
            $this->assertDatabaseHas('companies', [
                'id' => $company->id,
                'status' => 'pending_verification',
                'approved_by' => null,
                'approved_at' => null,
            ]);
            $this->assertDatabaseCount('audit_logs', 0);
        }
    }

    public function test_cannot_approve_company_with_already_terminal_or_invalid_status(): void
    {
        Mail::fake();

        $invalidStatuses = ['approved', 'rejected', 'changes_requested', 'suspended'];
        $action = app(ApproveCompanyAction::class);

        foreach ($invalidStatuses as $invalidStatus) {
            $company = Company::factory()->create([
                'contact_email' => "test-{$invalidStatus}@company.org",
                'status' => $invalidStatus,
            ]);

            try {
                $action->execute($company);
                $this->fail("Expected CompanyApprovalException was not thrown for status: {$invalidStatus}");
            } catch (CompanyApprovalException $e) {
                $this->assertStringContainsString($invalidStatus, $e->getMessage());
            }

            // Assert database status was not changed
            $this->assertDatabaseHas('companies', [
                'id' => $company->id,
                'status' => $invalidStatus,
            ]);
        }

        Mail::assertNothingSent();
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_cannot_approve_company_with_missing_contact_email(): void
    {
        Mail::fake();

        $company = Company::factory()->create([
            'contact_email' => null,
            'status' => 'pending_verification',
        ]);

        $action = app(ApproveCompanyAction::class);

        $this->expectException(CompanyApprovalException::class);
        $this->expectExceptionMessage('Cannot approve a company with no contact email — request changes instead');

        $action->execute($company);

        Mail::assertNothingSent();
        $this->assertDatabaseCount('audit_logs', 0);
    }

    public function test_generate_company_join_invite_creates_valid_signed_url(): void
    {
        $company = Company::factory()->create([
            'contact_email' => 'invite@company.com',
        ]);

        $generateAction = app(GenerateCompanyJoinInvite::class);
        $signedUrl = $generateAction->execute($company, 'invite@company.com', 7);

        $this->assertNotEmpty($signedUrl);
        $this->assertStringContainsString('/companies/join/'.$company->id, $signedUrl);
        $query = (string) parse_url($signedUrl, PHP_URL_QUERY);
        $canonicalUrl = route('company.join', ['company' => $company->id]).'?'.$query;
        $this->assertTrue(URL::hasValidSignature(Request::create($canonicalUrl)));
    }
}
