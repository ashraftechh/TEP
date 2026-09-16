<?php

declare(strict_types=1);

namespace Tests\Feature\Applications;

use App\Models\Application;
use App\Models\Company;
use App\Models\Department;
use App\Models\Major;
use App\Models\Opportunity;
use App\Models\OpportunityType;
use App\Models\Role;
use App\Models\StudentProfile;
use App\Models\TrainingAssignment;
use App\Models\User;
use App\Models\UserRole;
use App\Services\ApplicationEligibilityService;
use Database\Seeders\LookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * TEP-630 — Exceptional Application Cases.
 *
 * Tests the ApplicationEligibilityService logic exhaustively:
 * deadlines, status gates, capacity, duplicate detection, cap, and role guards.
 *
 * NOTE on status enum values: the four statuses used in opportunities
 * ('draft', 'published', 'closed', 'archived') and six in applications
 * ('submitted','under_review','interview_scheduled','accepted','rejected','withdrawn')
 * are ASSUMPTIONS as flagged in the sprint brief — not confirmed by a
 * source-of-truth document. These tests implement exactly the flagged set.
 */
class ApplicationEligibilityTest extends TestCase
{
    use RefreshDatabase;

    private Role $studentRole;

    private Role $repRole;

    private Role $supervisorRole;

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
        $this->supervisorRole = Role::where('name', 'academic_supervisor')->firstOrFail();

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

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /** Create a student user + profile and assign the student role. */
    private function createStudentUser(): array
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
            'level_year' => 3,
            'gpa' => 3.5,
        ]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $this->studentRole->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        return [$user, $profile];
    }

    /**
     * Create a published opportunity with sensible defaults.
     * application_deadline is stored as a raw DB timestamp string to bypass
     * the model's 'date' cast (which strips time) — needed for buffer tests.
     *
     * @param  array<string, mixed>  $overrides
     */
    private function createPublishedOpportunity(array $overrides = []): Opportunity
    {
        $company = Company::factory()->approved()->create();

        $attrs = array_merge([
            'company_id' => $company->id,
            'opportunity_type_id' => $this->oppType->id,
            'training_cycle_id' => null,
            'created_by' => null,
            'title' => ['en' => 'Dev Intern', 'ar' => 'متدرب مطور'],
            'department' => ['en' => 'IT', 'ar' => 'تقنية المعلومات'],
            'description' => ['en' => 'Great opportunity', 'ar' => 'فرصة رائعة'],
            'work_mode' => 'full_time',
            'location' => "Sana'a",
            'duration' => '3 months',
            'capacity' => 5,
            'accepted_count' => 0,
            'status' => 'published',
            'version' => 1,
            'application_deadline' => null,
        ], $overrides);

        // Insert directly via DB so timestamp fields aren't coerced to date-only
        // by the model cast. Then reload the fresh model so relations work.
        $id = DB::table('opportunities')->insertGetId(array_merge($attrs, [
            'title' => json_encode($attrs['title']),
            'department' => json_encode($attrs['department']),
            'description' => json_encode($attrs['description']),
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        return Opportunity::findOrFail($id);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEP-630: Deadline checks
    // ─────────────────────────────────────────────────────────────────────────

    public function test_applying_after_deadline_is_blocked(): void
    {
        [, $studentProfile] = $this->createStudentUser();
        $opportunity = $this->createPublishedOpportunity([
            'application_deadline' => now()->subHour()->toDateTimeString(),
        ]);

        $service = new ApplicationEligibilityService;
        $result = $service->check($opportunity, $studentProfile);

        $this->assertFalse($result['eligible']);
        $this->assertSame('deadline_passed', $result['error_code']);
        $this->assertSame(422, $result['http_status']);
    }

    public function test_applying_before_deadline_is_allowed(): void
    {
        [, $studentProfile] = $this->createStudentUser();
        $opportunity = $this->createPublishedOpportunity([
            'application_deadline' => now()->addDay()->toDateTimeString(),
        ]);

        $service = new ApplicationEligibilityService;
        $result = $service->check($opportunity, $studentProfile);

        $this->assertTrue($result['eligible']);
    }

    public function test_applying_with_no_deadline_is_allowed(): void
    {
        [, $studentProfile] = $this->createStudentUser();
        $opportunity = $this->createPublishedOpportunity([
            'application_deadline' => null,
        ]);

        $service = new ApplicationEligibilityService;
        $result = $service->check($opportunity, $studentProfile);

        $this->assertTrue($result['eligible']);
    }

    public function test_applying_within_buffer_window_is_blocked_when_buffer_configured(): void
    {
        // Temporarily set deadline_buffer_hours to 2 for this test.
        config(['applications.deadline_buffer_hours' => 2]);

        [, $studentProfile] = $this->createStudentUser();
        // Deadline is 1 hour away — within the 2-hour buffer.
        $opportunity = $this->createPublishedOpportunity([
            'application_deadline' => now()->addHour()->toDateTimeString(),
        ]);

        $service = new ApplicationEligibilityService;
        $result = $service->check($opportunity, $studentProfile);

        $this->assertFalse($result['eligible']);
        $this->assertSame('deadline_passed', $result['error_code']);

        config(['applications.deadline_buffer_hours' => 0]);
    }

    public function test_applying_outside_buffer_window_is_allowed_when_buffer_configured(): void
    {
        config(['applications.deadline_buffer_hours' => 2]);

        [, $studentProfile] = $this->createStudentUser();
        // Deadline is 4 hours away — outside the 2-hour buffer.
        $opportunity = $this->createPublishedOpportunity([
            'application_deadline' => now()->addHours(4)->toDateTimeString(),
        ]);

        $service = new ApplicationEligibilityService;
        $result = $service->check($opportunity, $studentProfile);

        $this->assertTrue($result['eligible']);

        config(['applications.deadline_buffer_hours' => 0]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEP-630: Status gates
    // ─────────────────────────────────────────────────────────────────────────

    #[DataProvider('nonPublishedStatuses')]
    public function test_applying_to_non_published_opportunity_is_blocked(string $status): void
    {
        [, $studentProfile] = $this->createStudentUser();
        $opportunity = $this->createPublishedOpportunity(['status' => $status]);

        $service = new ApplicationEligibilityService;
        $result = $service->check($opportunity, $studentProfile);

        $this->assertFalse($result['eligible']);
        $this->assertSame('opportunity_not_published', $result['error_code']);
        $this->assertSame(422, $result['http_status']);
    }

    public static function nonPublishedStatuses(): array
    {
        return [
            'draft' => ['draft'],
            'closed' => ['closed'],
            'archived' => ['archived'],
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEP-630: Capacity check
    // ─────────────────────────────────────────────────────────────────────────

    public function test_applying_when_accepted_count_equals_capacity_is_blocked(): void
    {
        [, $studentProfile] = $this->createStudentUser();
        $opportunity = $this->createPublishedOpportunity([
            'capacity' => 3,
            'accepted_count' => 3,
        ]);

        $service = new ApplicationEligibilityService;
        $result = $service->check($opportunity, $studentProfile);

        $this->assertFalse($result['eligible']);
        $this->assertSame('opportunity_at_capacity', $result['error_code']);
        $this->assertSame(422, $result['http_status']);
    }

    public function test_applying_when_accepted_count_exceeds_capacity_is_blocked(): void
    {
        [, $studentProfile] = $this->createStudentUser();
        $opportunity = $this->createPublishedOpportunity([
            'capacity' => 3,
            'accepted_count' => 4,
        ]);

        $service = new ApplicationEligibilityService;
        $result = $service->check($opportunity, $studentProfile);

        $this->assertFalse($result['eligible']);
        $this->assertSame('opportunity_at_capacity', $result['error_code']);
    }

    public function test_applying_when_one_slot_remains_is_allowed(): void
    {
        [, $studentProfile] = $this->createStudentUser();
        $opportunity = $this->createPublishedOpportunity([
            'capacity' => 3,
            'accepted_count' => 2,
        ]);

        $service = new ApplicationEligibilityService;
        $result = $service->check($opportunity, $studentProfile);

        $this->assertTrue($result['eligible']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEP-630: Duplicate application check (Check 3)
    // ─────────────────────────────────────────────────────────────────────────

    #[DataProvider('activeApplicationStatuses')]
    public function test_reapplying_while_active_application_exists_returns_409(string $status): void
    {
        [, $studentProfile] = $this->createStudentUser();
        $opportunity = $this->createPublishedOpportunity();

        Application::create([
            'opportunity_id' => $opportunity->id,
            'student_profile_id' => $studentProfile->id,
            'status' => $status,
            'version' => 1,
        ]);

        $service = new ApplicationEligibilityService;
        $result = $service->check($opportunity, $studentProfile);

        $this->assertFalse($result['eligible']);
        $this->assertSame('already_applied', $result['error_code']);
        $this->assertSame(409, $result['http_status']);
    }

    public static function activeApplicationStatuses(): array
    {
        return [
            'submitted' => ['submitted'],
            'under_review' => ['under_review'],
            'interview_scheduled' => ['interview_scheduled'],
            'accepted' => ['accepted'],
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEP-630: Re-apply after withdrawn or rejected is allowed
    // ─────────────────────────────────────────────────────────────────────────

    #[DataProvider('reapplyableStatuses')]
    public function test_reapplying_after_terminal_status_is_allowed(string $priorStatus): void
    {
        [, $studentProfile] = $this->createStudentUser();
        $opportunity = $this->createPublishedOpportunity();

        Application::create([
            'opportunity_id' => $opportunity->id,
            'student_profile_id' => $studentProfile->id,
            'status' => $priorStatus,
            'version' => 1,
        ]);

        $service = new ApplicationEligibilityService;
        $result = $service->check($opportunity, $studentProfile);

        // Must not fail with 'already_applied' — may pass or fail another check
        $this->assertNotSame('already_applied', $result['error_code'] ?? null);
    }

    public static function reapplyableStatuses(): array
    {
        return [
            'withdrawn' => ['withdrawn'],
            'rejected' => ['rejected'],
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEP-630: Active application cap (Check 4)
    // ─────────────────────────────────────────────────────────────────────────

    public function test_cap_th_application_succeeds_and_cap_plus_one_is_blocked(): void
    {
        $cap = (int) config('applications.max_active_applications_per_student', 5);

        [, $studentProfile] = $this->createStudentUser();

        // Create (cap - 1) active applications to different opportunities
        for ($i = 0; $i < $cap - 1; $i++) {
            $opp = $this->createPublishedOpportunity();
            Application::create([
                'opportunity_id' => $opp->id,
                'student_profile_id' => $studentProfile->id,
                'status' => 'submitted',
                'version' => 1,
            ]);
        }

        $capOpportunity = $this->createPublishedOpportunity();

        $service = new ApplicationEligibilityService;

        // cap-th application should be eligible
        $resultAtCap = $service->check($capOpportunity, $studentProfile);
        $this->assertTrue($resultAtCap['eligible'], 'The cap-th application should be eligible');

        // Create the cap-th application so student is now AT the cap
        Application::create([
            'opportunity_id' => $capOpportunity->id,
            'student_profile_id' => $studentProfile->id,
            'status' => 'submitted',
            'version' => 1,
        ]);

        // The (cap+1)-th target opportunity
        $overCapOpportunity = $this->createPublishedOpportunity();
        $resultOverCap = $service->check($overCapOpportunity, $studentProfile);

        $this->assertFalse($resultOverCap['eligible']);
        $this->assertSame('active_cap_reached', $resultOverCap['error_code']);
        $this->assertSame(422, $resultOverCap['http_status']);
        // The error message must name the configured cap number
        $this->assertStringContainsString((string) $cap, $resultOverCap['reason']);
    }

    public function test_accepted_applications_do_not_count_towards_active_cap(): void
    {
        $cap = (int) config('applications.max_active_applications_per_student', 5);

        [, $studentProfile] = $this->createStudentUser();

        // Fill with 'accepted' applications — should NOT count against the cap
        for ($i = 0; $i < $cap; $i++) {
            $opp = $this->createPublishedOpportunity();
            Application::create([
                'opportunity_id' => $opp->id,
                'student_profile_id' => $studentProfile->id,
                'status' => 'accepted',
                'version' => 1,
            ]);
        }

        $newOpportunity = $this->createPublishedOpportunity();
        $service = new ApplicationEligibilityService;
        $result = $service->check($newOpportunity, $studentProfile);

        $this->assertNotSame('active_cap_reached', $result['error_code'] ?? null);
    }

    public function test_withdrawn_applications_do_not_count_towards_active_cap(): void
    {
        $cap = (int) config('applications.max_active_applications_per_student', 5);

        [, $studentProfile] = $this->createStudentUser();

        for ($i = 0; $i < $cap; $i++) {
            $opp = $this->createPublishedOpportunity();
            Application::create([
                'opportunity_id' => $opp->id,
                'student_profile_id' => $studentProfile->id,
                'status' => 'withdrawn',
                'version' => 1,
            ]);
        }

        $newOpportunity = $this->createPublishedOpportunity();
        $service = new ApplicationEligibilityService;
        $result = $service->check($newOpportunity, $studentProfile);

        $this->assertNotSame('active_cap_reached', $result['error_code'] ?? null);
    }

    public function test_rejected_applications_do_not_count_towards_active_cap(): void
    {
        $cap = (int) config('applications.max_active_applications_per_student', 5);

        [, $studentProfile] = $this->createStudentUser();

        for ($i = 0; $i < $cap; $i++) {
            $opp = $this->createPublishedOpportunity();
            Application::create([
                'opportunity_id' => $opp->id,
                'student_profile_id' => $studentProfile->id,
                'status' => 'rejected',
                'version' => 1,
            ]);
        }

        $newOpportunity = $this->createPublishedOpportunity();
        $service = new ApplicationEligibilityService;
        $result = $service->check($newOpportunity, $studentProfile);

        $this->assertNotSame('active_cap_reached', $result['error_code'] ?? null);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEP-630: Fail-fast order verification
    // ─────────────────────────────────────────────────────────────────────────

    public function test_check_fails_on_status_before_capacity(): void
    {
        // Closed opportunity that is also at capacity — status (check 1) fires first
        [, $studentProfile] = $this->createStudentUser();
        $opportunity = $this->createPublishedOpportunity([
            'status' => 'closed',
            'capacity' => 1,
            'accepted_count' => 1,
        ]);

        $service = new ApplicationEligibilityService;
        $result = $service->check($opportunity, $studentProfile);

        $this->assertFalse($result['eligible']);
        $this->assertSame('opportunity_not_published', $result['error_code']);
    }

    public function test_check_fails_on_deadline_before_capacity(): void
    {
        [, $studentProfile] = $this->createStudentUser();
        $opportunity = $this->createPublishedOpportunity([
            'application_deadline' => now()->subMinute()->toDateTimeString(),
            'capacity' => 1,
            'accepted_count' => 1,
        ]);

        $service = new ApplicationEligibilityService;
        $result = $service->check($opportunity, $studentProfile);

        $this->assertFalse($result['eligible']);
        $this->assertSame('deadline_passed', $result['error_code']);
    }

    public function test_check_fails_on_duplicate_before_cap(): void
    {
        // Student is over cap AND has an existing application to target opp —
        // duplicate (check 3) must surface before cap (check 4).
        $cap = (int) config('applications.max_active_applications_per_student', 5);

        [, $studentProfile] = $this->createStudentUser();

        // Fill to cap with other opps
        for ($i = 0; $i < $cap; $i++) {
            $opp = $this->createPublishedOpportunity();
            Application::create([
                'opportunity_id' => $opp->id,
                'student_profile_id' => $studentProfile->id,
                'status' => 'submitted',
                'version' => 1,
            ]);
        }

        // Also has an active app for the target opp
        $targetOpp = $this->createPublishedOpportunity();
        Application::create([
            'opportunity_id' => $targetOpp->id,
            'student_profile_id' => $studentProfile->id,
            'status' => 'submitted',
            'version' => 1,
        ]);

        $service = new ApplicationEligibilityService;
        $result = $service->check($targetOpp, $studentProfile);

        $this->assertSame('already_applied', $result['error_code']);
        $this->assertSame(409, $result['http_status']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TEP-630: Config-driven cap (not hardcoded)
    // ─────────────────────────────────────────────────────────────────────────

    public function test_cap_error_message_cites_configured_cap_number(): void
    {
        // Use a non-default cap to verify the service reads from config, not hardcoded 5
        config(['applications.max_active_applications_per_student' => 3]);

        [, $studentProfile] = $this->createStudentUser();

        for ($i = 0; $i < 3; $i++) {
            $opp = $this->createPublishedOpportunity();
            Application::create([
                'opportunity_id' => $opp->id,
                'student_profile_id' => $studentProfile->id,
                'status' => 'submitted',
                'version' => 1,
            ]);
        }

        $targetOpp = $this->createPublishedOpportunity();
        $service = new ApplicationEligibilityService;
        $result = $service->check($targetOpp, $studentProfile);

        $this->assertFalse($result['eligible']);
        $this->assertSame('active_cap_reached', $result['error_code']);
        // Message must mention the runtime config value (3), not a hardcoded 5
        $this->assertStringContainsString('3', $result['reason']);

        config(['applications.max_active_applications_per_student' => 5]);
    }

    public function test_student_with_active_training_assignment_is_ineligible(): void
    {
        [, $studentProfile] = $this->createStudentUser();
        $targetOpp = $this->createPublishedOpportunity();
        $assignedOpp = $this->createPublishedOpportunity();

        $app = Application::create([
            'opportunity_id' => $assignedOpp->id,
            'student_profile_id' => $studentProfile->id,
            'status' => 'accepted',
            'version' => 1,
        ]);

        TrainingAssignment::create([
            'application_id' => $app->id,
            'student_profile_id' => $studentProfile->id,
            'company_id' => $assignedOpp->company_id,
            'opportunity_id' => $assignedOpp->id,
            'status' => 'active',
            'progress_percentage' => 0,
            'version' => 1,
        ]);

        $service = new ApplicationEligibilityService;
        $result = $service->check($targetOpp, $studentProfile);

        $this->assertFalse($result['eligible']);
        $this->assertSame('student_already_assigned', $result['error_code']);
        $this->assertSame(422, $result['http_status']);
    }

    public function test_student_with_suspended_training_assignment_is_ineligible(): void
    {
        [, $studentProfile] = $this->createStudentUser();
        $targetOpp = $this->createPublishedOpportunity();
        $assignedOpp = $this->createPublishedOpportunity();

        $app = Application::create([
            'opportunity_id' => $assignedOpp->id,
            'student_profile_id' => $studentProfile->id,
            'status' => 'accepted',
            'version' => 1,
        ]);

        TrainingAssignment::create([
            'application_id' => $app->id,
            'student_profile_id' => $studentProfile->id,
            'company_id' => $assignedOpp->company_id,
            'opportunity_id' => $assignedOpp->id,
            'status' => 'suspended',
            'progress_percentage' => 10,
            'version' => 1,
        ]);

        $service = new ApplicationEligibilityService;
        $result = $service->check($targetOpp, $studentProfile);

        $this->assertFalse($result['eligible']);
        $this->assertSame('student_already_assigned', $result['error_code']);
        $this->assertSame(422, $result['http_status']);
    }

    public function test_student_with_completed_training_assignment_is_eligible(): void
    {
        [, $studentProfile] = $this->createStudentUser();
        $targetOpp = $this->createPublishedOpportunity();
        $assignedOpp = $this->createPublishedOpportunity();

        $app = Application::create([
            'opportunity_id' => $assignedOpp->id,
            'student_profile_id' => $studentProfile->id,
            'status' => 'accepted',
            'version' => 1,
        ]);

        TrainingAssignment::create([
            'application_id' => $app->id,
            'student_profile_id' => $studentProfile->id,
            'company_id' => $assignedOpp->company_id,
            'opportunity_id' => $assignedOpp->id,
            'status' => 'completed',
            'progress_percentage' => 100,
            'version' => 1,
        ]);

        $service = new ApplicationEligibilityService;
        $result = $service->check($targetOpp, $studentProfile);

        $this->assertTrue($result['eligible']);
    }
}
