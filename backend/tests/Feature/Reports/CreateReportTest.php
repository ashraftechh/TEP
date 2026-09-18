<?php

declare(strict_types=1);

namespace Tests\Feature\Reports;

use App\Models\Application;
use App\Models\Company;
use App\Models\CompanyRepresentative;
use App\Models\Department;
use App\Models\File;
use App\Models\Major;
use App\Models\Opportunity;
use App\Models\OpportunityType;
use App\Models\Report;
use App\Models\ReportType;
use App\Models\Role;
use App\Models\StudentProfile;
use App\Models\TrainingAssignment;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\ReportTypeSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CreateReportTest extends TestCase
{
    use RefreshDatabase;

    private Role $studentRole;

    private Role $repRole;

    private Major $major;

    private OpportunityType $oppType;

    private ReportType $weeklyType;

    private ReportType $finalType;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(PermissionSeeder::class);
        $this->seed(ReportTypeSeeder::class);

        $this->studentRole = Role::where('name', 'student')->firstOrFail();
        $this->repRole = Role::where('name', 'company_representative')->firstOrFail();
        $this->weeklyType = ReportType::where('code', 'weekly')->firstOrFail();
        $this->finalType = ReportType::where('code', 'final')->firstOrFail();

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

    protected function createRepUser(): User
    {
        $company = Company::factory()->approved()->create();
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

        return $user;
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

    protected function createOpportunity(Company $company): Opportunity
    {
        return Opportunity::create([
            'company_id' => $company->id,
            'opportunity_type_id' => $this->oppType->id,
            'training_cycle_id' => null,
            'created_by' => null,
            'title' => ['en' => 'Backend Developer Trainee', 'ar' => 'متدرب مطور خلفية'],
            'department' => ['en' => 'Technology', 'ar' => 'التقنية'],
            'description' => ['en' => 'Hands-on Laravel internship', 'ar' => 'تدريب عملي على لارافيل'],
            'status' => 'published',
            'seats_count' => 5,
            'is_published' => true,
            'published_at' => now(),
        ]);
    }

    /**
     * @return array{0: TrainingAssignment, 1: User, 2: StudentProfile}
     */
    protected function makeAssignment(string $status = 'active'): array
    {
        $company = Company::factory()->approved()->create();
        $opp = $this->createOpportunity($company);
        [$studentUser, $studentProfile] = $this->createStudentUser();
        $cv = $this->createCvFile($studentUser);

        $app = Application::create([
            'opportunity_id' => $opp->id,
            'student_profile_id' => $studentProfile->id,
            'cv_file_id' => $cv->id,
            'status' => 'accepted',
            'submitted_at' => now()->subDays(10),
            'version' => 1,
        ]);

        $assignment = TrainingAssignment::create([
            'application_id' => $app->id,
            'student_profile_id' => $studentProfile->id,
            'company_id' => $company->id,
            'opportunity_id' => $opp->id,
            'academic_supervisor_id' => null,
            'field_supervisor_id' => null,
            'training_coordinator_id' => null,
            'status' => $status,
            'start_date' => now()->subMonth()->toDateString(),
            'end_date' => now()->addMonths(2)->toDateString(),
            'progress_percentage' => 30,
            'required_reports_count' => 12,
            'version' => 1,
        ]);

        return [$assignment, $studentUser, $studentProfile];
    }

    public function test_student_with_active_assignment_creates_a_draft_report(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();

        $response = $this->actingAs($studentUser, 'sanctum')
            ->postJson('/api/v1/reports', [
                'report_type_id' => $this->weeklyType->id,
                'title' => 'Week 1 Report',
                'report_number' => 1,
                'content' => 'This week I onboarded onto the team.',
                'due_at' => '2026-10-15',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.training_assignment_id', $assignment->id)
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.version', 0)
            ->assertJsonPath('data.submitted_at', null);

        $this->assertDatabaseHas('reports', [
            'training_assignment_id' => $assignment->id,
            'report_type_id' => $this->weeklyType->id,
            'report_number' => 1,
            'status' => 'draft',
            'version' => 0,
        ]);
    }

    public function test_student_without_active_assignment_cannot_create_a_report(): void
    {
        [, $studentUser] = $this->makeAssignment(status: 'suspended');

        $response = $this->actingAs($studentUser, 'sanctum')
            ->postJson('/api/v1/reports', [
                'report_type_id' => $this->weeklyType->id,
                'title' => 'Week 1 Report',
                'report_number' => 1,
                'content' => 'Content here.',
                'due_at' => '2026-10-15',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'no_active_assignment');
    }

    public function test_duplicate_assignment_type_number_returns_409_conflict(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();

        Report::create([
            'training_assignment_id' => $assignment->id,
            'title' => 'Week 3 Report',
            'report_type_id' => $this->weeklyType->id,
            'report_number' => 3,
            'content' => 'Existing content.',
            'status' => 'draft',
            'version' => 0,
            'submitted_at' => null,
            'due_at' => '2026-10-15',
        ]);

        $response = $this->actingAs($studentUser, 'sanctum')
            ->postJson('/api/v1/reports', [
                'report_type_id' => $this->weeklyType->id,
                'title' => 'Week 3 Report (again)',
                'report_number' => 3,
                'content' => 'Duplicate attempt.',
                'due_at' => '2026-10-15',
            ]);

        $response->assertStatus(409)
            ->assertJsonPath('error_code', 'duplicate_report');
    }

    public function test_cannot_create_second_final_report_for_same_assignment(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();
        $finalType = ReportType::where('code', 'final')->firstOrFail();

        Report::create([
            'training_assignment_id' => $assignment->id,
            'title' => 'Final Report',
            'report_type_id' => $finalType->id,
            'report_number' => 1,
            'content' => 'Existing final report.',
            'status' => 'draft',
            'version' => 0,
            'submitted_at' => null,
            'due_at' => '2026-10-15',
        ]);

        $response = $this->actingAs($studentUser, 'sanctum')
            ->postJson('/api/v1/reports', [
                'report_type_id' => $finalType->id,
                'title' => 'Another Final Report',
                'report_number' => 2,
                'content' => 'Trying to create another final report.',
                'due_at' => '2026-10-15',
            ]);

        $response->assertStatus(409)
            ->assertJsonPath('error_code', 'duplicate_final_report');
    }

    public function test_non_student_role_cannot_create_a_report(): void
    {
        [$assignment] = $this->makeAssignment();
        $repUser = $this->createRepUser();

        $response = $this->actingAs($repUser, 'sanctum')
            ->postJson('/api/v1/reports', [
                'report_type_id' => $this->weeklyType->id,
                'title' => 'Week 1 Report',
                'report_number' => 1,
                'content' => 'Content here.',
                'due_at' => '2026-10-15',
            ]);

        $response->assertStatus(403);

        $this->assertDatabaseMissing('reports', [
            'training_assignment_id' => $assignment->id,
        ]);
    }

    public function test_validation_fails_for_missing_required_fields(): void
    {
        [, $studentUser] = $this->makeAssignment();

        $response = $this->actingAs($studentUser, 'sanctum')
            ->postJson('/api/v1/reports', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['report_type_id', 'title', 'report_number', 'content', 'due_at']);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->postJson('/api/v1/reports', [
            'report_type_id' => $this->weeklyType->id,
            'title' => 'Week 1 Report',
            'report_number' => 1,
            'content' => 'Content here.',
            'due_at' => '2026-10-15',
        ]);

        $response->assertStatus(401);
    }

    public function test_student_cannot_create_report_when_final_report_is_already_approved(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();

        Report::create([
            'training_assignment_id' => $assignment->id,
            'title' => 'Final Report',
            'report_type_id' => $this->finalType->id,
            'report_number' => 1,
            'content' => 'Final report content.',
            'status' => 'approved',
            'version' => 1,
            'submitted_at' => now()->subDay(),
            'approved_at' => now(),
        ]);

        $response = $this->actingAs($studentUser, 'sanctum')
            ->postJson('/api/v1/reports', [
                'report_type_id' => $this->weeklyType->id,
                'title' => 'Another Weekly Report',
                'report_number' => 5,
                'content' => 'Trying to create after final is approved.',
                'due_at' => '2026-10-15',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'training_completed');
    }

    public function test_student_cannot_create_report_for_disabled_report_type(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();

        $assignment->update([
            'report_configuration' => [
                'weekly' => ['enabled' => false, 'max_count' => 0],
                'final' => ['enabled' => true, 'max_count' => 1],
            ],
        ]);

        $response = $this->actingAs($studentUser, 'sanctum')
            ->postJson('/api/v1/reports', [
                'report_type_id' => $this->weeklyType->id,
                'title' => 'Disabled Weekly Report',
                'report_number' => 1,
                'content' => 'Trying to create disabled weekly report.',
                'due_at' => '2026-10-15',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'report_type_not_allowed');
    }

    public function test_student_cannot_exceed_report_type_quota(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();

        $assignment->update([
            'report_configuration' => [
                'weekly' => ['enabled' => true, 'max_count' => 2],
                'final' => ['enabled' => true, 'max_count' => 1],
            ],
            'required_reports_count' => 3,
        ]);

        // Create 2 existing weekly reports
        Report::create([
            'training_assignment_id' => $assignment->id,
            'title' => 'Week 1 Report',
            'report_type_id' => $this->weeklyType->id,
            'report_number' => 1,
            'content' => 'Report 1 content.',
            'status' => 'draft',
            'version' => 0,
        ]);

        Report::create([
            'training_assignment_id' => $assignment->id,
            'title' => 'Week 2 Report',
            'report_type_id' => $this->weeklyType->id,
            'report_number' => 2,
            'content' => 'Report 2 content.',
            'status' => 'submitted',
            'version' => 1,
        ]);

        // Try to create a 3rd weekly report
        $response = $this->actingAs($studentUser, 'sanctum')
            ->postJson('/api/v1/reports', [
                'report_type_id' => $this->weeklyType->id,
                'title' => 'Week 3 Report',
                'report_number' => 3,
                'content' => 'Exceeding quota content.',
                'due_at' => '2026-10-15',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'report_quota_exceeded');
    }

    public function test_student_cannot_create_report_with_number_exceeding_type_quota(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();

        $assignment->update([
            'report_configuration' => [
                'weekly' => ['enabled' => true, 'max_count' => 2],
                'final' => ['enabled' => true, 'max_count' => 1],
            ],
            'required_reports_count' => 3,
        ]);

        // Post report_number 5 when max_count is 2
        $response = $this->actingAs($studentUser, 'sanctum')
            ->postJson('/api/v1/reports', [
                'report_type_id' => $this->weeklyType->id,
                'title' => 'Week 5 Report',
                'report_number' => 5,
                'content' => 'Exceeding number limit.',
                'due_at' => '2026-10-15',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'report_quota_exceeded');
    }

    public function test_student_cannot_exceed_total_required_reports_count(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();

        $assignment->update([
            'required_reports_count' => 1,
        ]);

        Report::create([
            'training_assignment_id' => $assignment->id,
            'title' => 'Week 1 Report',
            'report_type_id' => $this->weeklyType->id,
            'report_number' => 1,
            'content' => 'Single allowed report.',
            'status' => 'submitted',
            'version' => 1,
        ]);

        $response = $this->actingAs($studentUser, 'sanctum')
            ->postJson('/api/v1/reports', [
                'report_type_id' => $this->weeklyType->id,
                'title' => 'Week 2 Report',
                'report_number' => 2,
                'content' => 'Exceeding total required reports.',
                'due_at' => '2026-10-15',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'report_quota_exceeded');
    }

    public function test_database_unique_constraint_prevents_duplicate_placement(): void
    {
        [$assignment] = $this->makeAssignment();

        Report::create([
            'training_assignment_id' => $assignment->id,
            'title' => 'Week 1 Report',
            'report_type_id' => $this->weeklyType->id,
            'report_number' => 1,
            'content' => 'First one.',
            'status' => 'draft',
            'version' => 0,
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);

        // Bypasses application-level checks entirely (direct DB insert) to
        // prove the constraint itself — not just ReportPlacementValidator
        // — is what ultimately guarantees uniqueness.
        DB::table('reports')->insert([
            'training_assignment_id' => $assignment->id,
            'title' => 'Duplicate Week 1 Report',
            'report_type_id' => $this->weeklyType->id,
            'report_number' => 1,
            'content' => 'Should collide.',
            'status' => 'draft',
            'version' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
