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
 * TEP-638 — Tests: My Applications (GET /api/v1/my/applications).
 *
 * Covers: ownership isolation, status filter, pagination, can_withdraw flag,
 * latest_transition eager load, and role-based authorization.
 */
class MyApplicationsTest extends TestCase
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

    // ── Helpers ───────────────────────────────────────────────────────────────

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

    /** Create a published opportunity from an approved company. */
    protected function createPublishedOpportunity(array $overrides = []): Opportunity
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

    /** Create an application for a student with an optional status. */
    protected function makeApplication(StudentProfile $profile, Opportunity $opportunity, string $status = 'submitted', ?User $actor = null): Application
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

        // Record initial transition so latestTransition relation has data
        ApplicationTransition::create([
            'application_id' => $application->id,
            'actor_id' => $actor ? $actor->id : User::find($profile->user_id)->id,
            'from_status' => null,
            'to_status' => $status,
            'reason' => null,
        ]);

        return $application;
    }

    // ── Test Cases ────────────────────────────────────────────────────────────

    /**
     * Test 1: Happy path — student can fetch their own applications.
     */
    public function test_student_can_fetch_own_applications(): void
    {
        [$studentUser, $studentProfile] = $this->createStudentUser();
        $opportunity = $this->createPublishedOpportunity();
        $this->makeApplication($studentProfile, $opportunity, 'submitted');

        $response = $this->actingAs($studentUser)
            ->getJson('/api/v1/my/applications');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'status',
                        'can_withdraw',
                        'created_at',
                        'opportunity',
                    ],
                ],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);

        $this->assertCount(1, $response->json('data'));
    }

    /**
     * Test 2: Ownership isolation — student A never sees student B's applications.
     */
    public function test_returns_only_own_applications_never_another_students(): void
    {
        [$studentA, $profileA] = $this->createStudentUser();
        [$studentB, $profileB] = $this->createStudentUser();

        $oppA = $this->createPublishedOpportunity();
        $oppB = $this->createPublishedOpportunity();

        $this->makeApplication($profileA, $oppA, 'submitted');
        $this->makeApplication($profileB, $oppB, 'submitted');

        // Student B tries to pass student A's profile_id as a query param — must be ignored
        $response = $this->actingAs($studentB)
            ->getJson('/api/v1/my/applications?student_profile_id='.$profileA->id);

        $response->assertOk();

        // Should only contain Student B's application (1 item)
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals(
            $profileB->id,
            $response->json('data.0.student_profile_id')
        );
    }

    /**
     * Test 3: Status filter — ?status=submitted returns only submitted apps.
     */
    public function test_status_filter_submitted_returns_only_submitted(): void
    {
        [$studentUser, $studentProfile] = $this->createStudentUser();
        $opp1 = $this->createPublishedOpportunity();
        $opp2 = $this->createPublishedOpportunity();

        $this->makeApplication($studentProfile, $opp1, 'submitted');
        $this->makeApplication($studentProfile, $opp2, 'accepted');

        $response = $this->actingAs($studentUser)
            ->getJson('/api/v1/my/applications?status=submitted');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('submitted', $response->json('data.0.status'));
    }

    /**
     * Test 4: Status filter — ?status=accepted returns only accepted apps.
     */
    public function test_status_filter_accepted_returns_only_accepted(): void
    {
        [$studentUser, $studentProfile] = $this->createStudentUser();
        $opp1 = $this->createPublishedOpportunity();
        $opp2 = $this->createPublishedOpportunity();

        $this->makeApplication($studentProfile, $opp1, 'accepted');
        $this->makeApplication($studentProfile, $opp2, 'rejected');

        $response = $this->actingAs($studentUser)
            ->getJson('/api/v1/my/applications?status=accepted');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('accepted', $response->json('data.0.status'));
    }

    /**
     * Test 5: Invalid status value returns 422.
     */
    public function test_invalid_status_value_returns_422(): void
    {
        [$studentUser] = $this->createStudentUser();

        $response = $this->actingAs($studentUser)
            ->getJson('/api/v1/my/applications?status=garbage');

        $response->assertUnprocessable()
            ->assertJsonValidationErrorFor('status');
    }

    /**
     * Test 6: Unauthenticated request returns 401.
     */
    public function test_unauthenticated_request_returns_401(): void
    {
        $response = $this->getJson('/api/v1/my/applications');

        $response->assertUnauthorized();
    }

    /**
     * Test 7: Company representative cannot access this endpoint (403).
     *
     * This is an `.own.` endpoint scoped to student role — a different role
     * entirely, not just a different student.
     */
    public function test_company_representative_cannot_access_my_applications(): void
    {
        $repUser = User::factory()->create([
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        $company = Company::factory()->approved()->create();

        CompanyRepresentative::create([
            'user_id' => $repUser->id,
            'company_id' => $company->id,
            'is_primary' => true,
        ]);

        UserRole::create([
            'user_id' => $repUser->id,
            'role_id' => $this->repRole->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        $response = $this->actingAs($repUser)
            ->getJson('/api/v1/my/applications');

        $response->assertForbidden();
    }

    /**
     * Test 8: Academic supervisor cannot access this endpoint (403).
     */
    public function test_academic_supervisor_cannot_access_my_applications(): void
    {
        $supervisorUser = User::factory()->create([
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        UserRole::create([
            'user_id' => $supervisorUser->id,
            'role_id' => $this->supervisorRole->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        $response = $this->actingAs($supervisorUser)
            ->getJson('/api/v1/my/applications');

        $response->assertForbidden();
    }

    /**
     * Test 9: can_withdraw is true for a withdrawable status (submitted).
     *
     * ASSUMPTION: withdrawable_statuses = ['submitted','under_review',
     * 'interview_scheduled'] — flagged in config/applications.php.
     */
    public function test_response_includes_can_withdraw_true_for_withdrawable_status(): void
    {
        [$studentUser, $studentProfile] = $this->createStudentUser();
        $opportunity = $this->createPublishedOpportunity();
        $this->makeApplication($studentProfile, $opportunity, 'submitted');

        $response = $this->actingAs($studentUser)
            ->getJson('/api/v1/my/applications');

        $response->assertOk();
        $this->assertTrue($response->json('data.0.can_withdraw'));
    }

    /**
     * Test 10: can_withdraw is false for a non-withdrawable status (accepted).
     */
    public function test_response_includes_can_withdraw_false_for_accepted(): void
    {
        [$studentUser, $studentProfile] = $this->createStudentUser();
        $opportunity = $this->createPublishedOpportunity();
        $this->makeApplication($studentProfile, $opportunity, 'accepted');

        $response = $this->actingAs($studentUser)
            ->getJson('/api/v1/my/applications');

        $response->assertOk();
        $this->assertFalse($response->json('data.0.can_withdraw'));
    }

    /**
     * Test 11: Response eager-loads opportunity and company (no N+1).
     */
    public function test_response_eager_loads_opportunity_and_company(): void
    {
        [$studentUser, $studentProfile] = $this->createStudentUser();
        $opportunity = $this->createPublishedOpportunity();
        $this->makeApplication($studentProfile, $opportunity, 'submitted');

        $response = $this->actingAs($studentUser)
            ->getJson('/api/v1/my/applications');

        $response->assertOk()
            ->assertJsonPath('data.0.opportunity.id', $opportunity->id)
            ->assertJsonPath('data.0.opportunity.company.id', $opportunity->company_id);
    }

    /**
     * Test 12: Response includes latest_transition with the correct to_status.
     */
    public function test_response_includes_latest_transition(): void
    {
        [$studentUser, $studentProfile] = $this->createStudentUser();
        $opportunity = $this->createPublishedOpportunity();
        $this->makeApplication($studentProfile, $opportunity, 'under_review');

        $response = $this->actingAs($studentUser)
            ->getJson('/api/v1/my/applications');

        $response->assertOk();
        $this->assertNotNull($response->json('data.0.latest_transition'));
        $this->assertEquals('under_review', $response->json('data.0.latest_transition.to_status'));
    }

    /**
     * Test 13: Student with no applications gets 200 with empty data array.
     */
    public function test_empty_list_for_student_with_no_applications(): void
    {
        [$studentUser] = $this->createStudentUser();

        $response = $this->actingAs($studentUser)
            ->getJson('/api/v1/my/applications');

        $response->assertOk()
            ->assertJsonPath('data', [])
            ->assertJsonPath('meta.total', 0);
    }

    /**
     * Test 14: Pagination works — 16 apps on page 1 returns 15, total=16.
     */
    public function test_pagination_works(): void
    {
        [$studentUser, $studentProfile] = $this->createStudentUser();

        for ($i = 0; $i < 16; $i++) {
            $opp = $this->createPublishedOpportunity();
            $this->makeApplication($studentProfile, $opp, 'submitted');
        }

        $response = $this->actingAs($studentUser)
            ->getJson('/api/v1/my/applications?per_page=15');

        $response->assertOk();
        $this->assertCount(15, $response->json('data'));
        $this->assertEquals(16, $response->json('meta.total'));
        $this->assertEquals(2, $response->json('meta.last_page'));
    }

    /**
     * Test 15: Student role with no StudentProfile record returns 403.
     *
     * The authorize() gate in MyApplicationsRequest checks both the permission
     * AND the existence of studentProfile. A user who has the student role but
     * no profile row (e.g. incomplete registration) must be rejected.
     */
    public function test_student_without_profile_returns_403(): void
    {
        // User with student role but deliberately no StudentProfile created
        $user = User::factory()->create([
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $this->studentRole->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/v1/my/applications');

        $response->assertForbidden();
    }
}
