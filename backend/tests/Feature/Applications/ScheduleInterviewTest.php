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
 * TEP-655 — Tests: Schedule Interview (covers TEP-653's backend endpoint).
 */
class ScheduleInterviewTest extends TestCase
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

    // ── Helpers (mirrors AcceptRejectApplicationTest) ──────────────────────────

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
    // Happy path — schedule from submitted / under_review
    // ─────────────────────────────────────────────────────────────────────────

    public static function schedulableStatusProvider(): array
    {
        return [
            'submitted' => ['submitted'],
            'under_review' => ['under_review'],
        ];
    }

    #[DataProvider('schedulableStatusProvider')]
    public function test_scheduling_from_a_schedulable_status_succeeds_and_records_transition(string $status): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, $status);

        $interviewAt = now()->addDays(3)->startOfSecond();

        $response = $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$application->id}/interview", [
                'interview_at' => $interviewAt->toISOString(),
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'interview_scheduled');

        $application->refresh();
        $this->assertSame('interview_scheduled', $application->status);
        $this->assertNotNull($application->interview_at);
        $this->assertTrue($application->interview_at->equalTo($interviewAt));

        $transition = ApplicationTransition::where('application_id', $application->id)
            ->where('to_status', 'interview_scheduled')
            ->first();
        $this->assertNotNull($transition);
        $this->assertSame($status, $transition->from_status);
        $this->assertSame($repUser->id, $transition->actor_id);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Terminal / non-schedulable statuses — 422
    // ─────────────────────────────────────────────────────────────────────────

    public static function nonSchedulableStatusProvider(): array
    {
        return [
            'accepted' => ['accepted'],
            'rejected' => ['rejected'],
            'withdrawn' => ['withdrawn'],
        ];
    }

    #[DataProvider('nonSchedulableStatusProvider')]
    public function test_scheduling_from_accepted_rejected_or_withdrawn_returns_422(string $status): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, $status);

        $response = $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$application->id}/interview", [
                'interview_at' => now()->addDays(2)->toISOString(),
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'cannot_schedule_interview');

        $application->refresh();
        $this->assertSame($status, $application->status);
        $this->assertNull($application->interview_at);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Validation — interview_at in the past
    // ─────────────────────────────────────────────────────────────────────────

    public function test_interview_at_in_the_past_fails_validation(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'submitted');

        $response = $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$application->id}/interview", [
                'interview_at' => now()->subDay()->toISOString(),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['interview_at']);

        $application->refresh();
        $this->assertSame('submitted', $application->status);
        $this->assertNull($application->interview_at);
    }

    public function test_interview_at_is_required(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'submitted');

        $response = $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$application->id}/interview", []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['interview_at']);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Re-scheduling — updates time in place, no duplicate transition
    // ─────────────────────────────────────────────────────────────────────────

    public function test_rescheduling_while_already_interview_scheduled_updates_time_without_duplicating_transition(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'submitted');

        $firstInterviewAt = now()->addDays(3)->startOfSecond();
        $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$application->id}/interview", [
                'interview_at' => $firstInterviewAt->toISOString(),
            ])->assertStatus(200);

        $this->assertSame(
            1,
            ApplicationTransition::where('application_id', $application->id)
                ->where('to_status', 'interview_scheduled')
                ->count()
        );

        $secondInterviewAt = now()->addDays(5)->startOfSecond();
        $response = $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$application->id}/interview", [
                'interview_at' => $secondInterviewAt->toISOString(),
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.status', 'interview_scheduled');

        $application->refresh();
        $this->assertSame('interview_scheduled', $application->status);
        $this->assertTrue($application->interview_at->equalTo($secondInterviewAt));

        // Still only one transition row for interview_scheduled — the
        // reschedule did not log a second one.
        $this->assertSame(
            1,
            ApplicationTransition::where('application_id', $application->id)
                ->where('to_status', 'interview_scheduled')
                ->count()
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cross-company ownership
    // ─────────────────────────────────────────────────────────────────────────

    public function test_representative_from_a_different_company_cannot_schedule_for_someone_elses_opportunity(): void
    {
        [$repUserA] = $this->createRepUser();
        [, $companyB] = $this->createRepUser();
        $opportunityB = $this->createOpportunity($companyB);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunityB, 'submitted');

        $response = $this->actingAs($repUserA)
            ->postJson("/api/v1/applications/{$application->id}/interview", [
                'interview_at' => now()->addDays(2)->toISOString(),
            ]);

        $response->assertStatus(403);

        $application->refresh();
        $this->assertSame('submitted', $application->status);
        $this->assertNull($application->interview_at);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Auth / role
    // ─────────────────────────────────────────────────────────────────────────

    public function test_unauthenticated_schedule_interview_request_is_rejected(): void
    {
        [, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'submitted');

        $response = $this->postJson("/api/v1/applications/{$application->id}/interview", [
            'interview_at' => now()->addDays(2)->toISOString(),
        ]);

        $response->assertStatus(401);
    }

    public function test_student_cannot_schedule_an_interview(): void
    {
        [$studentUser] = $this->createStudentUser();
        [, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $ownerProfile] = $this->createStudentUser();
        $application = $this->makeApplication($ownerProfile, $opportunity, 'submitted');

        $response = $this->actingAs($studentUser)
            ->postJson("/api/v1/applications/{$application->id}/interview", [
                'interview_at' => now()->addDays(2)->toISOString(),
            ]);

        $response->assertStatus(403);
    }

    public function test_scheduling_for_a_non_existent_application_returns_404(): void
    {
        [$repUser] = $this->createRepUser();

        $response = $this->actingAs($repUser)
            ->postJson('/api/v1/applications/999999/interview', [
                'interview_at' => now()->addDays(2)->toISOString(),
            ]);

        $response->assertStatus(404);
    }

    public function test_suspended_company_cannot_schedule_interview(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $company->update(['status' => 'suspended']);

        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'submitted');

        $response = $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$application->id}/interview", [
                'interview_at' => now()->addDays(2)->toISOString(),
            ]);

        $response->assertStatus(403);

        $application->refresh();
        $this->assertNull($application->interview_at);
        $this->assertSame('submitted', $application->status);
    }
}
