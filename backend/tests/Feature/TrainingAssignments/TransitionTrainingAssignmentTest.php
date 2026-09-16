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
 * TEP-672 — Tests: Training Status Transitions (backend portion, covers
 * TEP-669's transition map and TEP-670's
 * POST /api/v1/training-assignments/{assignment}/transition endpoint).
 *
 * Setup/helpers mirror tests/Feature/TrainingAssignments/CreateTrainingAssignmentTest.php
 * (TEP-663) — same fixtures, but here a TrainingAssignment is created
 * directly at a given status via makeAssignment() rather than through
 * CreateTrainingAssignmentAction, since that action only ever produces
 * `active` rows and transition tests need to start from `suspended`/
 * `completed`/`terminated` too.
 */
class TransitionTrainingAssignmentTest extends TestCase
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

    // ── Helpers (mirrors CreateTrainingAssignmentTest) ─────────────────────

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

    protected function createOpportunity(Company $company): Opportunity
    {
        $attrs = [
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
        ];

        $id = DB::table('opportunities')->insertGetId(array_merge($attrs, [
            'title' => json_encode($attrs['title']),
            'department' => json_encode($attrs['department']),
            'description' => json_encode($attrs['description']),
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        return Opportunity::findOrFail($id);
    }

    protected function makeApplication(StudentProfile $profile, Opportunity $opportunity): Application
    {
        $cvFile = $this->createCvFile(User::find($profile->user_id));

        return Application::create([
            'opportunity_id' => $opportunity->id,
            'student_profile_id' => $profile->id,
            'cv_file_id' => $cvFile->id,
            'cover_note' => null,
            'status' => 'accepted',
            'version' => 0,
        ]);
    }

    /**
     * Create a training_assignments row directly at a given status — bypasses
     * CreateTrainingAssignmentAction (which always starts at `active`) since
     * transition tests need other starting statuses too.
     */
    protected function makeAssignment(string $status, array $overrides = []): TrainingAssignment
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity);
        $coordinator = $this->createCoordinatorUser();

        return TrainingAssignment::create(array_merge([
            'application_id' => $application->id,
            'student_profile_id' => $studentProfile->id,
            'company_id' => $company->id,
            'opportunity_id' => $opportunity->id,
            'academic_supervisor_id' => null,
            'field_supervisor_id' => $repUser->id,
            'training_coordinator_id' => $coordinator->id,
            'status' => $status,
            'start_date' => now()->subMonth()->toDateString(),
            'end_date' => now()->addMonths(2)->toDateString(),
            'progress_percentage' => 40,
            'required_reports_count' => 4,
            'version' => 1,
        ], $overrides));
    }

    private function transitionUrl(TrainingAssignment $assignment): string
    {
        return "/api/v1/training-assignments/{$assignment->id}/transition";
    }

    // ─────────────────────────────────────────────────────────────────────
    // Every valid transition pair succeeds
    // ─────────────────────────────────────────────────────────────────────

    public static function validTransitionProvider(): array
    {
        return [
            'active -> suspended (reason required)' => ['active', 'suspended', 'Student missed mandatory onboarding week.'],
            'active -> completed' => ['active', 'completed', null],
            'active -> terminated (reason required)' => ['active', 'terminated', 'Repeated policy violations at the host company.'],
            'suspended -> active' => ['suspended', 'active', null],
            'suspended -> terminated (reason required)' => ['suspended', 'terminated', 'Placement will not resume.'],
        ];
    }

    #[DataProvider('validTransitionProvider')]
    public function test_valid_transition_succeeds(string $from, string $to, ?string $reason): void
    {
        $coordinator = $this->createCoordinatorUser();
        $assignment = $this->makeAssignment($from);

        $payload = ['to' => $to];
        if ($reason !== null) {
            $payload['reason'] = $reason;
        }

        $response = $this->actingAs($coordinator)
            ->postJson($this->transitionUrl($assignment), $payload);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', $to)
            ->assertJsonPath('data.version', 2);

        $this->assertDatabaseHas('training_assignments', [
            'id' => $assignment->id,
            'status' => $to,
            'version' => 2,
        ]);

        $assignment->refresh();

        if ($to === 'suspended') {
            $this->assertSame($reason, $assignment->suspension_reason);
            $this->assertNull($assignment->termination_reason);
        } elseif ($to === 'terminated') {
            $this->assertSame($reason, $assignment->termination_reason);
            $this->assertNull($assignment->suspension_reason);
        } else {
            // active / completed clear BOTH reason columns defensively.
            $this->assertNull($assignment->suspension_reason);
            $this->assertNull($assignment->termination_reason);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // Every invalid pair → 422
    // ─────────────────────────────────────────────────────────────────────

    public static function invalidTransitionProvider(): array
    {
        return [
            'active -> active (no-op is not a listed transition)' => ['active', 'active'],
            'completed -> active (terminal)' => ['completed', 'active'],
            'completed -> suspended (terminal)' => ['completed', 'suspended'],
            'terminated -> active (terminal)' => ['terminated', 'active'],
            'terminated -> completed (terminal)' => ['terminated', 'completed'],
            'suspended -> completed (not a listed transition)' => ['suspended', 'completed'],
        ];
    }

    #[DataProvider('invalidTransitionProvider')]
    public function test_invalid_transition_returns_422(string $from, string $to): void
    {
        $coordinator = $this->createCoordinatorUser();
        $assignment = $this->makeAssignment($from);

        $payload = in_array($to, ['suspended', 'terminated'], true)
            ? ['to' => $to, 'reason' => 'Some reason.']
            : ['to' => $to];

        $response = $this->actingAs($coordinator)
            ->postJson($this->transitionUrl($assignment), $payload);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'invalid_transition');

        $this->assertDatabaseHas('training_assignments', [
            'id' => $assignment->id,
            'status' => $from,
            'version' => 1,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────
    // suspended / terminated without a reason → 422
    // ─────────────────────────────────────────────────────────────────────

    public static function reasonRequiredProvider(): array
    {
        return [
            'suspended' => ['suspended'],
            'terminated' => ['terminated'],
        ];
    }

    #[DataProvider('reasonRequiredProvider')]
    public function test_missing_reason_for_suspend_or_terminate_returns_422(string $to): void
    {
        $coordinator = $this->createCoordinatorUser();
        $assignment = $this->makeAssignment('active');

        $response = $this->actingAs($coordinator)
            ->postJson($this->transitionUrl($assignment), ['to' => $to]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);

        $this->assertDatabaseHas('training_assignments', [
            'id' => $assignment->id,
            'status' => 'active',
            'version' => 1,
        ]);
    }

    public function test_reactivate_does_not_require_a_reason(): void
    {
        $coordinator = $this->createCoordinatorUser();
        $assignment = $this->makeAssignment('suspended', ['suspension_reason' => 'Prior issue, now resolved.']);

        $response = $this->actingAs($coordinator)
            ->postJson($this->transitionUrl($assignment), ['to' => 'active']);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'active');
    }

    // ─────────────────────────────────────────────────────────────────────
    // Non-coordinator roles → 403
    // ─────────────────────────────────────────────────────────────────────

    public function test_student_cannot_transition_training_assignment(): void
    {
        [$studentUser] = $this->createStudentUser();
        $assignment = $this->makeAssignment('active');

        $response = $this->actingAs($studentUser)
            ->postJson($this->transitionUrl($assignment), ['to' => 'completed']);

        $response->assertStatus(403);
    }

    public function test_company_representative_cannot_transition_training_assignment(): void
    {
        [$repUser] = $this->createRepUser();
        $assignment = $this->makeAssignment('active');

        $response = $this->actingAs($repUser)
            ->postJson($this->transitionUrl($assignment), ['to' => 'completed']);

        $response->assertStatus(403);
    }

    public function test_academic_supervisor_cannot_transition_training_assignment(): void
    {
        $academicSupervisor = $this->createAcademicSupervisorUser();
        $assignment = $this->makeAssignment('active');

        $response = $this->actingAs($academicSupervisor)
            ->postJson($this->transitionUrl($assignment), ['to' => 'completed']);

        $response->assertStatus(403);
    }

    public function test_guest_cannot_transition_training_assignment(): void
    {
        $assignment = $this->makeAssignment('active');

        $response = $this->postJson($this->transitionUrl($assignment), ['to' => 'completed']);

        $response->assertStatus(401);
    }

    // ─────────────────────────────────────────────────────────────────────
    // completed / terminated are terminal — no further transition possible
    // ─────────────────────────────────────────────────────────────────────

    public static function terminalStatusProvider(): array
    {
        return [
            'completed' => ['completed'],
            'terminated' => ['terminated'],
        ];
    }

    #[DataProvider('terminalStatusProvider')]
    public function test_terminal_status_has_no_reachable_transitions(string $status): void
    {
        $assignment = $this->makeAssignment($status);

        $this->assertSame([], TrainingAssignment::TRANSITIONS[$assignment->status]);
        $this->assertFalse($assignment->canTransitionTo('active'));
        $this->assertFalse($assignment->canTransitionTo('suspended'));
        $this->assertFalse($assignment->canTransitionTo('completed'));
        $this->assertFalse($assignment->canTransitionTo('terminated'));
    }

    public function test_invalid_target_status_value_returns_422_validation_error(): void
    {
        $coordinator = $this->createCoordinatorUser();
        $assignment = $this->makeAssignment('active');

        $response = $this->actingAs($coordinator)
            ->postJson($this->transitionUrl($assignment), ['to' => 'not_a_real_status']);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['to']);
    }
}
