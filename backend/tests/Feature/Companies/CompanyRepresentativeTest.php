<?php

declare(strict_types=1);

namespace Tests\Feature\Companies;

use App\Mail\CompanyJoinInviteMail;
use App\Models\Company;
use App\Models\CompanyRepresentative;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class CompanyRepresentativeTest extends TestCase
{
    use RefreshDatabase;

    private Role $repRole;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->seed(PermissionSeeder::class);
        $this->repRole = Role::where('name', 'company_representative')->firstOrFail();
    }

    private function createRepresentativeUser(Company $company, bool $isPrimary = false, ?string $jobTitle = null): User
    {
        $user = User::factory()->create([
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        CompanyRepresentative::create([
            'company_id' => $company->id,
            'user_id' => $user->id,
            'is_primary' => $isPrimary,
            'job_title' => $jobTitle,
        ]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $this->repRole->id,
            'scope_type' => 'company',
            'scope_id' => $company->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        return $user;
    }

    public function test_get_representatives_unauthenticated_returns_401(): void
    {
        $response = $this->getJson('/api/v1/company/representatives');

        $response->assertStatus(401);
    }

    public function test_get_representatives_without_permission_returns_403(): void
    {
        $studentUser = User::factory()->create(['status' => 'active']);

        $response = $this->actingAs($studentUser)->getJson('/api/v1/company/representatives');

        $response->assertStatus(403);
    }

    public function test_get_representatives_lists_company_representatives_ordered_correctly(): void
    {
        $company = Company::factory()->create(['status' => 'approved']);
        $primary = $this->createRepresentativeUser($company, isPrimary: true, jobTitle: 'HR Director');

        $secondary1 = $this->createRepresentativeUser($company, isPrimary: false, jobTitle: 'Recruiter');
        $secondary2 = $this->createRepresentativeUser($company, isPrimary: false, jobTitle: 'Talent Lead');

        // Another company's rep to ensure no data leakage
        $otherCompany = Company::factory()->create(['status' => 'approved']);
        $this->createRepresentativeUser($otherCompany, isPrimary: true);

        $response = $this->actingAs($primary)->getJson('/api/v1/company/representatives');

        $response->assertStatus(200)
            ->assertJsonPath('is_admin', true)
            ->assertJsonCount(3, 'data')
            ->assertJsonPath('data.0.id', $primary->companyRepresentative->id)
            ->assertJsonPath('data.0.is_primary', true)
            ->assertJsonPath('data.0.job_title', 'HR Director')
            ->assertJsonPath('data.1.id', $secondary1->companyRepresentative->id)
            ->assertJsonPath('data.1.is_primary', false)
            ->assertJsonPath('data.2.id', $secondary2->companyRepresentative->id)
            ->assertJsonPath('data.2.is_primary', false);

        // Also check that a non-primary rep sees is_admin: false
        $nonAdminResponse = $this->actingAs($secondary1)->getJson('/api/v1/company/representatives');
        $nonAdminResponse->assertStatus(200)
            ->assertJsonPath('is_admin', false);

        // Structural check: confirm list endpoint has no arbitrary ID parameter
        $this->assertEquals('api/v1/company/representatives', Route::getRoutes()->getByName('company.representatives.index')->uri());
    }

    public function test_primary_representative_can_invite_colleague(): void
    {
        Mail::fake();

        $company = Company::factory()->create(['status' => 'approved']);
        $primary = $this->createRepresentativeUser($company, isPrimary: true);

        $initialRepCount = CompanyRepresentative::where('company_id', $company->id)->count();

        $response = $this->actingAs($primary)->postJson('/api/v1/company/representatives/invite', [
            'email' => 'colleague@company.com',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => ['invite_url'],
                'message',
            ]);

        Mail::assertSent(CompanyJoinInviteMail::class, function (CompanyJoinInviteMail $mail) use ($company) {
            return $mail->company->id === $company->id && $mail->hasTo('colleague@company.com');
        });

        // Inviting does not create a company_representatives row yet (only happens when invite is consumed)
        $this->assertEquals($initialRepCount, CompanyRepresentative::where('company_id', $company->id)->count());
    }

    public function test_non_primary_representative_cannot_invite_colleague(): void
    {
        Mail::fake();

        $company = Company::factory()->create(['status' => 'approved']);
        $nonPrimary = $this->createRepresentativeUser($company, isPrimary: false);

        $response = $this->actingAs($nonPrimary)->postJson('/api/v1/company/representatives/invite', [
            'email' => 'colleague@company.com',
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('error_code', 'admin_only');

        Mail::assertNothingSent();
    }

    public function test_invite_rejects_duplicate_email_for_same_company(): void
    {
        Mail::fake();

        $company = Company::factory()->create(['status' => 'approved']);
        $primary = $this->createRepresentativeUser($company, isPrimary: true);
        $colleague = $this->createRepresentativeUser($company, isPrimary: false);

        $response = $this->actingAs($primary)->postJson('/api/v1/company/representatives/invite', [
            'email' => $colleague->email,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);

        Mail::assertNothingSent();
    }

    public function test_representative_can_update_own_job_title(): void
    {
        $company = Company::factory()->create(['status' => 'approved']);
        $rep = $this->createRepresentativeUser($company, isPrimary: false, jobTitle: 'Junior Recruiter');

        $response = $this->actingAs($rep)->patchJson('/api/v1/company/representatives/me', [
            'job_title' => 'Senior Recruiter',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.job_title', 'Senior Recruiter');

        $this->assertDatabaseHas('company_representatives', [
            'id' => $rep->companyRepresentative->id,
            'job_title' => 'Senior Recruiter',
        ]);
    }

    public function test_primary_representative_can_update_another_representative(): void
    {
        $company = Company::factory()->create(['status' => 'approved']);
        $primary = $this->createRepresentativeUser($company, isPrimary: true);
        $colleague = $this->createRepresentativeUser($company, isPrimary: false, jobTitle: 'Assistant');

        $response = $this->actingAs($primary)->patchJson(
            "/api/v1/company/representatives/{$colleague->companyRepresentative->id}",
            ['job_title' => 'Operations Manager']
        );

        $response->assertStatus(200)
            ->assertJsonPath('data.job_title', 'Operations Manager');

        $this->assertDatabaseHas('company_representatives', [
            'id' => $colleague->companyRepresentative->id,
            'job_title' => 'Operations Manager',
        ]);
    }

    public function test_non_primary_representative_cannot_update_another_representative(): void
    {
        $company = Company::factory()->create(['status' => 'approved']);
        $rep1 = $this->createRepresentativeUser($company, isPrimary: false);
        $rep2 = $this->createRepresentativeUser($company, isPrimary: false);

        $response = $this->actingAs($rep1)->patchJson(
            "/api/v1/company/representatives/{$rep2->companyRepresentative->id}",
            ['job_title' => 'Hacker']
        );

        $response->assertStatus(403)
            ->assertJsonPath('error_code', 'admin_only');
    }

    public function test_primary_representative_cannot_update_representative_of_different_company(): void
    {
        $company1 = Company::factory()->create(['status' => 'approved']);
        $company2 = Company::factory()->create(['status' => 'approved']);

        $primary1 = $this->createRepresentativeUser($company1, isPrimary: true);
        $rep2 = $this->createRepresentativeUser($company2, isPrimary: false);

        $response = $this->actingAs($primary1)->patchJson(
            "/api/v1/company/representatives/{$rep2->companyRepresentative->id}",
            ['job_title' => 'Unauthorized Change']
        );

        $response->assertStatus(403);

        $this->assertDatabaseHas('company_representatives', [
            'id' => $rep2->companyRepresentative->id,
            'job_title' => null,
        ]);
    }

    public function test_primary_representative_can_remove_colleague(): void
    {
        $company = Company::factory()->create(['status' => 'approved']);
        $primary = $this->createRepresentativeUser($company, isPrimary: true);
        $colleague = $this->createRepresentativeUser($company, isPrimary: false);

        $colleagueRepId = $colleague->companyRepresentative->id;
        $colleagueUserId = $colleague->id;

        $response = $this->actingAs($primary)->deleteJson(
            "/api/v1/company/representatives/{$colleagueRepId}"
        );

        $response->assertStatus(200);

        $this->assertDatabaseMissing('company_representatives', [
            'id' => $colleagueRepId,
        ]);

        $this->assertDatabaseMissing('user_roles', [
            'user_id' => $colleagueUserId,
            'scope_type' => 'company',
            'scope_id' => $company->id,
        ]);

        $this->assertDatabaseMissing('users', [
            'id' => $colleagueUserId,
        ]);
    }

    public function test_non_primary_cannot_remove_colleague(): void
    {
        $company = Company::factory()->create(['status' => 'approved']);
        $rep1 = $this->createRepresentativeUser($company, isPrimary: false);
        $rep2 = $this->createRepresentativeUser($company, isPrimary: false);

        $response = $this->actingAs($rep1)->deleteJson(
            "/api/v1/company/representatives/{$rep2->companyRepresentative->id}"
        );

        $response->assertStatus(403)
            ->assertJsonPath('error_code', 'admin_only');

        $this->assertDatabaseHas('company_representatives', [
            'id' => $rep2->companyRepresentative->id,
        ]);
    }

    public function test_non_primary_can_leave_company_voluntarily(): void
    {
        $company = Company::factory()->create(['status' => 'approved']);
        $primary = $this->createRepresentativeUser($company, isPrimary: true);
        $nonPrimary = $this->createRepresentativeUser($company, isPrimary: false);

        $nonPrimaryRepId = $nonPrimary->companyRepresentative->id;
        $nonPrimaryUserId = $nonPrimary->id;

        $response = $this->actingAs($nonPrimary)->deleteJson(
            "/api/v1/company/representatives/{$nonPrimaryRepId}"
        );

        $response->assertStatus(200);

        $this->assertDatabaseMissing('company_representatives', [
            'id' => $nonPrimaryRepId,
        ]);

        $this->assertDatabaseMissing('user_roles', [
            'user_id' => $nonPrimaryUserId,
            'scope_type' => 'company',
            'scope_id' => $company->id,
        ]);

        $this->assertDatabaseMissing('users', [
            'id' => $nonPrimaryUserId,
        ]);
    }

    public function test_primary_leaving_auto_promotes_earliest_remaining_representative(): void
    {
        $company = Company::factory()->create(['status' => 'approved']);
        $primary = $this->createRepresentativeUser($company, isPrimary: true);

        // Secondary 1 created first
        $secondary1 = $this->createRepresentativeUser($company, isPrimary: false);
        // Ensure different timestamp
        $secondary1->companyRepresentative->update(['created_at' => now()->subHours(2)]);

        // Secondary 2 created later
        $secondary2 = $this->createRepresentativeUser($company, isPrimary: false);
        $secondary2->companyRepresentative->update(['created_at' => now()->subHour()]);

        $response = $this->actingAs($primary)->deleteJson(
            "/api/v1/company/representatives/{$primary->companyRepresentative->id}"
        );

        $response->assertStatus(200);

        $this->assertDatabaseMissing('company_representatives', [
            'id' => $primary->companyRepresentative->id,
        ]);

        $this->assertDatabaseMissing('users', [
            'id' => $primary->id,
        ]);

        // Secondary 1 should now be primary
        $this->assertTrue((bool) $secondary1->companyRepresentative->fresh()->is_primary);
        $this->assertFalse((bool) $secondary2->companyRepresentative->fresh()->is_primary);
    }

    public function test_sole_representative_cannot_leave_company(): void
    {
        $company = Company::factory()->create(['status' => 'approved']);
        $solePrimary = $this->createRepresentativeUser($company, isPrimary: true);

        $response = $this->actingAs($solePrimary)->deleteJson(
            "/api/v1/company/representatives/{$solePrimary->companyRepresentative->id}"
        );

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'last_representative');

        $this->assertEquals(1, CompanyRepresentative::where('company_id', $company->id)->count());
        $this->assertDatabaseHas('users', ['id' => $solePrimary->id]);
    }

    public function test_cannot_remove_representative_from_another_company(): void
    {
        $company1 = Company::factory()->create(['status' => 'approved']);
        $company2 = Company::factory()->create(['status' => 'approved']);

        $primary1 = $this->createRepresentativeUser($company1, isPrimary: true);
        $rep2 = $this->createRepresentativeUser($company2, isPrimary: false);

        $response = $this->actingAs($primary1)->deleteJson(
            "/api/v1/company/representatives/{$rep2->companyRepresentative->id}"
        );

        $response->assertStatus(403);

        $this->assertDatabaseHas('company_representatives', [
            'id' => $rep2->companyRepresentative->id,
        ]);
    }
}
