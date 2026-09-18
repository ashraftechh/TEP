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
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * TEP-663 — Tests: Create Training Assignment (backend portion, covers
 * TEP-661).
 *
 * Written against the project's REAL training_assignments migration
 * (2025_01_01_000022_create_training_assignments_table.php), which:
 *  - requires `company_id` and `opportunity_id` (NOT NULL, derived
 *    server-side from the application's opportunity, never client input)
 *  - makes `academic_supervisor_id`, `field_supervisor_id`, `start_date`,
 *    `end_date` and `required_reports_count` all nullable/optional
 *  - defaults a new assignment's `status` to `active` immediately (as of
 *    the 2026-09-10 product decision — there is no `pending_assignment`
 *    holding state anymore)
 *  - defaults `version` to 1, not 0
 */
class CreateTrainingAssignmentTest extends TestCase
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

    // ── Helpers ───────────────────────────────────────────────────────────────

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

    protected function makeApplication(StudentProfile $profile, Opportunity $opportunity, string $status = 'submitted'): Application
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

    /** Build a full valid request payload for a given accepted application. */
    protected function validPayload(Application $application, User $academicSupervisor, User $fieldSupervisor, array $overrides = []): array
    {
        return array_merge([
            'application_id' => $application->id,
            'academic_supervisor_id' => $academicSupervisor->id,
            'field_supervisor_id' => $fieldSupervisor->id,
            'start_date' => now()->addDay()->toDateString(),
            'end_date' => now()->addMonths(3)->toDateString(),
            'required_reports_count' => 4,
        ], $overrides);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Happy path — full payload
    // ─────────────────────────────────────────────────────────────────────────

    public function test_coordinator_creates_assignment_from_accepted_application(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'accepted');
        $academicSupervisor = $this->createAcademicSupervisorUser();

        $payload = $this->validPayload($application, $academicSupervisor, $repUser);

        $response = $this->actingAs($coordinator)
            ->postJson('/api/v1/training-assignments', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.progress_percentage', 0)
            ->assertJsonPath('data.application_id', $application->id)
            ->assertJsonPath('data.company_id', $company->id)
            ->assertJsonPath('data.opportunity_id', $opportunity->id)
            ->assertJsonPath('data.academic_supervisor_id', $academicSupervisor->id)
            ->assertJsonPath('data.field_supervisor_id', $repUser->id)
            ->assertJsonPath('data.training_coordinator_id', $coordinator->id)
            ->assertJsonPath('data.required_reports_count', 4)
            ->assertJsonPath('data.version', 1);

        $this->assertDatabaseHas('training_assignments', [
            'application_id' => $application->id,
            'student_profile_id' => $studentProfile->id,
            'company_id' => $company->id,
            'opportunity_id' => $opportunity->id,
            'status' => 'active',
            'progress_percentage' => 0,
            'version' => 1,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Happy path — minimal payload (only application_id; every supervisor/
    // date/report-count field is nullable per the real migration)
    // ─────────────────────────────────────────────────────────────────────────

    public function test_coordinator_creates_assignment_with_only_application_id(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'accepted');

        $response = $this->actingAs($coordinator)
            ->postJson('/api/v1/training-assignments', [
                'application_id' => $application->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.company_id', $company->id)
            ->assertJsonPath('data.opportunity_id', $opportunity->id)
            ->assertJsonPath('data.academic_supervisor_id', null)
            ->assertJsonPath('data.field_supervisor_id', null)
            ->assertJsonPath('data.start_date', null)
            ->assertJsonPath('data.end_date', null)
            ->assertJsonPath('data.required_reports_count', null)
            ->assertJsonPath('data.training_coordinator_id', $coordinator->id)
            ->assertJsonPath('data.version', 1);

        $this->assertDatabaseHas('training_assignments', [
            'application_id' => $application->id,
            'company_id' => $company->id,
            'opportunity_id' => $opportunity->id,
            'academic_supervisor_id' => null,
            'field_supervisor_id' => null,
            'status' => 'active',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Non-accepted statuses → 422
    // ─────────────────────────────────────────────────────────────────────────

    public static function nonAcceptedStatusProvider(): array
    {
        return [
            'submitted' => ['submitted'],
            'under_review' => ['under_review'],
            'interview_scheduled' => ['interview_scheduled'],
            'rejected' => ['rejected'],
            'withdrawn' => ['withdrawn'],
        ];
    }

    #[DataProvider('nonAcceptedStatusProvider')]
    public function test_create_from_non_accepted_application_returns_422(string $status): void
    {
        $coordinator = $this->createCoordinatorUser();
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, $status);
        $academicSupervisor = $this->createAcademicSupervisorUser();

        $payload = $this->validPayload($application, $academicSupervisor, $repUser);

        $response = $this->actingAs($coordinator)
            ->postJson('/api/v1/training-assignments', $payload);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'cannot_create_assignment');

        $this->assertDatabaseMissing('training_assignments', ['application_id' => $application->id]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Duplicate assignment → 409
    // ─────────────────────────────────────────────────────────────────────────

    public function test_duplicate_assignment_for_same_application_returns_409(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'accepted');
        $academicSupervisor = $this->createAcademicSupervisorUser();

        $payload = $this->validPayload($application, $academicSupervisor, $repUser);

        $first = $this->actingAs($coordinator)->postJson('/api/v1/training-assignments', $payload);
        $first->assertStatus(201);

        $second = $this->actingAs($coordinator)->postJson('/api/v1/training-assignments', $payload);
        $second->assertStatus(409)
            ->assertJsonPath('error_code', 'training_assignment_already_exists');

        $this->assertSame(1, TrainingAssignment::where('application_id', $application->id)->count());
    }

    public function test_assigning_student_with_existing_active_assignment_returns_409(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [$repUser1, $company1] = $this->createRepUser();
        [$repUser2, $company2] = $this->createRepUser();
        $opportunity1 = $this->createOpportunity($company1);
        $opportunity2 = $this->createOpportunity($company2);
        [, $studentProfile] = $this->createStudentUser();
        $application1 = $this->makeApplication($studentProfile, $opportunity1, 'accepted');
        $application2 = $this->makeApplication($studentProfile, $opportunity2, 'accepted');
        $academicSupervisor = $this->createAcademicSupervisorUser();

        $payload1 = $this->validPayload($application1, $academicSupervisor, $repUser1);
        $payload2 = $this->validPayload($application2, $academicSupervisor, $repUser2);

        $first = $this->actingAs($coordinator)->postJson('/api/v1/training-assignments', $payload1);
        $first->assertStatus(201);

        // Attempt to assign the same student to another opportunity
        $second = $this->actingAs($coordinator)->postJson('/api/v1/training-assignments', $payload2);
        $second->assertStatus(409)
            ->assertJsonPath('error_code', 'student_already_has_active_assignment');
    }

    // ─────────────────────────────────────────────────────────────────────────
    // field_supervisor_id from a different company → 422
    // ─────────────────────────────────────────────────────────────────────────

    public function test_field_supervisor_from_different_company_returns_422(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [, $company] = $this->createRepUser();
        [$otherRepUser] = $this->createRepUser(); // representative of an UNRELATED company
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'accepted');
        $academicSupervisor = $this->createAcademicSupervisorUser();

        $payload = $this->validPayload($application, $academicSupervisor, $otherRepUser);

        $response = $this->actingAs($coordinator)
            ->postJson('/api/v1/training-assignments', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['field_supervisor_id']);

        $this->assertDatabaseMissing('training_assignments', ['application_id' => $application->id]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // academic_supervisor_id for a user without that role → 422
    // ─────────────────────────────────────────────────────────────────────────

    public function test_academic_supervisor_without_role_returns_422(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'accepted');
        [$notASupervisor] = $this->createStudentUser(); // a student, not an academic_supervisor

        $payload = $this->validPayload($application, $notASupervisor, $repUser);

        $response = $this->actingAs($coordinator)
            ->postJson('/api/v1/training-assignments', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['academic_supervisor_id']);

        $this->assertDatabaseMissing('training_assignments', ['application_id' => $application->id]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Permission: only training_coordinator may create → 403 for everyone else
    // ─────────────────────────────────────────────────────────────────────────

    public function test_student_cannot_create_training_assignment(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [$studentUser, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'accepted');
        $academicSupervisor = $this->createAcademicSupervisorUser();

        $payload = $this->validPayload($application, $academicSupervisor, $repUser);

        $response = $this->actingAs($studentUser)
            ->postJson('/api/v1/training-assignments', $payload);

        $response->assertStatus(403);
    }

    public function test_company_representative_cannot_create_training_assignment(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'accepted');
        $academicSupervisor = $this->createAcademicSupervisorUser();

        $payload = $this->validPayload($application, $academicSupervisor, $repUser);

        $response = $this->actingAs($repUser)
            ->postJson('/api/v1/training-assignments', $payload);

        $response->assertStatus(403);
    }

    public function test_academic_supervisor_cannot_create_training_assignment(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'accepted');
        $academicSupervisor = $this->createAcademicSupervisorUser();
        $actingSupervisor = $this->createAcademicSupervisorUser();

        $payload = $this->validPayload($application, $academicSupervisor, $repUser);

        $response = $this->actingAs($actingSupervisor)
            ->postJson('/api/v1/training-assignments', $payload);

        $response->assertStatus(403);
    }

    public function test_guest_cannot_create_training_assignment(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'accepted');
        $academicSupervisor = $this->createAcademicSupervisorUser();

        $payload = $this->validPayload($application, $academicSupervisor, $repUser);

        $response = $this->postJson('/api/v1/training-assignments', $payload);

        $response->assertStatus(401);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Validation — only application_id is actually required
    // ─────────────────────────────────────────────────────────────────────────

    public function test_missing_application_id_returns_422(): void
    {
        $coordinator = $this->createCoordinatorUser();

        $response = $this->actingAs($coordinator)
            ->postJson('/api/v1/training-assignments', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['application_id'])
            ->assertJsonMissingValidationErrors([
                'academic_supervisor_id',
                'field_supervisor_id',
                'start_date',
                'end_date',
                'required_reports_count',
            ]);
    }

    public function test_end_date_before_start_date_returns_422(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'accepted');
        $academicSupervisor = $this->createAcademicSupervisorUser();

        $payload = $this->validPayload($application, $academicSupervisor, $repUser, [
            'start_date' => now()->addMonths(3)->toDateString(),
            'end_date' => now()->addDay()->toDateString(),
        ]);

        $response = $this->actingAs($coordinator)
            ->postJson('/api/v1/training-assignments', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['end_date']);
    }

    public function test_coordinator_creates_assignment_with_report_configuration_auto_calculating_total(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'accepted');
        $academicSupervisor = $this->createAcademicSupervisorUser();

        $payload = $this->validPayload($application, $academicSupervisor, $repUser, [
            'required_reports_count' => null,
            'report_configuration' => [
                'daily' => ['enabled' => false, 'max_count' => 0],
                'weekly' => ['enabled' => true, 'max_count' => 10],
                'monthly' => ['enabled' => false, 'max_count' => 0],
                'final' => ['enabled' => true, 'max_count' => 1],
            ],
        ]);

        $response = $this->actingAs($coordinator)
            ->postJson('/api/v1/training-assignments', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.required_reports_count', 11)
            ->assertJsonPath('data.report_configuration.weekly.max_count', 10)
            ->assertJsonPath('data.report_configuration.final.max_count', 1);

        $this->assertDatabaseHas('training_assignments', [
            'application_id' => $application->id,
            'required_reports_count' => 11,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Application-withdrawal fix + is_current
    // ─────────────────────────────────────────────────────────────────────────

    public function test_creating_a_new_assignment_does_not_withdraw_the_application_behind_a_prior_completed_assignment(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [$repUser1, $company1] = $this->createRepUser();
        $opportunity1 = $this->createOpportunity($company1);
        [, $studentProfile] = $this->createStudentUser();
        $academicSupervisor = $this->createAcademicSupervisorUser();

        // First placement: application accepted, assignment created and
        // completed. The application itself is never transitioned away
        // from 'accepted' by anything in the codebase once converted.
        $firstApplication = $this->makeApplication($studentProfile, $opportunity1, 'accepted');
        TrainingAssignment::create([
            'application_id' => $firstApplication->id,
            'student_profile_id' => $studentProfile->id,
            'company_id' => $company1->id,
            'opportunity_id' => $opportunity1->id,
            'academic_supervisor_id' => $academicSupervisor->id,
            'field_supervisor_id' => $repUser1->id,
            'training_coordinator_id' => $coordinator->id,
            'status' => 'completed',
            'is_current' => true,
            'progress_percentage' => 100,
            'version' => 1,
        ]);

        // Second placement, different opportunity: this is the one being
        // created through the actual endpoint.
        [$repUser2, $company2] = $this->createRepUser();
        $opportunity2 = $this->createOpportunity($company2);
        $secondApplication = $this->makeApplication($studentProfile, $opportunity2, 'accepted');

        $payload = $this->validPayload($secondApplication, $academicSupervisor, $repUser2);

        $response = $this->actingAs($coordinator)
            ->postJson('/api/v1/training-assignments', $payload);

        $response->assertStatus(201);

        // The first application must remain untouched — it was already
        // legitimately consumed by the first (now completed) assignment.
        $this->assertDatabaseHas('applications', [
            'id' => $firstApplication->id,
            'status' => 'accepted',
        ]);
    }

    public function test_creating_a_new_assignment_still_withdraws_other_never_converted_applications(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $academicSupervisor = $this->createAcademicSupervisorUser();
        $fieldSupervisor = $this->createRepUser($company)[0];

        // A second, competing accepted application for the SAME student
        // that was never converted into any training assignment.
        $competingOpportunity = $this->createOpportunity($company);
        $competingApplication = $this->makeApplication($studentProfile, $competingOpportunity, 'accepted');

        $application = $this->makeApplication($studentProfile, $opportunity, 'accepted');
        $payload = $this->validPayload($application, $academicSupervisor, $fieldSupervisor);

        $response = $this->actingAs($coordinator)
            ->postJson('/api/v1/training-assignments', $payload);

        $response->assertStatus(201);

        $this->assertDatabaseHas('applications', [
            'id' => $competingApplication->id,
            'status' => 'withdrawn',
        ]);
    }

    public function test_creating_a_new_assignment_marks_it_current_and_unmarks_the_prior_one(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [$repUser1, $company1] = $this->createRepUser();
        $opportunity1 = $this->createOpportunity($company1);
        [, $studentProfile] = $this->createStudentUser();
        $academicSupervisor = $this->createAcademicSupervisorUser();

        $firstApplication = $this->makeApplication($studentProfile, $opportunity1, 'accepted');
        $priorAssignment = TrainingAssignment::create([
            'application_id' => $firstApplication->id,
            'student_profile_id' => $studentProfile->id,
            'company_id' => $company1->id,
            'opportunity_id' => $opportunity1->id,
            'academic_supervisor_id' => $academicSupervisor->id,
            'field_supervisor_id' => $repUser1->id,
            'training_coordinator_id' => $coordinator->id,
            'status' => 'completed',
            'is_current' => true,
            'progress_percentage' => 100,
            'version' => 1,
        ]);

        [$repUser2, $company2] = $this->createRepUser();
        $opportunity2 = $this->createOpportunity($company2);
        $secondApplication = $this->makeApplication($studentProfile, $opportunity2, 'accepted');
        $payload = $this->validPayload($secondApplication, $academicSupervisor, $repUser2);

        $response = $this->actingAs($coordinator)
            ->postJson('/api/v1/training-assignments', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.is_current', true);

        $newAssignmentId = $response->json('data.id');

        $this->assertDatabaseHas('training_assignments', [
            'id' => $priorAssignment->id,
            'is_current' => false,
        ]);
        $this->assertDatabaseHas('training_assignments', [
            'id' => $newAssignmentId,
            'is_current' => true,
        ]);
    }
}
