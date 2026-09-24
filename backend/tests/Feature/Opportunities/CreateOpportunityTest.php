<?php

declare(strict_types=1);

namespace Tests\Feature\Opportunities;

use App\Models\AcademicSupervisorProfile;
use App\Models\Company;
use App\Models\CompanyRepresentative;
use App\Models\Department;
use App\Models\Major;
use App\Models\Opportunity;
use App\Models\OpportunityType;
use App\Models\Role;
use App\Models\Skill;
use App\Models\StudentProfile;
use App\Models\TrainingCycle;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\LookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CreateOpportunityTest extends TestCase
{
    use RefreshDatabase;

    private Role $repRole;

    private Role $studentRole;

    private Role $supervisorRole;

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
        $this->studentRole = Role::where('name', 'student')->firstOrFail();
        $this->supervisorRole = Role::where('name', 'academic_supervisor')->firstOrFail();

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

    private function validPayload(): array
    {
        return [
            'title_ar' => 'مطور برمجيات متدرب',
            'title_en' => 'Software Developer Intern',
            'department_ar' => 'قسم تقنية المعلومات',
            'department_en' => 'IT Department',
            'description_ar' => 'فرصة تدريب تعاوني في قسم تطوير البرمجيات.',
            'description_en' => 'Cooperative training opportunity in software development.',
            'opportunity_type_id' => $this->oppType->id,
            'training_cycle_id' => $this->trainingCycle->id,
            'work_mode' => 'full_time',
            'location' => 'Riyadh',
            'duration' => '6 months',
            'capacity' => 3,
            'salary' => 3000.00,
            'start_date' => '2026-10-01',
            'end_date' => '2027-04-01',
            'application_deadline' => now()->addMonth()->toDateString(),
            'major_ids' => [$this->major1->id, $this->major2->id],
            'skill_ids' => [$this->skill1->id, $this->skill2->id],
            'requirements_ar' => [
                'طالب في السنة الأخيرة',
                'معدل تراكمي 3.0 فأعلى',
            ],
            'requirements_en' => [
                'Final year student',
                'GPA 3.0 or higher',
            ],
            'benefits_ar' => [
                'مكافأة شهرية',
                'شهادة خبرة',
            ],
            'benefits_en' => [
                'Monthly stipend',
                'Certificate of completion',
            ],
        ];
    }

    public function test_approved_company_representative_creates_opportunity_successfully(): void
    {
        [$user, $company] = $this->createCompanyUser('approved');

        $response = $this->actingAs($user)
            ->postJson('/api/v1/opportunities', $this->validPayload());

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.version', 1)
            ->assertJsonPath('data.created_by', $user->id)
            ->assertJsonPath('data.company_id', $company->id)
            ->assertJsonPath('data.title.ar', 'مطور برمجيات متدرب')
            ->assertJsonPath('data.title.en', 'Software Developer Intern')
            ->assertJsonPath('data.capacity', 3)
            ->assertJsonPath('data.salary', 3000)
            ->assertJsonCount(2, 'data.majors')
            ->assertJsonCount(2, 'data.skills')
            ->assertJsonCount(2, 'data.requirements')
            ->assertJsonCount(2, 'data.benefits');

        $opportunity = Opportunity::first();
        $this->assertNotNull($opportunity);
        $this->assertSame('draft', $opportunity->status);
        $this->assertSame(1, $opportunity->version);
        $this->assertSame($user->id, $opportunity->created_by);
        $this->assertSame($company->id, $opportunity->company_id);
        $this->assertEquals(['ar' => 'مطور برمجيات متدرب', 'en' => 'Software Developer Intern'], $opportunity->getTranslations('title'));

        // Check majors & skills
        $this->assertCount(2, $opportunity->majors);
        $this->assertTrue($opportunity->majors->contains($this->major1));
        $this->assertTrue($opportunity->majors->contains($this->major2));

        $this->assertCount(2, $opportunity->skills);
        $this->assertTrue($opportunity->skills->contains($this->skill1));
        $this->assertTrue($opportunity->skills->contains($this->skill2));

        // Check requirements sort_order and bilingual text
        $requirements = $opportunity->requirements()->orderBy('sort_order')->get();
        $this->assertCount(2, $requirements);
        $this->assertSame(0, $requirements[0]->sort_order);
        $this->assertSame('طالب في السنة الأخيرة', $requirements[0]->getTranslation('requirement_text', 'ar'));
        $this->assertSame('Final year student', $requirements[0]->getTranslation('requirement_text', 'en'));
        $this->assertSame(1, $requirements[1]->sort_order);

        // Check benefits sort_order and bilingual text
        $benefits = $opportunity->benefits()->orderBy('sort_order')->get();
        $this->assertCount(2, $benefits);
        $this->assertSame(0, $benefits[0]->sort_order);
        $this->assertSame('مكافأة شهرية', $benefits[0]->getTranslation('benefit_text', 'ar'));
        $this->assertSame('Monthly stipend', $benefits[0]->getTranslation('benefit_text', 'en'));
        $this->assertSame(1, $benefits[1]->sort_order);
    }

    #[DataProvider('nonApprovedCompanyStatuses')]
    public function test_representative_of_non_approved_company_is_rejected_with_403(string $status): void
    {
        [$user] = $this->createCompanyUser($status);

        $response = $this->actingAs($user)
            ->postJson('/api/v1/opportunities', $this->validPayload());

        $response->assertStatus(403)
            ->assertJsonPath('error_code', 'company_not_approved');

        $this->assertSame(0, Opportunity::count());
    }

    public static function nonApprovedCompanyStatuses(): array
    {
        return [
            ['pending_verification'],
            ['under_review'],
            ['changes_requested'],
            ['suspended'],
            ['rejected'],
        ];
    }

    public function test_mismatched_requirements_count_returns_422(): void
    {
        [$user] = $this->createCompanyUser('approved');

        $payload = $this->validPayload();
        $payload['requirements_ar'] = ['متطلب 1', 'متطلب 2'];
        $payload['requirements_en'] = ['Requirement 1']; // 1 item instead of 2

        $response = $this->actingAs($user)
            ->postJson('/api/v1/opportunities', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['requirements_en']);

        $this->assertSame(0, Opportunity::count());
    }

    public function test_mismatched_benefits_count_returns_422(): void
    {
        [$user] = $this->createCompanyUser('approved');

        $payload = $this->validPayload();
        $payload['benefits_ar'] = ['ميزة 1'];
        $payload['benefits_en'] = ['Benefit 1', 'Benefit 2']; // 2 items instead of 1

        $response = $this->actingAs($user)
            ->postJson('/api/v1/opportunities', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['benefits_en']);

        $this->assertSame(0, Opportunity::count());
    }

    public function test_end_date_before_start_date_returns_422(): void
    {
        [$user] = $this->createCompanyUser('approved');

        $payload = $this->validPayload();
        $payload['start_date'] = '2026-10-01';
        $payload['end_date'] = '2026-09-01'; // Before start_date

        $response = $this->actingAs($user)
            ->postJson('/api/v1/opportunities', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['end_date']);

        $this->assertSame(0, Opportunity::count());
    }

    public function test_student_cannot_create_opportunity(): void
    {
        $studentUser = User::factory()->create([
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        StudentProfile::create([
            'user_id' => $studentUser->id,
            'student_number' => 'STU123456',
            'major_id' => $this->major1->id,
            'university_name' => 'Saba Region University',
            'level_year' => 4,
            'gpa' => 3.50,
        ]);

        UserRole::create([
            'user_id' => $studentUser->id,
            'role_id' => $this->studentRole->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        $response = $this->actingAs($studentUser)
            ->postJson('/api/v1/opportunities', $this->validPayload());

        $response->assertStatus(403);
        $this->assertSame(0, Opportunity::count());
    }

    public function test_academic_supervisor_cannot_create_opportunity(): void
    {
        $supervisorUser = User::factory()->create([
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        AcademicSupervisorProfile::create([
            'user_id' => $supervisorUser->id,
            'department_id' => $this->major1->department_id,
        ]);

        UserRole::create([
            'user_id' => $supervisorUser->id,
            'role_id' => $this->supervisorRole->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        $response = $this->actingAs($supervisorUser)
            ->postJson('/api/v1/opportunities', $this->validPayload());

        $response->assertStatus(403);
        $this->assertSame(0, Opportunity::count());
    }

    public function test_unauthenticated_request_returns_401(): void
    {
        $response = $this->postJson('/api/v1/opportunities', $this->validPayload());

        $response->assertStatus(401);
        $this->assertSame(0, Opportunity::count());
    }

    public function test_suspended_company_cannot_create_opportunity(): void
    {
        [$repUser, $company] = $this->createCompanyUser();
        $company->update(['status' => 'suspended']);

        $response = $this->actingAs($repUser)
            ->postJson('/api/v1/opportunities', $this->validPayload());

        $response->assertStatus(403);
        $this->assertSame(0, Opportunity::count());
    }
}