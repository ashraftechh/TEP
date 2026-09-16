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
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/**
 * TEP-659 — Tests: Transition History Integrity (covers TEP-657's
 * GET /applications/{application}/transitions endpoint).
 *
 * Mirrors the helper conventions established in AcceptRejectApplicationTest /
 * ScheduleInterviewTest / WithdrawApplicationTest.
 */
class ApplicationTransitionHistoryTest extends TestCase
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

    // ─────────────────────────────────────────────────────────────────────────
    // Full lifecycle: every mutation path records exactly the expected row(s),
    // and the endpoint returns them in chronological order.
    // ─────────────────────────────────────────────────────────────────────────

    public function test_full_lifecycle_produces_expected_transitions_in_chronological_order(): void
    {
        [$studentUser, $studentProfile] = $this->createStudentUser();
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        $cvFile = $this->createCvFile($studentUser);

        // 1. Apply (initial transition: null -> submitted)
        $applyResponse = $this->actingAs($studentUser)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/applications", [
                'cv_file_id' => $cvFile->id,
            ]);
        $applyResponse->assertStatus(201);
        $applicationId = $applyResponse->json('data.id');

        // 2. Schedule interview (submitted -> interview_scheduled)
        $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$applicationId}/interview", [
                'interview_at' => now()->addDays(3)->toISOString(),
            ])->assertStatus(200);

        // 3. Accept (interview_scheduled -> accepted)
        $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$applicationId}/accept")
            ->assertStatus(200);

        // Assert exactly 3 transition rows exist, matching the final status chain.
        $this->assertSame(3, ApplicationTransition::where('application_id', $applicationId)->count());

        // Fetch history as the owning student.
        $response = $this->actingAs($studentUser)
            ->getJson("/api/v1/applications/{$applicationId}/transitions");

        $response->assertStatus(200);
        $data = $response->json('data');
        $this->assertCount(3, $data);

        // Chronological order.
        $this->assertNull($data[0]['from_status']);
        $this->assertSame('submitted', $data[0]['to_status']);
        $this->assertSame('submitted', $data[1]['from_status']);
        $this->assertSame('interview_scheduled', $data[1]['to_status']);
        $this->assertSame('interview_scheduled', $data[2]['from_status']);
        $this->assertSame('accepted', $data[2]['to_status']);

        // Actor identity + role are present so the student can distinguish
        // their own action (submit) from the company's (interview/accept).
        $this->assertSame($studentUser->id, $data[0]['actor']['id']);
        $this->assertContains('student', $data[0]['actor']['roles']);
        $this->assertSame($repUser->id, $data[1]['actor']['id']);
        $this->assertContains('company_representative', $data[1]['actor']['roles']);
        $this->assertSame($repUser->id, $data[2]['actor']['id']);
        $this->assertContains('company_representative', $data[2]['actor']['roles']);

        // Also fetchable by the owning company's representative.
        $this->actingAs($repUser)
            ->getJson("/api/v1/applications/{$applicationId}/transitions")
            ->assertStatus(200)
            ->assertJsonCount(3, 'data');
    }

    public function test_reschedule_does_not_produce_an_additional_transition_row(): void
    {
        [$studentUser, $studentProfile] = $this->createStudentUser();
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);

        $application = Application::factory()->create([
            'student_profile_id' => $studentProfile->id,
            'opportunity_id' => $opportunity->id,
            'status' => 'interview_scheduled',
            'interview_at' => now()->addDays(2),
        ]);

        // Seed the initial submitted->interview_scheduled transition directly,
        // mirroring what the real flow would have produced.
        ApplicationTransition::create([
            'application_id' => $application->id,
            'actor_id' => $repUser->id,
            'from_status' => 'submitted',
            'to_status' => 'interview_scheduled',
            'reason' => null,
        ]);

        $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$application->id}/interview", [
                'interview_at' => now()->addDays(5)->toISOString(),
            ])->assertStatus(200);

        // Still exactly one transition row — rescheduling updates interview_at
        // in place and does not touch application_transitions (to_status is
        // unchanged from the current status).
        $this->assertSame(
            1,
            ApplicationTransition::where('application_id', $application->id)->count()
        );

        $response = $this->actingAs($studentUser)
            ->getJson("/api/v1/applications/{$application->id}/transitions");

        $response->assertStatus(200)->assertJsonCount(1, 'data');
    }

    public function test_withdrawal_produces_expected_transition_row(): void
    {
        [$studentUser, $studentProfile] = $this->createStudentUser();
        [, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);

        $application = Application::factory()->create([
            'student_profile_id' => $studentProfile->id,
            'opportunity_id' => $opportunity->id,
            'status' => 'submitted',
        ]);

        $this->actingAs($studentUser)
            ->postJson("/api/v1/applications/{$application->id}/withdraw", [
                'reason' => 'Found another offer.',
            ])->assertStatus(200);

        $response = $this->actingAs($studentUser)
            ->getJson("/api/v1/applications/{$application->id}/transitions");

        $response->assertStatus(200)->assertJsonCount(1, 'data');
        $this->assertSame('submitted', $response->json('data.0.from_status'));
        $this->assertSame('withdrawn', $response->json('data.0.to_status'));
        $this->assertSame('Found another offer.', $response->json('data.0.reason'));
        $this->assertSame($studentUser->id, $response->json('data.0.actor.id'));
    }

    public function test_rejection_produces_expected_transition_row_with_reason(): void
    {
        [$studentUser, $studentProfile] = $this->createStudentUser();
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);

        $application = Application::factory()->create([
            'student_profile_id' => $studentProfile->id,
            'opportunity_id' => $opportunity->id,
            'status' => 'under_review',
        ]);

        $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$application->id}/reject", [
                'reason' => 'Does not meet minimum GPA requirement.',
            ])->assertStatus(200);

        $response = $this->actingAs($studentUser)
            ->getJson("/api/v1/applications/{$application->id}/transitions");

        $response->assertStatus(200)->assertJsonCount(1, 'data');
        $this->assertSame('under_review', $response->json('data.0.from_status'));
        $this->assertSame('rejected', $response->json('data.0.to_status'));
        $this->assertSame(
            'Does not meet minimum GPA requirement.',
            $response->json('data.0.reason')
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Ownership & auth on the history endpoint itself
    // ─────────────────────────────────────────────────────────────────────────

    public function test_a_student_cannot_view_another_students_application_history(): void
    {
        [, $ownerProfile] = $this->createStudentUser();
        [$otherStudentUser] = $this->createStudentUser();
        [, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);

        $application = Application::factory()->create([
            'student_profile_id' => $ownerProfile->id,
            'opportunity_id' => $opportunity->id,
            'status' => 'submitted',
        ]);

        $response = $this->actingAs($otherStudentUser)
            ->getJson("/api/v1/applications/{$application->id}/transitions");

        $response->assertStatus(403);
    }

    public function test_a_company_cannot_view_history_for_another_companys_application(): void
    {
        [, $studentProfile] = $this->createStudentUser();
        [, $ownerCompany] = $this->createRepUser();
        [$otherRepUser] = $this->createRepUser();
        $opportunity = $this->createOpportunity($ownerCompany);

        $application = Application::factory()->create([
            'student_profile_id' => $studentProfile->id,
            'opportunity_id' => $opportunity->id,
            'status' => 'submitted',
        ]);

        $response = $this->actingAs($otherRepUser)
            ->getJson("/api/v1/applications/{$application->id}/transitions");

        $response->assertStatus(403);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        [, $studentProfile] = $this->createStudentUser();
        [, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);

        $application = Application::factory()->create([
            'student_profile_id' => $studentProfile->id,
            'opportunity_id' => $opportunity->id,
            'status' => 'submitted',
        ]);

        $response = $this->getJson("/api/v1/applications/{$application->id}/transitions");

        $response->assertStatus(401);
    }

    public function test_a_non_existent_application_returns_404(): void
    {
        [$studentUser] = $this->createStudentUser();

        $response = $this->actingAs($studentUser)
            ->getJson('/api/v1/applications/999999/transitions');

        $response->assertStatus(404);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Append-only integrity (schema-level, not just behavioral)
    // ─────────────────────────────────────────────────────────────────────────

    public function test_application_transitions_table_has_no_updated_at_or_soft_delete_columns(): void
    {
        $this->assertFalse(Schema::hasColumn('application_transitions', 'updated_at'));
        $this->assertFalse(Schema::hasColumn('application_transitions', 'deleted_at'));
    }

    public function test_no_mutation_path_bypasses_the_shared_transition_action(): void
    {
        // Regression guard for TEP-657 point 1: every status-producing
        // endpoint in this sprint must go through
        // RecordApplicationTransitionAction, which is what this whole test
        // class exercises end-to-end above. This assertion simply confirms
        // the invariant that a transitioned application's row count always
        // matches the number of DISTINCT statuses it has actually held,
        // never fewer (a bypass would update applications.status without
        // leaving a row behind).
        [$studentUser, $studentProfile] = $this->createStudentUser();
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        $cvFile = $this->createCvFile($studentUser);

        $applyResponse = $this->actingAs($studentUser)
            ->postJson("/api/v1/opportunities/{$opportunity->id}/applications", [
                'cv_file_id' => $cvFile->id,
            ]);
        $applicationId = $applyResponse->json('data.id');

        $this->actingAs($repUser)
            ->postJson("/api/v1/applications/{$applicationId}/reject", ['reason' => 'Not a fit.'])
            ->assertStatus(200);

        $application = Application::find($applicationId);
        $this->assertSame('rejected', $application->status);
        $this->assertSame(
            2,
            ApplicationTransition::where('application_id', $applicationId)->count()
        );
    }
}
