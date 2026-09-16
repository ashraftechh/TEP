<?php

declare(strict_types=1);

namespace Tests\Feature\Applications;

use App\Models\Application;
use App\Models\ApplicationTransition;
use App\Models\Department;
use App\Models\Major;
use App\Models\Role;
use App\Models\StudentProfile;
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
 * TEP-642 — Tests: Withdraw Application (backend portion, covers TEP-640).
 */
class WithdrawApplicationTest extends TestCase
{
    use RefreshDatabase;

    private Role $studentRole;

    private Major $major;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(PermissionSeeder::class);
        $this->seed(LookupSeeder::class);

        $this->studentRole = Role::where('name', 'student')->firstOrFail();

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

    // ─────────────────────────────────────────────────────────────────────────
    // Happy path — one per withdrawable status
    // ─────────────────────────────────────────────────────────────────────────

    public static function withdrawableStatusProvider(): array
    {
        return [
            'submitted' => ['submitted'],
            'under_review' => ['under_review'],
            'interview_scheduled' => ['interview_scheduled'],
        ];
    }

    #[DataProvider('withdrawableStatusProvider')]
    public function test_student_can_withdraw_from_each_withdrawable_status(string $status): void
    {
        [$studentUser, $studentProfile] = $this->createStudentUser();

        $overrides = $status === 'interview_scheduled'
            ? ['status' => 'interview_scheduled', 'interview_at' => now()->addDays(5)]
            : ['status' => $status];

        $application = Application::factory()
            ->create(array_merge($overrides, ['student_profile_id' => $studentProfile->id]));

        $response = $this->actingAs($studentUser)
            ->postJson("/api/v1/applications/{$application->id}/withdraw", [
                'reason' => 'Accepted a different offer.',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'withdrawn')
            ->assertJsonPath('data.withdrawn_reason', 'Accepted a different offer.')
            ->assertJsonPath('data.version', 2);

        $application->refresh();
        $this->assertSame('withdrawn', $application->status);
        $this->assertSame('Accepted a different offer.', $application->withdrawn_reason);
        $this->assertSame(2, $application->version);

        // Transition row recorded (append-only history), separate from audit_logs.
        $transition = ApplicationTransition::where('application_id', $application->id)
            ->where('to_status', 'withdrawn')
            ->first();
        $this->assertNotNull($transition);
        $this->assertSame($status, $transition->from_status);
        $this->assertSame($studentUser->id, $transition->actor_id);
        $this->assertSame('Accepted a different offer.', $transition->reason);
    }

    public function test_withdraw_reason_is_optional(): void
    {
        [$studentUser, $studentProfile] = $this->createStudentUser();
        $application = Application::factory()
            ->create(['student_profile_id' => $studentProfile->id, 'status' => 'submitted']);

        $response = $this->actingAs($studentUser)
            ->postJson("/api/v1/applications/{$application->id}/withdraw", []);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'withdrawn')
            ->assertJsonPath('data.withdrawn_reason', null);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Terminal statuses reject with 409
    // ─────────────────────────────────────────────────────────────────────────

    public static function terminalStatusProvider(): array
    {
        return [
            'accepted' => ['accepted'],
            'rejected' => ['rejected'],
            'withdrawn' => ['withdrawn'],
        ];
    }

    #[DataProvider('terminalStatusProvider')]
    public function test_withdrawing_from_a_terminal_status_returns_409(string $status): void
    {
        [$studentUser, $studentProfile] = $this->createStudentUser();
        $application = Application::factory()
            ->create(['student_profile_id' => $studentProfile->id, 'status' => $status]);

        $response = $this->actingAs($studentUser)
            ->postJson("/api/v1/applications/{$application->id}/withdraw", []);

        $response->assertStatus(409)
            ->assertJsonPath('error_code', 'cannot_withdraw');

        $application->refresh();
        $this->assertSame($status, $application->status);
        $this->assertSame(0, ApplicationTransition::where('application_id', $application->id)->count());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Ownership & auth
    // ─────────────────────────────────────────────────────────────────────────

    public function test_student_cannot_withdraw_another_students_application(): void
    {
        [, $ownerProfile] = $this->createStudentUser();
        [$otherStudentUser] = $this->createStudentUser();

        $application = Application::factory()
            ->create(['student_profile_id' => $ownerProfile->id, 'status' => 'submitted']);

        $response = $this->actingAs($otherStudentUser)
            ->postJson("/api/v1/applications/{$application->id}/withdraw", []);

        $response->assertStatus(403);

        $application->refresh();
        $this->assertSame('submitted', $application->status);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        [, $studentProfile] = $this->createStudentUser();
        $application = Application::factory()
            ->create(['student_profile_id' => $studentProfile->id, 'status' => 'submitted']);

        $response = $this->postJson("/api/v1/applications/{$application->id}/withdraw", []);

        $response->assertStatus(401);
    }

    public function test_withdrawing_a_non_existent_application_returns_404(): void
    {
        [$studentUser] = $this->createStudentUser();

        $response = $this->actingAs($studentUser)
            ->postJson('/api/v1/applications/999999/withdraw', []);

        $response->assertStatus(404);
    }

    public function test_reason_over_500_characters_is_rejected(): void
    {
        [$studentUser, $studentProfile] = $this->createStudentUser();
        $application = Application::factory()
            ->create(['student_profile_id' => $studentProfile->id, 'status' => 'submitted']);

        $response = $this->actingAs($studentUser)
            ->postJson("/api/v1/applications/{$application->id}/withdraw", [
                'reason' => str_repeat('a', 501),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // interview_at cleanup (TEP-640 flagged cleanup)
    // ─────────────────────────────────────────────────────────────────────────

    public function test_withdrawing_an_interview_scheduled_application_clears_interview_at(): void
    {
        [$studentUser, $studentProfile] = $this->createStudentUser();
        $application = Application::factory()
            ->interviewScheduled()
            ->create(['student_profile_id' => $studentProfile->id]);

        $this->assertNotNull($application->interview_at);

        $response = $this->actingAs($studentUser)
            ->postJson("/api/v1/applications/{$application->id}/withdraw", []);

        $response->assertStatus(200)
            ->assertJsonPath('data.interview_at', null);

        $application->refresh();
        $this->assertNull($application->interview_at);
        $this->assertSame('withdrawn', $application->status);
    }
}
