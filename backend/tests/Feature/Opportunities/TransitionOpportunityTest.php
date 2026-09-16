<?php

declare(strict_types=1);

namespace Tests\Feature\Opportunities;

use App\Models\Company;
use App\Models\CompanyRepresentative;
use App\Models\Opportunity;
use App\Models\OpportunityType;
use App\Models\Role;
use App\Models\TrainingCycle;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\LookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TransitionOpportunityTest extends TestCase
{
    use RefreshDatabase;

    private Role $repRole;

    private OpportunityType $oppType;

    private TrainingCycle $trainingCycle;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(PermissionSeeder::class);
        $this->seed(LookupSeeder::class);

        $this->repRole = Role::where('name', 'company_representative')->firstOrFail();

        $this->oppType = OpportunityType::firstOrCreate(
            ['code' => 'cooperative'],
            ['name' => ['en' => 'Cooperative', 'ar' => 'تعاوني'], 'is_active' => true]
        );

        $this->trainingCycle = TrainingCycle::create([
            'name' => ['en' => 'Fall 2026', 'ar' => 'خريف 2026'],
            'academic_year' => '2026/2027',
            'semester' => 'first',
            'application_start_at' => '2026-08-01 00:00:00',
            'application_end_at' => '2026-09-01 23:59:59',
            'end_date' => '2027-01-30',
            'status' => 'active',
        ]);
    }

    private function createCompanyUser(string $companyStatus = 'approved', bool $isPrimary = true): array
    {
        $company = Company::factory()->create([
            'status' => $companyStatus,
            'approved_at' => $companyStatus === 'approved' ? now() : null,
        ]);

        $user = User::factory()->create([
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        CompanyRepresentative::create([
            'company_id' => $company->id,
            'user_id' => $user->id,
            'is_primary' => $isPrimary,
            'job_title' => 'HR Manager',
        ]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $this->repRole->id,
            'scope_type' => 'company',
            'scope_id' => $company->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        return [$user, $company];
    }

    private function createOpportunity(Company $company, User $user, array $overrides = []): Opportunity
    {
        return Opportunity::create(array_merge([
            'company_id' => $company->id,
            'opportunity_type_id' => $this->oppType->id,
            'training_cycle_id' => $this->trainingCycle->id,
            'created_by' => $user->id,
            'title' => [
                'ar' => 'فرصة تدريبية',
                'en' => 'Training Opportunity',
            ],
            'description' => [
                'ar' => 'وصف الفرصة',
                'en' => 'Opportunity description',
            ],
            'work_mode' => 'full_time',
            'capacity' => 3,
            'status' => 'draft',
            'version' => 1,
        ], $overrides));
    }

    public function test_draft_to_published_transition_succeeds(): void
    {
        [$user, $company] = $this->createCompanyUser('approved');
        $opportunity = $this->createOpportunity($company, $user, ['status' => 'draft', 'version' => 1]);

        $response = $this->actingAs($user)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/transition", [
                'to_status' => 'published',
                'version' => 1,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'published')
            ->assertJsonPath('data.version', 2);

        $opportunity->refresh();
        $this->assertSame('published', $opportunity->status);
        $this->assertSame(2, $opportunity->version);
        $this->assertNotNull($opportunity->published_at);
    }

    public function test_published_to_closed_transition_succeeds(): void
    {
        [$user, $company] = $this->createCompanyUser('approved');
        $opportunity = $this->createOpportunity($company, $user, [
            'status' => 'published',
            'published_at' => now()->subDay(),
            'version' => 2,
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/transition", [
                'to_status' => 'closed',
                'version' => 2,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'closed')
            ->assertJsonPath('data.version', 3);

        $opportunity->refresh();
        $this->assertSame('closed', $opportunity->status);
        $this->assertSame(3, $opportunity->version);
    }

    public function test_closed_to_archived_transition_succeeds(): void
    {
        [$user, $company] = $this->createCompanyUser('approved');
        $opportunity = $this->createOpportunity($company, $user, [
            'status' => 'closed',
            'version' => 3,
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/transition", [
                'to_status' => 'archived',
                'version' => 3,
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'archived')
            ->assertJsonPath('data.version', 4);

        $opportunity->refresh();
        $this->assertSame('archived', $opportunity->status);
        $this->assertSame(4, $opportunity->version);
    }

    public function test_invalid_transitions_are_rejected_with_422(): void
    {
        [$user, $company] = $this->createCompanyUser('approved');

        $invalidTransitions = [
            ['from' => 'draft', 'to' => 'closed'],
            ['from' => 'draft', 'to' => 'archived'],
            ['from' => 'published', 'to' => 'archived'],
            ['from' => 'closed', 'to' => 'published'],
            ['from' => 'archived', 'to' => 'published'],
            ['from' => 'archived', 'to' => 'closed'],
        ];

        foreach ($invalidTransitions as $transition) {
            $opportunity = $this->createOpportunity($company, $user, [
                'status' => $transition['from'],
                'version' => 1,
            ]);

            $response = $this->actingAs($user)
                ->postJson("/api/v1/opportunities/{$opportunity->id}/transition", [
                    'to_status' => $transition['to'],
                    'version' => 1,
                ]);

            $response->assertStatus(422)
                ->assertJsonPath('error_code', 'invalid_transition');

            $opportunity->refresh();
            $this->assertSame($transition['from'], $opportunity->status);
            $this->assertSame(1, $opportunity->version);
        }

        // Target status not in allowed enum (e.g. draft, completed) is rejected by form request
        $opportunity = $this->createOpportunity($company, $user, [
            'status' => 'closed',
            'version' => 1,
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/transition", [
                'to_status' => 'draft',
                'version' => 1,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['to_status']);
    }

    public function test_stale_version_on_transition_returns_409(): void
    {
        [$user, $company] = $this->createCompanyUser('approved');
        $opportunity = $this->createOpportunity($company, $user, [
            'status' => 'draft',
            'version' => 2,
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/transition", [
                'to_status' => 'published',
                'version' => 1, // Stale version
            ]);

        $response->assertStatus(409)
            ->assertJsonPath('error_code', 'version_mismatch');

        $opportunity->refresh();
        $this->assertSame('draft', $opportunity->status);
        $this->assertSame(2, $opportunity->version);
    }

    public function test_user_without_transition_permission_is_rejected_with_403(): void
    {
        [$user, $company] = $this->createCompanyUser('approved');
        $opportunity = $this->createOpportunity($company, $user, [
            'status' => 'closed',
            'version' => 1,
        ]);

        // Revoke opportunities.own.archive
        $archivePermId = DB::table('permissions')->where('name', 'opportunities.own.archive')->value('id');
        DB::table('role_permissions')
            ->where('role_id', $this->repRole->id)
            ->where('permission_id', $archivePermId)
            ->delete();

        $response = $this->actingAs($user)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/transition", [
                'to_status' => 'archived',
                'version' => 1,
            ]);

        $response->assertStatus(403);
        $this->assertSame('closed', $opportunity->fresh()->status);
    }

    public function test_unapproved_company_representative_cannot_transition_status(): void
    {
        [$user, $company] = $this->createCompanyUser('pending_verification');
        $opportunity = $this->createOpportunity($company, $user, [
            'status' => 'draft',
            'version' => 1,
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/transition", [
                'to_status' => 'published',
                'version' => 1,
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('error_code', 'company_not_approved');
    }

    public function test_cannot_transition_opportunity_belonging_to_another_company(): void
    {
        [$userA, $companyA] = $this->createCompanyUser('approved');
        [$userB, $companyB] = $this->createCompanyUser('approved');

        $opportunityA = $this->createOpportunity($companyA, $userA, [
            'status' => 'draft',
            'version' => 1,
        ]);

        $response = $this->actingAs($userB)
            ->postJson("/api/v1/opportunities/{$opportunityA->id}/transition", [
                'to_status' => 'published',
                'version' => 1,
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('error_code', 'unauthorized_company');
    }

    public function test_republishing_preserves_original_published_at(): void
    {
        [$user, $company] = $this->createCompanyUser('approved');
        $originalPublishedAt = now()->subDays(10)->startOfMinute();

        $opportunity = $this->createOpportunity($company, $user, [
            'status' => 'draft',
            'published_at' => $originalPublishedAt,
            'version' => 1,
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/transition", [
                'to_status' => 'published',
                'version' => 1,
            ]);

        $response->assertStatus(200);

        $opportunity->refresh();
        $this->assertSame(
            $originalPublishedAt->toDateTimeString(),
            $opportunity->published_at?->toDateTimeString()
        );
    }

    public function test_suspended_company_cannot_publish_opportunity(): void
    {
        [$user, $company] = $this->createCompanyUser('suspended');
        $opportunity = $this->createOpportunity($company, $user, [
            'status' => 'draft',
            'version' => 1,
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/transition", [
                'to_status' => 'published',
                'version' => 1,
            ]);

        $response->assertStatus(403);
        $this->assertSame('draft', $opportunity->fresh()->status);
    }

    public function test_suspended_company_can_close_opportunity(): void
    {
        [$user, $company] = $this->createCompanyUser('suspended');
        $opportunity = $this->createOpportunity($company, $user, [
            'status' => 'published',
            'version' => 1,
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/transition", [
                'to_status' => 'closed',
                'version' => 1,
            ]);

        $response->assertStatus(200);
        $this->assertSame('closed', $opportunity->fresh()->status);
    }
}
