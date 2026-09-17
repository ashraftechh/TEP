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
 * TEP-646 — Tests: Review Company Applications (GET /api/v1/company/applications).
 *
 * Covers: company scoping isolation, opportunity/status filters, sorting,
 * pagination, eager-loaded relations, and role/ownership-based authorization.
 */
class CompanyApplicationsTest extends TestCase
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
            'path' => 'cvs/sample_cv_' . fake()->uuid() . '.pdf',
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

    // ── Test Cases ────────────────────────────────────────────────────────────

    /**
     * Test 1: Happy path — company representative can fetch applications to
     * their own company's opportunities.
     */
    public function test_company_representative_can_fetch_own_company_applications(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $this->makeApplication($studentProfile, $opportunity, 'submitted');

        $response = $this->actingAs($repUser)
            ->getJson('/api/v1/company/applications');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'status',
                        'created_at',
                        'opportunity',
                        'student_profile' => ['id', 'student_number', 'gpa', 'major', 'user'],
                        'cv_file',
                    ],
                ],
                'meta' => ['current_page', 'last_page', 'per_page', 'total'],
            ]);

        $this->assertCount(1, $response->json('data'));
    }

    /**
     * Test 2: Company isolation — a representative NEVER sees another
     * company's applications, even without any filter applied.
     */
    public function test_never_returns_another_companys_applications(): void
    {
        [$repUserA, $companyA] = $this->createRepUser();
        [, $companyB] = $this->createRepUser();

        $oppA = $this->createOpportunity($companyA);
        $oppB = $this->createOpportunity($companyB);

        [, $profileA] = $this->createStudentUser();
        [, $profileB] = $this->createStudentUser();

        $this->makeApplication($profileA, $oppA, 'submitted');
        $this->makeApplication($profileB, $oppB, 'submitted');

        $response = $this->actingAs($repUserA)
            ->getJson('/api/v1/company/applications');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals($oppA->id, $response->json('data.0.opportunity_id'));
    }

    /**
     * Test 3: A representative cannot bypass company scoping by passing
     * another company's opportunity_id explicitly — filtered result is empty.
     */
    public function test_cannot_view_another_companys_opportunity_via_filter(): void
    {
        [$repUserA, $companyA] = $this->createRepUser();
        [, $companyB] = $this->createRepUser();

        $this->createOpportunity($companyA);
        $oppB = $this->createOpportunity($companyB);

        [, $profileB] = $this->createStudentUser();
        $this->makeApplication($profileB, $oppB, 'submitted');

        $response = $this->actingAs($repUserA)
            ->getJson('/api/v1/company/applications?opportunity_id=' . $oppB->id);

        $response->assertOk();
        $this->assertCount(0, $response->json('data'));
    }

    /**
     * Test 4: opportunity_id filter scoped to own company works correctly.
     */
    public function test_opportunity_filter_returns_only_matching_opportunity(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opp1 = $this->createOpportunity($company);
        $opp2 = $this->createOpportunity($company);

        [, $profile1] = $this->createStudentUser();
        [, $profile2] = $this->createStudentUser();

        $this->makeApplication($profile1, $opp1, 'submitted');
        $this->makeApplication($profile2, $opp2, 'submitted');

        $response = $this->actingAs($repUser)
            ->getJson('/api/v1/company/applications?opportunity_id=' . $opp1->id);

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals($opp1->id, $response->json('data.0.opportunity_id'));
    }

    /**
     * Test 5: status filter works correctly within the company's own scope.
     */
    public function test_status_filter_returns_only_matching_status(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opp1 = $this->createOpportunity($company);
        $opp2 = $this->createOpportunity($company);

        [, $profile1] = $this->createStudentUser();
        [, $profile2] = $this->createStudentUser();

        $this->makeApplication($profile1, $opp1, 'submitted');
        $this->makeApplication($profile2, $opp2, 'under_review');

        $response = $this->actingAs($repUser)
            ->getJson('/api/v1/company/applications?status=under_review');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertEquals('under_review', $response->json('data.0.status'));
    }

    /**
     * Test 6: Invalid status value returns 422.
     */
    public function test_invalid_status_value_returns_422(): void
    {
        [$repUser] = $this->createRepUser();

        $response = $this->actingAs($repUser)
            ->getJson('/api/v1/company/applications?status=garbage');

        $response->assertUnprocessable()
            ->assertJsonValidationErrorFor('status');
    }

    /**
     * Test 7: sort_by=status with sort_dir=asc changes ordering.
     */
    public function test_sorting_by_status_ascending(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opp1 = $this->createOpportunity($company);
        $opp2 = $this->createOpportunity($company);

        [, $profile1] = $this->createStudentUser();
        [, $profile2] = $this->createStudentUser();

        $this->makeApplication($profile1, $opp1, 'withdrawn');
        $this->makeApplication($profile2, $opp2, 'accepted');

        $response = $this->actingAs($repUser)
            ->getJson('/api/v1/company/applications?sort_by=status&sort_dir=asc');

        $response->assertOk();
        $statuses = collect($response->json('data'))->pluck('status')->all();
        $sorted = $statuses;
        sort($sorted);
        $this->assertEquals($sorted, $statuses);
    }

    /**
     * Test 8: default sorting is by submitted_at descending (newest first).
     */
    public function test_default_sort_is_submitted_at_descending(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opp = $this->createOpportunity($company);

        [, $profile1] = $this->createStudentUser();
        [, $profile2] = $this->createStudentUser();

        $older = $this->makeApplication($profile1, $opp, 'submitted');
        $older->created_at = now()->subDays(2);
        $older->submitted_at = now()->subDays(2);
        $older->save();

        $newer = $this->makeApplication($profile2, $opp, 'submitted');
        $newer->created_at = now();
        $newer->submitted_at = now();
        $newer->save();

        $response = $this->actingAs($repUser)
            ->getJson('/api/v1/company/applications');

        $response->assertOk();
        $this->assertEquals($newer->id, $response->json('data.0.id'));
    }

    /**
     * Test 8b: a reapplied application (existing row reused, created_at
     * stale) still sorts as newest because submitted_at is refreshed.
     */
    public function test_reapplied_application_sorts_as_newest_despite_old_created_at(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opp = $this->createOpportunity($company);

        [, $recentProfile] = $this->createStudentUser();
        $recent = $this->makeApplication($recentProfile, $opp, 'submitted');
        $recent->created_at = now()->subDay();
        $recent->submitted_at = now()->subDay();
        $recent->save();

        [, $reapplyingProfile] = $this->createStudentUser();
        $reapplied = $this->makeApplication($reapplyingProfile, $opp, 'withdrawn');
        // Simulate the original submission being long ago — the reapply
        // path (ApplicationController::store) never touches created_at.
        $reapplied->created_at = now()->subDays(30);
        $reapplied->submitted_at = now()->subDays(30);
        $reapplied->save();

        // Simulate the reapply path's own effect: only submitted_at moves.
        $reapplied->update(['status' => 'submitted', 'submitted_at' => now()]);

        $response = $this->actingAs($repUser)
            ->getJson('/api/v1/company/applications');

        $response->assertOk();
        $this->assertEquals($reapplied->id, $response->json('data.0.id'));
        $this->assertEquals($recent->id, $response->json('data.1.id'));
    }

    /**
     * Test 9: Unauthenticated request returns 401.
     */
    public function test_unauthenticated_request_returns_401(): void
    {
        $response = $this->getJson('/api/v1/company/applications');

        $response->assertUnauthorized();
    }

    /**
     * Test 10: A student hitting this endpoint gets 403.
     */
    public function test_student_cannot_access_company_applications(): void
    {
        [$studentUser] = $this->createStudentUser();

        $response = $this->actingAs($studentUser)
            ->getJson('/api/v1/company/applications');

        $response->assertForbidden();
    }

    /**
     * Test 11: An academic supervisor hitting this endpoint gets 403.
     */
    public function test_academic_supervisor_cannot_access_company_applications(): void
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
            ->getJson('/api/v1/company/applications');

        $response->assertForbidden();
    }

    /**
     * Test 12: A company_representative role user with no
     * CompanyRepresentative record returns 403.
     */
    public function test_representative_without_company_record_returns_403(): void
    {
        $user = User::factory()->create([
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $this->repRole->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/v1/company/applications');

        $response->assertForbidden();
    }

    /**
     * Test 13: Pagination works — 16 applications on page 1 returns 15, total=16.
     */
    public function test_pagination_works(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);

        for ($i = 0; $i < 16; $i++) {
            [, $profile] = $this->createStudentUser();
            $this->makeApplication($profile, $opportunity, 'submitted');
        }

        $response = $this->actingAs($repUser)
            ->getJson('/api/v1/company/applications?per_page=15');

        $response->assertOk();
        $this->assertCount(15, $response->json('data'));
        $this->assertEquals(16, $response->json('meta.total'));
        $this->assertEquals(2, $response->json('meta.last_page'));
    }

    /**
     * Test 14: Response includes eager-loaded student profile (name, major,
     * GPA) and cv_file so the reviewer can open the CV directly from the list.
     */
    public function test_response_includes_student_major_and_cv_file(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        [, $studentProfile] = $this->createStudentUser();
        $this->makeApplication($studentProfile, $opportunity, 'submitted');

        $response = $this->actingAs($repUser)
            ->getJson('/api/v1/company/applications');

        $response->assertOk()
            ->assertJsonPath('data.0.student_profile.major.id', $this->major->id)
            ->assertJsonPath('data.0.student_profile.gpa', '3.80');

        $this->assertNotNull($response->json('data.0.cv_file.url'));
    }

    /**
     * Test 15: Empty list when the company has no opportunities/applications yet.
     */
    public function test_empty_list_for_company_with_no_applications(): void
    {
        [$repUser] = $this->createRepUser();

        $response = $this->actingAs($repUser)
            ->getJson('/api/v1/company/applications');

        $response->assertOk()
            ->assertJsonPath('data', [])
            ->assertJsonPath('meta.total', 0);
    }
}
