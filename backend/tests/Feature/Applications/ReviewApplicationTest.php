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
 * TEP-652 — Tests: Mark Application as Under Review (backend portion).
 */
class ReviewApplicationTest extends TestCase
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
    // Happy Path
    // ─────────────────────────────────────────────────────────────────────────

    public function test_review_succeeds_from_submitted_status(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'submitted');

        $response = $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$application->id}/review");

        $response->assertOk()
            ->assertJsonPath('data.id', $application->id)
            ->assertJsonPath('data.status', 'under_review')
            ->assertJsonPath('message', __('applications.review_started_successfully'));

        $this->assertDatabaseHas('applications', [
            'id' => $application->id,
            'status' => 'under_review',
            'version' => 1,
        ]);

        $this->assertDatabaseHas('application_transitions', [
            'application_id' => $application->id,
            'actor_id' => $repUser->id,
            'from_status' => 'submitted',
            'to_status' => 'under_review',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Ineligible Statuses (422)
    // ─────────────────────────────────────────────────────────────────────────

    public static function ineligibleStatusProvider(): array
    {
        return [
            'under_review' => ['under_review'],
            'interview_scheduled' => ['interview_scheduled'],
            'accepted' => ['accepted'],
            'rejected' => ['rejected'],
            'withdrawn' => ['withdrawn'],
        ];
    }

    #[DataProvider('ineligibleStatusProvider')]
    public function test_review_fails_when_application_not_in_submitted_status(string $status): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, $status);

        $response = $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$application->id}/review");

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'cannot_review');

        // Status unchanged
        $this->assertDatabaseHas('applications', [
            'id' => $application->id,
            'status' => $status,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Authorization & Tenant Scoping
    // ─────────────────────────────────────────────────────────────────────────

    public function test_review_rejected_for_unauthenticated_user(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'submitted');

        $response = $this->postJson("/api/v1/applications/{$application->id}/review");

        $response->assertUnauthorized();
    }

    public function test_review_rejected_for_student_user(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [$studentUser, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'submitted');

        $response = $this->actingAs($studentUser)
            ->postJson("/api/v1/applications/{$application->id}/review");

        $response->assertForbidden();
    }

    public function test_review_rejected_for_different_company_representative(): void
    {
        // Company A owns opportunity
        [, $companyA] = $this->createRepUser();
        $opportunityA = $this->createOpportunity($companyA);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunityA, 'submitted');

        // Rep B belongs to Company B
        [$repB] = $this->createRepUser();

        $response = $this->actingAs($repB)
            ->postJson("/api/v1/applications/{$application->id}/review");

        $response->assertForbidden();
    }

    public function test_review_rejected_for_suspended_company(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $company->update(['status' => 'suspended']);

        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $application = $this->makeApplication($studentProfile, $opportunity, 'submitted');

        $response = $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$application->id}/review");

        $response->assertForbidden();

        $application->refresh();
        $this->assertSame('submitted', $application->status);
    }
}
