<?php

declare(strict_types=1);

namespace Tests\Feature\Opportunities;

use App\Models\Company;
use App\Models\CompanyRepresentative;
use App\Models\Department;
use App\Models\Major;
use App\Models\Opportunity;
use App\Models\OpportunityType;
use App\Models\Role;
use App\Models\Skill;
use App\Models\TrainingCycle;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\LookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class EditOpportunityTest extends TestCase
{
    use RefreshDatabase;

    private Role $repRole;

    private OpportunityType $oppType;

    private Major $major1;

    private Major $major2;

    private Skill $skill1;

    private Skill $skill2;

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

        $collegeId = DB::table('colleges')->insertGetId([
            'name' => json_encode(['en' => 'College of Engineering', 'ar' => 'كلية الهندسة']),
            'code' => 'ENG',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $department = Department::create([
            'college_id' => $collegeId,
            'name' => ['en' => 'Computer Science', 'ar' => 'علوم الحاسب'],
            'code' => 'CS',
            'is_active' => true,
        ]);

        $this->major1 = Major::create([
            'department_id' => $department->id,
            'name' => ['en' => 'Software Engineering', 'ar' => 'هندسة البرمجيات'],
            'code' => 'SE',
            'is_active' => true,
        ]);

        $this->major2 = Major::create([
            'department_id' => $department->id,
            'name' => ['en' => 'Information Systems', 'ar' => 'نظم المعلومات'],
            'code' => 'IS',
            'is_active' => true,
        ]);

        $this->skill1 = Skill::create([
            'name' => ['en' => 'PHP', 'ar' => 'بي إتش بي'],
            'is_active' => true,
        ]);

        $this->skill2 = Skill::create([
            'name' => ['en' => 'React', 'ar' => 'رياكت'],
            'is_active' => true,
        ]);

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
                'ar' => 'مطور برمجيات متدرب',
                'en' => 'Software Developer Intern',
            ],
            'department' => [
                'ar' => 'قسم تقنية المعلومات',
                'en' => 'IT Department',
            ],
            'description' => [
                'ar' => 'فرصة تدريب تعاوني في تطوير البرمجيات.',
                'en' => 'Cooperative training opportunity in software development.',
            ],
            'work_mode' => 'full_time',
            'location' => 'Riyadh',
            'duration' => '6 months',
            'capacity' => 3,
            'accepted_count' => 0,
            'salary' => 3000.00,
            'start_date' => '2026-10-01',
            'end_date' => '2027-04-01',
            'application_deadline' => '2026-09-20',
            'status' => 'draft',
            'version' => 1,
        ], $overrides));
    }

    public function test_approved_company_representative_updates_draft_opportunity_successfully(): void
    {
        [$user, $company] = $this->createCompanyUser('approved');
        $opportunity = $this->createOpportunity($company, $user);

        $payload = [
            'version' => 1,
            'title_ar' => 'مهندس برمجيات متدرب (محدث)',
            'title_en' => 'Software Engineer Intern (Updated)',
            'capacity' => 5,
            'salary' => 3500.00,
            'work_mode' => 'hybrid',
        ];

        $response = $this->actingAs($user)
            ->patchJson("/api/v1/opportunities/{$opportunity->id}", $payload);

        $response->assertStatus(200)
            ->assertJsonPath('data.title.ar', 'مهندس برمجيات متدرب (محدث)')
            ->assertJsonPath('data.title.en', 'Software Engineer Intern (Updated)')
            ->assertJsonPath('data.capacity', 5)
            ->assertJsonPath('data.salary', 3500)
            ->assertJsonPath('data.work_mode', 'hybrid')
            ->assertJsonPath('data.version', 2);

        $opportunity->refresh();
        $this->assertSame(2, $opportunity->version);
        $this->assertSame('مهندس برمجيات متدرب (محدث)', $opportunity->getTranslation('title', 'ar'));
        $this->assertSame(5, $opportunity->capacity);
    }

    public function test_stale_version_returns_409_conflict(): void
    {
        [$user, $company] = $this->createCompanyUser('approved');
        $opportunity = $this->createOpportunity($company, $user, ['version' => 3]);

        $payload = [
            'version' => 2, // Stale version
            'title_ar' => 'عنوان محدث',
            'title_en' => 'Updated Title',
        ];

        $response = $this->actingAs($user)
            ->patchJson("/api/v1/opportunities/{$opportunity->id}", $payload);

        $response->assertStatus(409)
            ->assertJsonPath('error_code', 'version_mismatch');

        $opportunity->refresh();
        $this->assertSame(3, $opportunity->version);
        $this->assertSame('مطور برمجيات متدرب', $opportunity->getTranslation('title', 'ar'));
    }

    public function test_published_opportunity_capacity_cannot_be_reduced_below_accepted_count(): void
    {
        [$user, $company] = $this->createCompanyUser('approved');
        $opportunity = $this->createOpportunity($company, $user, [
            'status' => 'published',
            'capacity' => 5,
            'accepted_count' => 3,
            'version' => 1,
        ]);

        $payload = [
            'version' => 1,
            'capacity' => 2, // Below accepted_count (3)
        ];

        $response = $this->actingAs($user)
            ->patchJson("/api/v1/opportunities/{$opportunity->id}", $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['capacity']);

        $opportunity->refresh();
        $this->assertSame(5, $opportunity->capacity);
        $this->assertSame(1, $opportunity->version);
    }

    public function test_closed_completed_or_archived_opportunity_cannot_be_edited(): void
    {
        [$user, $company] = $this->createCompanyUser('approved');

        foreach (['closed', 'completed', 'archived'] as $terminalStatus) {
            $opportunity = $this->createOpportunity($company, $user, [
                'status' => $terminalStatus,
                'version' => 1,
            ]);

            $response = $this->actingAs($user)
                ->patchJson("/api/v1/opportunities/{$opportunity->id}", [
                    'version' => 1,
                    'title_ar' => 'تعديل ممنوع',
                    'title_en' => 'Forbidden Edit',
                ]);

            $response->assertStatus(403)
                ->assertJsonPath('error_code', 'cannot_edit_closed');
        }
    }

    public function test_sync_majors_and_skills_replaces_entire_set(): void
    {
        [$user, $company] = $this->createCompanyUser('approved');
        $opportunity = $this->createOpportunity($company, $user);

        $opportunity->majors()->sync([$this->major1->id, $this->major2->id]);
        $opportunity->skills()->sync([$this->skill1->id, $this->skill2->id]);

        $this->assertCount(2, $opportunity->fresh()->majors);
        $this->assertCount(2, $opportunity->fresh()->skills);

        // Update with only major1 and skill1
        $payload = [
            'version' => 1,
            'major_ids' => [$this->major1->id],
            'skill_ids' => [$this->skill1->id],
        ];

        $response = $this->actingAs($user)
            ->patchJson("/api/v1/opportunities/{$opportunity->id}", $payload);

        $response->assertStatus(200);

        $opportunity->refresh();
        $this->assertCount(1, $opportunity->majors);
        $this->assertTrue($opportunity->majors->contains($this->major1));
        $this->assertFalse($opportunity->majors->contains($this->major2));

        $this->assertCount(1, $opportunity->skills);
        $this->assertTrue($opportunity->skills->contains($this->skill1));
        $this->assertFalse($opportunity->skills->contains($this->skill2));
    }

    public function test_requirements_and_benefits_are_replaced_with_sort_order(): void
    {
        [$user, $company] = $this->createCompanyUser('approved');
        $opportunity = $this->createOpportunity($company, $user);

        $opportunity->requirements()->create([
            'requirement_text' => ['ar' => 'متطلب قديم', 'en' => 'Old requirement'],
            'sort_order' => 0,
        ]);

        $payload = [
            'version' => 1,
            'requirements_ar' => ['متطلب جديد 1', 'متطلب جديد 2'],
            'requirements_en' => ['New requirement 1', 'New requirement 2'],
            'benefits_ar' => ['ميزة جديدة'],
            'benefits_en' => ['New benefit'],
        ];

        $response = $this->actingAs($user)
            ->patchJson("/api/v1/opportunities/{$opportunity->id}", $payload);

        $response->assertStatus(200);

        $opportunity->refresh();
        $requirements = $opportunity->requirements()->orderBy('sort_order')->get();
        $this->assertCount(2, $requirements);
        $this->assertSame('متطلب جديد 1', $requirements[0]->getTranslation('requirement_text', 'ar'));
        $this->assertSame('New requirement 1', $requirements[0]->getTranslation('requirement_text', 'en'));
        $this->assertSame(0, $requirements[0]->sort_order);
        $this->assertSame(1, $requirements[1]->sort_order);

        $benefits = $opportunity->benefits()->orderBy('sort_order')->get();
        $this->assertCount(1, $benefits);
        $this->assertSame('ميزة جديدة', $benefits[0]->getTranslation('benefit_text', 'ar'));
    }

    public function test_unapproved_company_representative_cannot_edit_opportunity(): void
    {
        [$user, $company] = $this->createCompanyUser('pending_verification');
        $opportunity = $this->createOpportunity($company, $user);

        $response = $this->actingAs($user)
            ->patchJson("/api/v1/opportunities/{$opportunity->id}", [
                'version' => 1,
                'title_ar' => 'تعديل',
                'title_en' => 'Edit',
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('error_code', 'company_not_approved');
    }

    public function test_cannot_edit_opportunity_belonging_to_another_company(): void
    {
        [$userA, $companyA] = $this->createCompanyUser('approved');
        [$userB, $companyB] = $this->createCompanyUser('approved');

        $opportunityA = $this->createOpportunity($companyA, $userA);

        $response = $this->actingAs($userB)
            ->patchJson("/api/v1/opportunities/{$opportunityA->id}", [
                'version' => 1,
                'title_ar' => 'محاولة تعديل',
                'title_en' => 'Edit Attempt',
            ]);

        $response->assertStatus(403)
            ->assertJsonPath('error_code', 'unauthorized_company');
    }

    public function test_suspended_company_representative_cannot_edit_opportunity(): void
    {
        [$user, $company] = $this->createCompanyUser('suspended');
        $opportunity = $this->createOpportunity($company, $user);

        $response = $this->actingAs($user)
            ->patchJson("/api/v1/opportunities/{$opportunity->id}", [
                'version' => 1,
                'title_ar' => 'تعديل',
                'title_en' => 'Edit',
            ]);

        $response->assertStatus(403);
    }
}
