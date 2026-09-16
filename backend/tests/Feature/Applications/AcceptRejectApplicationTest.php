<?php

declare(strict_types=1);

namespace Tests\Feature\Applications;

use App\Models\Application;
use App\Models\ApplicationTransition;
use App\Models\Company;
use App\Models\CompanyRepresentative;
use App\Models\Department;
use App\Models\File;
use App\Models\Major;
use App\Models\Opportunity;
use App\Models\OpportunityType;
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
 * TEP-651 — Tests: Accept/Reject Application (backend portion, covers
 * TEP-648 and TEP-649).
 */
class AcceptRejectApplicationTest extends TestCase
{
    use RefreshDatabase;

    private Role $studentRole;

    private Role $repRole;

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

    /** Create a company representative user tied to a given (or new approved) company. */
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

    /** Create a student user + profile and assign student role. */
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

    /** Create a CV File owned by a given user. */
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

    /** Create a published opportunity for a given company. */
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

    /** Create an application for a student against an opportunity with a given status. */
    protected function makeApplication(StudentProfile $profile, Opportunity $opportunity, string $status = 'submitted'): Application
    {
        $cvFile = $this->createCvFile(User::find($profile->user_id));

        $application = Application::create([
            'opportunity_id' => $opportunity->id,
            'student_profile_id' => $profile->id,
            'cv_file_id' => $cvFile->id,
            'cover_note' => null,
            'status' => $status,
            'version' => 0,
        ]);

        ApplicationTransition::create([
            'application_id' => $application->id,
            'actor_id' => $profile->user_id,
            'from_status' => null,
            'to_status' => $status,
            'reason' => null,
        ]);

        return $application;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Accept — happy path, one per eligible status
    // ─────────────────────────────────────────────────────────────────────────

    public static function eligibleStatusProvider(): array
    {
        return [
            'submitted' => ['submitted'],
            'under_review' => ['under_review'],
            'interview_scheduled' => ['interview_scheduled'],
        ];
    }

    #[DataProvider('eligibleStatusProvider')]
    public function test_accept_succeeds_from_each_eligible_status_and_increments_accepted_count(string $status): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company, ['capacity' => 3, 'accepted_count' => 1]);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, $status);

        $response = $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$application->id}/accept");

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'accepted')
            ->assertJsonPath('data.version', 1);

        $application->refresh();
        $this->assertSame('accepted', $application->status);

        $opportunity->refresh();
        $this->assertSame(2, $opportunity->accepted_count);

        $transition = ApplicationTransition::where('application_id', $application->id)
            ->where('to_status', 'accepted')
            ->first();
        $this->assertNotNull($transition);
        $this->assertSame($status, $transition->from_status);
        $this->assertSame($repUser->id, $transition->actor_id);
    }

    public function test_accept_when_at_capacity_returns_409_and_does_not_change_counter(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company, ['capacity' => 2, 'accepted_count' => 2]);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'submitted');

        $response = $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$application->id}/accept");

        $response->assertStatus(409)
            ->assertJsonPath('error_code', 'capacity_reached')
            ->assertJsonPath('accepted_count', 2)
            ->assertJsonPath('capacity', 2);

        $application->refresh();
        $this->assertSame('submitted', $application->status);

        $opportunity->refresh();
        $this->assertSame(2, $opportunity->accepted_count);

        $this->assertSame(
            0,
            ApplicationTransition::where('application_id', $application->id)
                ->where('to_status', 'accepted')
                ->count()
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Accept / Reject — terminal statuses rejected
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
    public function test_accept_from_a_terminal_status_returns_422(string $status): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, $status);

        $response = $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$application->id}/accept");

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'cannot_accept');

        $application->refresh();
        $this->assertSame($status, $application->status);
    }

    #[DataProvider('terminalStatusProvider')]
    public function test_reject_from_a_terminal_status_returns_422(string $status): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, $status);

        $response = $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$application->id}/reject", [
                'reason' => 'Position filled by another candidate.',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'cannot_reject');

        $application->refresh();
        $this->assertSame($status, $application->status);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Reject — happy path + required reason
    // ─────────────────────────────────────────────────────────────────────────

    #[DataProvider('eligibleStatusProvider')]
    public function test_reject_succeeds_from_each_eligible_status_and_stores_reason(string $status): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company, ['capacity' => 3, 'accepted_count' => 0]);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, $status);

        $response = $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$application->id}/reject", [
                'reason' => 'Skills do not match the role requirements.',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.decision_reason', 'Skills do not match the role requirements.');

        $application->refresh();
        $this->assertSame('rejected', $application->status);
        $this->assertSame('Skills do not match the role requirements.', $application->decision_reason);

        // Rejecting never touches accepted_count.
        $opportunity->refresh();
        $this->assertSame(0, $opportunity->accepted_count);

        $transition = ApplicationTransition::where('application_id', $application->id)
            ->where('to_status', 'rejected')
            ->first();
        $this->assertNotNull($transition);
        $this->assertSame($status, $transition->from_status);
        $this->assertSame('Skills do not match the role requirements.', $transition->reason);
    }

    public function test_reject_without_a_reason_returns_422(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'submitted');

        $response = $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$application->id}/reject", []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);

        $application->refresh();
        $this->assertSame('submitted', $application->status);
    }

    public function test_reject_reason_over_1000_characters_is_rejected(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'submitted');

        $response = $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$application->id}/reject", [
                'reason' => str_repeat('a', 1001),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Concurrency: two simultaneous accepts at the capacity boundary
    // ─────────────────────────────────────────────────────────────────────────

    public function test_concurrent_accepts_at_capacity_boundary_only_one_succeeds(): void
    {
        [$repUser, $company] = $this->createRepUser();
        // Only one slot remains.
        $opportunity = $this->createOpportunity($company, ['capacity' => 1, 'accepted_count' => 0]);
        [, $studentProfileA] = $this->createStudentUser();
        [, $studentProfileB] = $this->createStudentUser();
        $applicationA = $this->makeApplication($studentProfileA, $opportunity, 'submitted');
        $applicationB = $this->makeApplication($studentProfileB, $opportunity, 'submitted');

        // Simulate concurrency deterministically within a single test process:
        // both requests race for the same lockForUpdate() row, but since PHP
        // test execution is single-threaded, we assert the invariant the
        // locking is meant to protect by running both sequentially against
        // the same starting state and confirming the second is correctly
        // rejected once the first has committed the increment — the
        // lockForUpdate() call is what guarantees this holds under real
        // concurrent DB connections too.
        $responseA = $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$applicationA->id}/accept");
        $responseB = $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$applicationB->id}/accept");

        $statuses = [$responseA->getStatusCode(), $responseB->getStatusCode()];
        sort($statuses);
        $this->assertSame([200, 409], $statuses);

        $opportunity->refresh();
        $this->assertSame(1, $opportunity->accepted_count);

        $acceptedCount = Application::whereIn('id', [$applicationA->id, $applicationB->id])
            ->where('status', 'accepted')
            ->count();
        $this->assertSame(1, $acceptedCount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cross-company ownership
    // ─────────────────────────────────────────────────────────────────────────

    public function test_representative_cannot_accept_another_companys_application(): void
    {
        [$repUserA] = $this->createRepUser();
        [, $companyB] = $this->createRepUser();
        $opportunityB = $this->createOpportunity($companyB);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunityB, 'submitted');

        $response = $this->actingAs($repUserA)
            ->postJson("/api/v1/applications/{$application->id}/accept");

        $response->assertStatus(403);

        $application->refresh();
        $this->assertSame('submitted', $application->status);
    }

    public function test_representative_cannot_reject_another_companys_application(): void
    {
        [$repUserA] = $this->createRepUser();
        [, $companyB] = $this->createRepUser();
        $opportunityB = $this->createOpportunity($companyB);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunityB, 'submitted');

        $response = $this->actingAs($repUserA)
            ->postJson("/api/v1/applications/{$application->id}/reject", [
                'reason' => 'Not a fit.',
            ]);

        $response->assertStatus(403);

        $application->refresh();
        $this->assertSame('submitted', $application->status);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Auth / role
    // ─────────────────────────────────────────────────────────────────────────

    public function test_unauthenticated_accept_request_is_rejected(): void
    {
        [, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'submitted');

        $response = $this->postJson("/api/v1/applications/{$application->id}/accept");

        $response->assertStatus(401);
    }

    public function test_student_cannot_accept_an_application(): void
    {
        [$studentUser] = $this->createStudentUser();
        [, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $ownerProfile] = $this->createStudentUser();
        $application = $this->makeApplication($ownerProfile, $opportunity, 'submitted');

        $response = $this->actingAs($studentUser)
            ->postJson("/api/v1/applications/{$application->id}/accept");

        $response->assertStatus(403);
    }

    public function test_accepting_a_non_existent_application_returns_404(): void
    {
        [$repUser] = $this->createRepUser();

        $response = $this->actingAs($repUser)
            ->postJson('/api/v1/applications/999999/accept');

        $response->assertStatus(404);
    }

    public function test_suspended_company_cannot_accept_application(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $company->update(['status' => 'suspended']);

        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'submitted');

        $response = $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$application->id}/accept");

        $response->assertStatus(403);

        $application->refresh();
        $this->assertSame('submitted', $application->status);
    }
}
