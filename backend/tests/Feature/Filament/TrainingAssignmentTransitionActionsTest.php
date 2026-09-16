<?php

declare(strict_types=1);

namespace Tests\Feature\Filament;

use App\Filament\Resources\TrainingAssignments\Pages\ListTrainingAssignments;
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
use Livewire\Livewire;
use Tests\TestCase;

/**
 * TEP-672 — Tests: Training Status Transitions (Filament/TEP-671 portion).
 *
 * Setup/helpers mirror tests/Feature/Filament/TrainingAssignmentResourceTest.php
 * (TEP-663).
 */
class TrainingAssignmentTransitionActionsTest extends TestCase
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

    // ── Helpers ─────────────────────────────────────────────────────────────

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

    protected function createStudentUser(): User
    {
        $user = User::factory()->create(['status' => 'active', 'email_verified_at' => now()]);

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

        $this->latestStudentProfile = $profile;

        return $user;
    }

    private ?StudentProfile $latestStudentProfile = null;

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

    protected function makeAssignment(string $status, array $overrides = []): TrainingAssignment
    {
        $company = Company::factory()->approved()->create();

        $repUser = User::factory()->create(['status' => 'active', 'email_verified_at' => now()]);
        CompanyRepresentative::create(['user_id' => $repUser->id, 'company_id' => $company->id, 'is_primary' => true]);
        UserRole::create(['user_id' => $repUser->id, 'role_id' => $this->repRole->id, 'assigned_by' => null, 'assigned_at' => now()]);

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
        $opportunityId = DB::table('opportunities')->insertGetId(array_merge($attrs, [
            'title' => json_encode($attrs['title']),
            'department' => json_encode($attrs['department']),
            'description' => json_encode($attrs['description']),
            'created_at' => now(),
            'updated_at' => now(),
        ]));
        $opportunity = Opportunity::findOrFail($opportunityId);

        $studentUser = $this->createStudentUser();
        $studentProfile = $this->latestStudentProfile;

        $cvFile = $this->createCvFile($studentUser);
        $application = Application::create([
            'opportunity_id' => $opportunity->id,
            'student_profile_id' => $studentProfile->id,
            'cv_file_id' => $cvFile->id,
            'cover_note' => null,
            'status' => 'accepted',
            'version' => 0,
        ]);

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

    // ─────────────────────────────────────────────────────────────────────
    // Row actions render only the valid subset for the row's current status
    // ─────────────────────────────────────────────────────────────────────

    public function test_active_row_shows_only_suspend_terminate_and_complete(): void
    {
        $coordinator = $this->createCoordinatorUser();
        $this->actingAs($coordinator);

        $assignment = $this->makeAssignment('active');

        Livewire::test(ListTrainingAssignments::class)
            ->assertTableActionVisible('suspend', $assignment)
            ->assertTableActionVisible('terminate', $assignment)
            ->assertTableActionVisible('mark_completed', $assignment)
            ->assertTableActionHidden('reactivate', $assignment);
    }

    public function test_suspended_row_shows_only_reactivate_and_terminate(): void
    {
        $coordinator = $this->createCoordinatorUser();
        $this->actingAs($coordinator);

        $assignment = $this->makeAssignment('suspended', ['suspension_reason' => 'Prior issue.']);

        Livewire::test(ListTrainingAssignments::class)
            ->assertTableActionVisible('reactivate', $assignment)
            ->assertTableActionVisible('terminate', $assignment)
            ->assertTableActionHidden('suspend', $assignment)
            ->assertTableActionHidden('mark_completed', $assignment);
    }

    public function test_completed_row_shows_no_transition_actions(): void
    {
        $coordinator = $this->createCoordinatorUser();
        $this->actingAs($coordinator);

        $assignment = $this->makeAssignment('completed');

        Livewire::test(ListTrainingAssignments::class)
            ->assertTableActionHidden('suspend', $assignment)
            ->assertTableActionHidden('terminate', $assignment)
            ->assertTableActionHidden('reactivate', $assignment)
            ->assertTableActionHidden('mark_completed', $assignment);
    }

    public function test_terminated_row_shows_no_transition_actions(): void
    {
        $coordinator = $this->createCoordinatorUser();
        $this->actingAs($coordinator);

        $assignment = $this->makeAssignment('terminated', ['termination_reason' => 'Ended early.']);

        Livewire::test(ListTrainingAssignments::class)
            ->assertTableActionHidden('suspend', $assignment)
            ->assertTableActionHidden('terminate', $assignment)
            ->assertTableActionHidden('reactivate', $assignment)
            ->assertTableActionHidden('mark_completed', $assignment);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Calling the actions actually transitions the row
    // ─────────────────────────────────────────────────────────────────────

    public function test_suspend_action_requires_a_reason_and_updates_status(): void
    {
        $coordinator = $this->createCoordinatorUser();
        $this->actingAs($coordinator);

        $assignment = $this->makeAssignment('active');

        Livewire::test(ListTrainingAssignments::class)
            ->callTableAction('suspend', $assignment, data: ['reason' => ''])
            ->assertHasTableActionErrors(['reason' => 'required']);

        $assignment->refresh();
        $this->assertSame('active', $assignment->status);

        Livewire::test(ListTrainingAssignments::class)
            ->callTableAction('suspend', $assignment, data: ['reason' => 'Attendance issues.'])
            ->assertHasNoTableActionErrors();

        $assignment->refresh();
        $this->assertSame('suspended', $assignment->status);
        $this->assertSame('Attendance issues.', $assignment->suspension_reason);
        $this->assertSame(2, $assignment->version);
    }

    public function test_reactivate_action_updates_status_without_reason(): void
    {
        $coordinator = $this->createCoordinatorUser();
        $this->actingAs($coordinator);

        $assignment = $this->makeAssignment('suspended', ['suspension_reason' => 'Previously suspended.']);

        Livewire::test(ListTrainingAssignments::class)
            ->callTableAction('reactivate', $assignment)
            ->assertHasNoTableActionErrors();

        $assignment->refresh();
        $this->assertSame('active', $assignment->status);
        $this->assertNull($assignment->suspension_reason);
    }

    public function test_mark_completed_action_updates_status(): void
    {
        $coordinator = $this->createCoordinatorUser();
        $this->actingAs($coordinator);

        $assignment = $this->makeAssignment('active');

        Livewire::test(ListTrainingAssignments::class)
            ->callTableAction('mark_completed', $assignment)
            ->assertHasNoTableActionErrors();

        $assignment->refresh();
        $this->assertSame('completed', $assignment->status);
    }

    public function test_non_coordinator_cannot_access_the_admin_panel_to_transition(): void
    {
        $student = $this->createStudentUser();

        $response = $this->actingAs($student)->get('/admin/training-assignments');

        $response->assertStatus(403);
    }
}
