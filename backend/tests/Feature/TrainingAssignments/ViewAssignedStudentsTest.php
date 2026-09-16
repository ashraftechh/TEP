<?php

declare(strict_types=1);

namespace Tests\Feature\TrainingAssignments;

use App\Models\Application;
use App\Models\Company;
use App\Models\CompanyRepresentative;
use App\Models\Department;
use App\Models\File;
use App\Models\Major;
use App\Models\Opportunity;
use App\Models\OpportunityType;
use App\Models\Report;
use App\Models\Role;
use App\Models\StudentProfile;
use App\Models\TrainingAssignment;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\LookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * TEP-667 — Tests: View Assigned Students (backend portion, covers TEP-665).
 *
 * Written against the real training_assignments schema (see
 * CreateTrainingAssignmentTest for the same notes on defaults/nullability)
 * plus the Sprint 4 `reports` table for the reports_submitted_count
 * aggregation.
 */
class ViewAssignedStudentsTest extends TestCase
{
    use RefreshDatabase;

    private Role $studentRole;

    private Role $repRole;

    private Role $academicSupervisorRole;

    private Role $coordinatorRole;

    private Major $major;

    private OpportunityType $oppType;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(PermissionSeeder::class);
        $this->seed(LookupSeeder::class);

        $this->studentRole = Role::where('name', 'student')->firstOrFail();
        $this->repRole = Role::where('name', 'company_representative')->firstOrFail();
        $this->academicSupervisorRole = Role::where('name', 'academic_supervisor')->firstOrFail();
        $this->coordinatorRole = Role::where('name', 'training_coordinator')->firstOrFail();

        $this->oppType = OpportunityType::firstOrCreate(
            ['code' => 'cooperative'],
            ['name' => ['en' => 'Cooperative', 'ar' => 'تعاوني'], 'is_active' => true]
        );

        $collegeId = DB::table('colleges')->insertGetId([
            'name' => json_encode(['en' => 'Engineering', 'ar' => 'هندسة']),
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

        $this->major = Major::create([
            'department_id' => $department->id,
            'name' => ['en' => 'Software Engineering', 'ar' => 'هندسة البرمجيات'],
            'code' => 'SE',
            'is_active' => true,
        ]);
    }

    // ── Helpers (mirrors CreateTrainingAssignmentTest) ──────────────────────

    protected function createCoordinatorUser(): User
    {
        $user = User::factory()->create(['status' => 'active', 'email_verified_at' => now()]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $this->coordinatorRole->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        return $user;
    }

    protected function createRepUser(?Company $company = null): array
    {
        $company ??= Company::factory()->approved()->create();

        $user = User::factory()->create([
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        CompanyRepresentative::create([
            'user_id' => $user->id,
            'company_id' => $company->id,
            'is_primary' => true,
        ]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $this->repRole->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        return [$user, $company];
    }

    protected function createAcademicSupervisorUser(): User
    {
        $user = User::factory()->create(['status' => 'active', 'email_verified_at' => now()]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $this->academicSupervisorRole->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        return $user;
    }

    protected function createStudentUser(): array
    {
        $user = User::factory()->create([
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $profile = StudentProfile::create([
            'user_id' => $user->id,
            'student_number' => fake()->unique()->numerify('STU######'),
            'major_id' => $this->major->id,
            'university_name' => 'Saba Region University',
            'level_year' => 4,
            'gpa' => 3.8,
        ]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $this->studentRole->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        return [$user, $profile];
    }

    protected function createCvFile(User $uploader): File
    {
        return File::create([
            'uploader_id' => $uploader->id,
            'fileable_type' => User::class,
            'fileable_id' => $uploader->id,
            'purpose' => 'cv',
            'disk' => 'public',
            'path' => 'cvs/sample_cv_'.fake()->uuid().'.pdf',
            'original_name' => 'my_resume.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 1024 * 300,
            'scan_status' => 'clean',
            'scanned_at' => now(),
        ]);
    }

    protected function createOpportunity(Company $company, array $overrides = []): Opportunity
    {
        $attrs = array_merge([
            'company_id' => $company->id,
            'opportunity_type_id' => $this->oppType->id,
            'training_cycle_id' => null,
            'created_by' => null,
            'title' => ['en' => 'Backend Developer Trainee', 'ar' => 'متدرب مطور خلفية'],
            'department' => ['en' => 'Technology', 'ar' => 'التقنية'],
            'description' => ['en' => 'Hands-on Laravel internship', 'ar' => 'تدريب عملي على لارافيل'],
            'work_mode' => 'full_time',
            'location' => "Sana'a",
            'duration' => '3 months',
            'capacity' => 5,
            'accepted_count' => 0,
            'status' => 'published',
            'version' => 1,
            'application_deadline' => null,
        ], $overrides);

        $id = DB::table('opportunities')->insertGetId(array_merge($attrs, [
            'title' => json_encode($attrs['title']),
            'department' => json_encode($attrs['department']),
            'description' => json_encode($attrs['description']),
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        return Opportunity::findOrFail($id);
    }

    protected function makeApplication(StudentProfile $profile, Opportunity $opportunity, string $status = 'accepted'): Application
    {
        $cvFile = $this->createCvFile(User::find($profile->user_id));

        return Application::create([
            'opportunity_id' => $opportunity->id,
            'student_profile_id' => $profile->id,
            'cv_file_id' => $cvFile->id,
            'cover_note' => null,
            'status' => $status,
            'version' => 0,
        ]);
    }

    /**
     * Create a training_assignments row directly (bypassing the TEP-661
     * create endpoint, which is covered by its own test suite) so each test
     * here can set up exactly the visibility scenario it needs.
     */
    protected function makeAssignment(
        Application $application,
        StudentProfile $studentProfile,
        Company $company,
        Opportunity $opportunity,
        ?User $academicSupervisor = null,
        array $overrides = [],
    ): TrainingAssignment {
        return TrainingAssignment::create(array_merge([
            'application_id' => $application->id,
            'student_profile_id' => $studentProfile->id,
            'company_id' => $company->id,
            'opportunity_id' => $opportunity->id,
            'academic_supervisor_id' => $academicSupervisor?->id,
            'field_supervisor_id' => null,
            'training_coordinator_id' => null,
            'status' => 'active',
            'start_date' => now()->subMonth()->toDateString(),
            'end_date' => now()->addMonths(2)->toDateString(),
            'progress_percentage' => 40,
            'required_reports_count' => 4,
            'version' => 1,
        ], $overrides));
    }

    /** Build one full (student, application, assignment) scenario for a given company. */
    protected function makeScenario(Company $company, ?User $academicSupervisor = null): array
    {
        $opportunity = $this->createOpportunity($company);
        [$studentUser, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity);
        $assignment = $this->makeAssignment($application, $studentProfile, $company, $opportunity, $academicSupervisor);

        return compact('opportunity', 'studentUser', 'studentProfile', 'application', 'assignment');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/v1/training-assignments — role-scoped visibility
    // ─────────────────────────────────────────────────────────────────────────

    public function test_company_representative_sees_only_own_company_assignments(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $mine = $this->makeScenario($company);

        [, $otherCompany] = $this->createRepUser();
        $this->makeScenario($otherCompany);

        $response = $this->actingAs($repUser)->getJson('/api/v1/training-assignments');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertSame([$mine['assignment']->id], $ids);
    }

    public function test_academic_supervisor_sees_only_their_own_assignments(): void
    {
        $supervisor = $this->createAcademicSupervisorUser();
        $otherSupervisor = $this->createAcademicSupervisorUser();

        [, $company] = $this->createRepUser();
        $mine = $this->makeScenario($company, $supervisor);
        $this->makeScenario($company, $otherSupervisor);

        $response = $this->actingAs($supervisor)->getJson('/api/v1/training-assignments');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertSame([$mine['assignment']->id], $ids);
    }

    public function test_student_sees_only_their_own_single_assignment(): void
    {
        [, $company] = $this->createRepUser();
        $mine = $this->makeScenario($company);
        $this->makeScenario($company); // another student's assignment

        $response = $this->actingAs($mine['studentUser'])->getJson('/api/v1/training-assignments');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertSame([$mine['assignment']->id], $ids);
    }

    public function test_coordinator_sees_every_assignment(): void
    {
        $coordinator = $this->createCoordinatorUser();

        [, $companyA] = $this->createRepUser();
        [, $companyB] = $this->createRepUser();
        $a = $this->makeScenario($companyA);
        $b = $this->makeScenario($companyB);

        $response = $this->actingAs($coordinator)->getJson('/api/v1/training-assignments');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertEqualsCanonicalizing(
            [$a['assignment']->id, $b['assignment']->id],
            $ids
        );
    }

    public function test_guest_cannot_list_training_assignments(): void
    {
        $response = $this->getJson('/api/v1/training-assignments');

        $response->assertStatus(401);
    }

    public function test_status_filter_narrows_results(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [, $company] = $this->createRepUser();
        $active = $this->makeScenario($company);
        $completed = $this->makeScenario($company);
        $completed['assignment']->update(['status' => 'completed']);

        $response = $this->actingAs($coordinator)
            ->getJson('/api/v1/training-assignments?status=completed');

        $response->assertStatus(200);
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertSame([$completed['assignment']->id], $ids);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // reports_submitted_count / total_reports — correct + no N+1
    // ─────────────────────────────────────────────────────────────────────────

    public function test_reports_submitted_count_and_total_reports_are_correct(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [, $company] = $this->createRepUser();
        $scenario = $this->makeScenario($company);
        $assignment = $scenario['assignment'];
        $assignment->update(['required_reports_count' => 4]);

        $reportTypeId = DB::table('report_types')->insertGetId([
            'code' => 'weekly',
            'name' => json_encode(['en' => 'Weekly Report', 'ar' => 'تقرير أسبوعي']),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // 2 submitted-or-further reports, 1 still a draft — expect count = 2.
        Report::create([
            'training_assignment_id' => $assignment->id,
            'title' => 'Week 1',
            'report_type_id' => $reportTypeId,
            'status' => 'submitted',
            'version' => 1,
            'submitted_at' => now(),
        ]);
        Report::create([
            'training_assignment_id' => $assignment->id,
            'title' => 'Week 2',
            'report_type_id' => $reportTypeId,
            'status' => 'approved',
            'version' => 1,
            'submitted_at' => now(),
        ]);
        Report::create([
            'training_assignment_id' => $assignment->id,
            'title' => 'Week 3 (draft)',
            'report_type_id' => $reportTypeId,
            'status' => 'draft',
            'version' => 1,
            'submitted_at' => now(),
        ]);

        $response = $this->actingAs($coordinator)->getJson('/api/v1/training-assignments');

        $response->assertStatus(200)
            ->assertJsonPath('data.0.reports_submitted_count', 2)
            ->assertJsonPath('data.0.total_reports', 4);
    }

    public function test_reports_submitted_count_does_not_cause_n_plus_1(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [, $company] = $this->createRepUser();

        // Warm up authentication/roles cache for the coordinator so one-time
        // auth queries do not skew the baseline count.
        $this->actingAs($coordinator)->getJson('/api/v1/training-assignments')->assertStatus(200);

        // Baseline: 1 assignment.
        $this->makeScenario($company);

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->actingAs($coordinator)->getJson('/api/v1/training-assignments')->assertStatus(200);
        $queryCountForOne = count(DB::getQueryLog());
        DB::disableQueryLog();

        // 5 assignments now.
        for ($i = 0; $i < 4; $i++) {
            $this->makeScenario($company);
        }

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->actingAs($coordinator)->getJson('/api/v1/training-assignments')->assertStatus(200);
        $queryCountForFive = count(DB::getQueryLog());
        DB::disableQueryLog();

        // Query count must stay flat as the result count grows — no
        // per-row report/attendance queries.
        $this->assertSame($queryCountForOne, $queryCountForFive);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/v1/my/training-assignment — student single-record fetch
    // ─────────────────────────────────────────────────────────────────────────

    public function test_student_fetches_their_own_training_assignment(): void
    {
        [, $company] = $this->createRepUser();
        $scenario = $this->makeScenario($company);

        $response = $this->actingAs($scenario['studentUser'])
            ->getJson('/api/v1/my/training-assignment');

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $scenario['assignment']->id)
            ->assertJsonPath('data.student_profile.id', $scenario['studentProfile']->id);
    }

    public function test_student_without_assignment_gets_404(): void
    {
        [$studentUser] = $this->createStudentUser();

        $response = $this->actingAs($studentUser)->getJson('/api/v1/my/training-assignment');

        $response->assertStatus(404)
            ->assertJsonPath('error_code', 'no_active_assignment');
    }

    public function test_academic_supervisor_cannot_use_the_student_only_endpoint(): void
    {
        $supervisor = $this->createAcademicSupervisorUser();

        $response = $this->actingAs($supervisor)->getJson('/api/v1/my/training-assignment');

        $response->assertStatus(403);
    }

    public function test_guest_cannot_fetch_my_training_assignment(): void
    {
        $response = $this->getJson('/api/v1/my/training-assignment');

        $response->assertStatus(401);
    }
}
