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
use Tests\TestCase;

/**
 * TEP-634 — Tests: Apply to Opportunity (End-to-End Feature Tests).
 */
class ApplyToOpportunityTest extends TestCase
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

    /** Create a student user + profile and assign student role. */
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

    /** Create a CV File owned by a given user. */
    private function createCvFile(User $uploader): File
    {
        return File::create([
            'uploader_id' => $uploader->id,
            'fileable_type' => User::class,
            'fileable_id' => $uploader->id,
            'purpose' => 'cv',
            'disk' => 'public',
            'path' => 'cvs/sample_cv_' . fake()->uuid() . '.pdf',
            'original_name' => 'my_resume.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 1024 * 300,
            'scan_status' => 'clean',
            'scanned_at' => now(),
        ]);
    }

    /** Create a published opportunity from an approved company. */
    private function createPublishedOpportunity(array $overrides = []): Opportunity
    {
        $company = Company::factory()->approved()->create();

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

    // ─────────────────────────────────────────────────────────────────────────
    // Happy Path & Transition Verification
    // ─────────────────────────────────────────────────────────────────────────

    public function test_eligible_student_applies_successfully(): void
    {
        [$studentUser, $studentProfile] = $this->createStudentUser();
        $cvFile = $this->createCvFile($studentUser);
        $opportunity = $this->createPublishedOpportunity(['capacity' => 3]);

        $payload = [
            'cv_file_id' => $cvFile->id,
            'cover_note' => 'I am very enthusiastic about joining your engineering team for cooperative training.',
        ];

        $response = $this->actingAs($studentUser)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/applications", $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.opportunity_id', $opportunity->id)
            ->assertJsonPath('data.student_profile_id', $studentProfile->id)
            ->assertJsonPath('data.cv_file_id', $cvFile->id)
            ->assertJsonPath('data.cv_file.original_name', 'my_resume.pdf')
            ->assertJsonPath('data.cover_note', $payload['cover_note'])
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonPath('data.version', 1);

        // Verify DB application record
        $application = Application::where('opportunity_id', $opportunity->id)
            ->where('student_profile_id', $studentProfile->id)
            ->first();

        $this->assertNotNull($application);
        $this->assertSame('submitted', $application->status);
        $this->assertSame(1, $application->version);
        $this->assertSame($cvFile->id, $application->cv_file_id);
        $this->assertSame($payload['cover_note'], $application->cover_note);

        // Verify initial transition record (from_status = null, to_status = 'submitted')
        $transition = ApplicationTransition::where('application_id', $application->id)->first();
        $this->assertNotNull($transition);
        $this->assertNull($transition->from_status);
        $this->assertSame('submitted', $transition->to_status);
        $this->assertSame($studentUser->id, $transition->actor_id);
    }

    public function test_student_can_apply_without_cover_note(): void
    {
        [$studentUser] = $this->createStudentUser();
        $cvFile = $this->createCvFile($studentUser);
        $opportunity = $this->createPublishedOpportunity();

        $response = $this->actingAs($studentUser)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/applications", [
                'cv_file_id' => $cvFile->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.cover_note', null);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Validation: CV ownership & payload constraints
    // ─────────────────────────────────────────────────────────────────────────

    public function test_student_cannot_apply_with_cv_belonging_to_another_user(): void
    {
        [$studentUser] = $this->createStudentUser();
        [$otherUser] = $this->createStudentUser();
        $otherUserCv = $this->createCvFile($otherUser);
        $opportunity = $this->createPublishedOpportunity();

        $response = $this->actingAs($studentUser)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/applications", [
                'cv_file_id' => $otherUserCv->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['cv_file_id']);

        $this->assertSame(0, Application::count());
    }

    public function test_student_cannot_apply_with_non_existent_cv_file(): void
    {
        [$studentUser] = $this->createStudentUser();
        $opportunity = $this->createPublishedOpportunity();

        $response = $this->actingAs($studentUser)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/applications", [
                'cv_file_id' => 999999,
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['cv_file_id']);

        $this->assertSame(0, Application::count());
    }

    public function test_student_cannot_apply_with_cover_note_exceeding_3000_chars(): void
    {
        [$studentUser] = $this->createStudentUser();
        $cvFile = $this->createCvFile($studentUser);
        $opportunity = $this->createPublishedOpportunity();

        $response = $this->actingAs($studentUser)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/applications", [
                'cv_file_id' => $cvFile->id,
                'cover_note' => str_repeat('A', 3001),
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['cover_note']);

        $this->assertSame(0, Application::count());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Eligibility Edge Cases (TEP-630 End-to-End via Endpoint)
    // ─────────────────────────────────────────────────────────────────────────

    public function test_applying_after_deadline_is_rejected_via_endpoint(): void
    {
        [$studentUser] = $this->createStudentUser();
        $cvFile = $this->createCvFile($studentUser);
        $opportunity = $this->createPublishedOpportunity([
            'application_deadline' => now()->subHour()->toDateTimeString(),
        ]);

        $response = $this->actingAs($studentUser)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/applications", [
                'cv_file_id' => $cvFile->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'deadline_passed');

        $this->assertSame(0, Application::count());
    }

    public function test_applying_to_non_published_opportunity_is_rejected_via_endpoint(): void
    {
        [$studentUser] = $this->createStudentUser();
        $cvFile = $this->createCvFile($studentUser);
        $opportunity = $this->createPublishedOpportunity([
            'status' => 'draft',
        ]);

        $response = $this->actingAs($studentUser)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/applications", [
                'cv_file_id' => $cvFile->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'opportunity_not_published');

        $this->assertSame(0, Application::count());
    }

    public function test_applying_when_capacity_reached_is_rejected_via_endpoint(): void
    {
        [$studentUser] = $this->createStudentUser();
        $cvFile = $this->createCvFile($studentUser);
        $opportunity = $this->createPublishedOpportunity([
            'capacity' => 2,
            'accepted_count' => 2,
        ]);

        $response = $this->actingAs($studentUser)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/applications", [
                'cv_file_id' => $cvFile->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'opportunity_at_capacity');

        $this->assertSame(0, Application::count());
    }

    public function test_reapplying_to_same_opportunity_when_active_returns_409(): void
    {
        [$studentUser, $studentProfile] = $this->createStudentUser();
        $cvFile = $this->createCvFile($studentUser);
        $opportunity = $this->createPublishedOpportunity();

        // First application
        Application::create([
            'opportunity_id' => $opportunity->id,
            'student_profile_id' => $studentProfile->id,
            'cv_file_id' => $cvFile->id,
            'status' => 'submitted',
            'version' => 1,
        ]);

        // Attempting second application
        $response = $this->actingAs($studentUser)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/applications", [
                'cv_file_id' => $cvFile->id,
            ]);

        $response->assertStatus(409)
            ->assertJsonPath('error_code', 'already_applied');

        $this->assertSame(1, Application::count());
    }

    public function test_reapplying_after_prior_application_was_withdrawn_or_rejected_is_allowed(): void
    {
        [$studentUser, $studentProfile] = $this->createStudentUser();
        $cvFile = $this->createCvFile($studentUser);
        $opportunity = $this->createPublishedOpportunity();

        // Prior application that was withdrawn
        $priorApp = Application::create([
            'opportunity_id' => $opportunity->id,
            'student_profile_id' => $studentProfile->id,
            'cv_file_id' => $cvFile->id,
            'status' => 'withdrawn',
            'withdrawn_reason' => 'Schedule conflict',
            'version' => 2,
        ]);
        // Simulate the original submission having happened weeks ago —
        // created_at is never touched by the reapply path (the row is
        // reused via update(), not recreated).
        $priorApp->created_at = now()->subWeeks(3);
        $priorApp->submitted_at = now()->subWeeks(3);
        $priorApp->save();

        // Re-applying
        $response = $this->actingAs($studentUser)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/applications", [
                'cv_file_id' => $cvFile->id,
                'cover_note' => 'I would like to re-apply now that my schedule is cleared.',
            ]);

        // Note: the unique constraint on (student_profile_id, opportunity_id) was adjusted
        // or updated. If updating existing row or creating second row, we verify 201 response.
        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'submitted');

        // The reused row's created_at stays untouched (still weeks old), but
        // submitted_at must be refreshed — this is what list ordering and
        // the "applied on" display rely on to reflect the actual reapply.
        $priorApp->refresh();
        $this->assertTrue($priorApp->created_at->lt(now()->subDays(1)));
        $this->assertTrue($priorApp->submitted_at->gt(now()->subMinute()));
    }

    public function test_applying_when_max_active_applications_cap_reached_is_rejected(): void
    {
        $cap = (int) config('applications.max_active_applications_per_student', 5);
        [$studentUser, $studentProfile] = $this->createStudentUser();
        $cvFile = $this->createCvFile($studentUser);

        // Create active applications up to the cap
        for ($i = 0; $i < $cap; $i++) {
            $opp = $this->createPublishedOpportunity();
            Application::create([
                'opportunity_id' => $opp->id,
                'student_profile_id' => $studentProfile->id,
                'cv_file_id' => $cvFile->id,
                'status' => 'submitted',
                'version' => 1,
            ]);
        }

        $targetOpp = $this->createPublishedOpportunity();

        $response = $this->actingAs($studentUser)
            ->postJson("/api/v1/opportunities/{$targetOpp->id}/applications", [
                'cv_file_id' => $cvFile->id,
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'active_cap_reached');

        $this->assertStringContainsString((string) $cap, $response->json('message'));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Role Authorization Checks
    // ─────────────────────────────────────────────────────────────────────────

    public function test_company_representative_cannot_apply(): void
    {
        $company = Company::factory()->approved()->create();
        $repUser = User::factory()->create(['status' => 'active', 'email_verified_at' => now()]);

        CompanyRepresentative::create([
            'company_id' => $company->id,
            'user_id' => $repUser->id,
            'is_primary' => true,
            'job_title' => 'Manager',
        ]);

        UserRole::create([
            'user_id' => $repUser->id,
            'role_id' => $this->repRole->id,
            'scope_type' => 'company',
            'scope_id' => $company->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        $opportunity = $this->createPublishedOpportunity();

        $response = $this->actingAs($repUser)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/applications", [
                'cv_file_id' => 1,
            ]);

        $response->assertStatus(403);
    }

    public function test_academic_supervisor_cannot_apply(): void
    {
        $supervisorUser = User::factory()->create(['status' => 'active', 'email_verified_at' => now()]);

        UserRole::create([
            'user_id' => $supervisorUser->id,
            'role_id' => $this->supervisorRole->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        $opportunity = $this->createPublishedOpportunity();

        $response = $this->actingAs($supervisorUser)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/applications", [
                'cv_file_id' => 1,
            ]);

        $response->assertStatus(403);
    }

    public function test_unauthenticated_guest_cannot_apply(): void
    {
        $opportunity = $this->createPublishedOpportunity();

        $response = $this->postJson("/api/v1/opportunities/{$opportunity->id}/applications", [
            'cv_file_id' => 1,
        ]);

        $response->assertStatus(401);
    }
}
