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

class UpdateReportTest extends TestCase
{
    use RefreshDatabase;

    private Role $studentRole;

    private Role $repRole;

    private Major $major;

    private OpportunityType $oppType;

    private ReportType $weeklyType;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(PermissionSeeder::class);
        $this->seed(ReportTypeSeeder::class);

        $this->studentRole = Role::where('name', 'student')->firstOrFail();
        $this->repRole = Role::where('name', 'company_representative')->firstOrFail();
        $this->weeklyType = ReportType::where('code', 'weekly')->firstOrFail();

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
    protected function makeAssignment(): array
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
            'status' => 'active',
            'start_date' => now()->subMonth()->toDateString(),
            'end_date' => now()->addMonths(2)->toDateString(),
            'progress_percentage' => 30,
            'required_reports_count' => 12,
            'version' => 1,
        ]);

        return [$assignment, $studentUser, $studentProfile];
    }

    protected function makeReport(TrainingAssignment $assignment, string $status = 'draft', int $number = 1): Report
    {
        return Report::create([
            'training_assignment_id' => $assignment->id,
            'title' => 'Week '.$number.' Report',
            'report_type_id' => $this->weeklyType->id,
            'report_number' => $number,
            'content' => 'Original content.',
            'status' => $status,
            'version' => 0,
            'submitted_at' => $status === 'draft' ? null : now(),
        ]);
    }

    public function test_student_can_edit_their_own_draft_report(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();
        $report = $this->makeReport($assignment);

        $response = $this->actingAs($studentUser, 'sanctum')
            ->patchJson("/api/v1/reports/{$report->id}", [
                'title' => 'Week 1 Report (updated)',
                'content' => 'Updated content after review.',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.title', 'Week 1 Report (updated)')
            ->assertJsonPath('data.content', 'Updated content after review.')
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.version', 1);

        $this->assertDatabaseHas('reports', [
            'id' => $report->id,
            'title' => 'Week 1 Report (updated)',
            'version' => 1,
        ]);
    }

    /**
     * Behavior intentionally changed: a rejected report can now be edited
     * in place and resubmitted, the same as revision_requested, instead of
     * requiring a brand-new report to be created (see UpdateReportAction
     * doc comment).
     */
    public function test_student_can_edit_a_rejected_report(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();
        $report = $this->makeReport($assignment, status: 'rejected');

        $response = $this->actingAs($studentUser, 'sanctum')
            ->patchJson("/api/v1/reports/{$report->id}", [
                'title' => 'Week 1 Report (corrected)',
                'content' => 'Corrected content addressing the rejection feedback.',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.title', 'Week 1 Report (corrected)')
            ->assertJsonPath('data.content', 'Corrected content addressing the rejection feedback.')
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.version', 1);
    }

    public function test_editing_a_submitted_report_returns_422(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();
        $report = $this->makeReport($assignment, status: 'submitted');

        $response = $this->actingAs($studentUser, 'sanctum')
            ->patchJson("/api/v1/reports/{$report->id}", [
                'content' => 'Trying to edit after submission.',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'report_not_editable');

        $this->assertDatabaseHas('reports', [
            'id' => $report->id,
            'content' => 'Original content.',
        ]);
    }

    public function test_non_student_role_cannot_edit_a_report(): void
    {
        [$assignment] = $this->makeAssignment();
        $report = $this->makeReport($assignment);
        $repUser = $this->createRepUser();

        $response = $this->actingAs($repUser, 'sanctum')
            ->patchJson("/api/v1/reports/{$report->id}", [
                'content' => 'Not my report.',
            ]);

        $response->assertStatus(403);
    }

    public function test_student_cannot_edit_another_students_report(): void
    {
        [$assignment] = $this->makeAssignment();
        $report = $this->makeReport($assignment);
        [$otherStudentUser] = $this->createStudentUser();

        $response = $this->actingAs($otherStudentUser, 'sanctum')
            ->patchJson("/api/v1/reports/{$report->id}", [
                'content' => 'Not my report.',
            ]);

        $response->assertStatus(403);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        [$assignment] = $this->makeAssignment();
        $report = $this->makeReport($assignment);

        $response = $this->patchJson("/api/v1/reports/{$report->id}", [
            'content' => 'Anonymous edit attempt.',
        ]);

        $response->assertStatus(401);
    }

    public function test_changing_report_type_to_a_disabled_type_is_rejected(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();
        $assignment->update(['report_configuration' => ['weekly' => ['enabled' => false, 'max_count' => 0]]]);
        $report = $this->makeReport($assignment);

        $response = $this->actingAs($studentUser, 'sanctum')
            ->patchJson("/api/v1/reports/{$report->id}", [
                'report_type_id' => $this->weeklyType->id,
                'report_number' => 1,
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'report_type_not_allowed');
    }

    public function test_changing_report_number_to_collide_with_another_report_is_rejected(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();
        $this->makeReport($assignment, status: 'draft', number: 1);
        $reportTwo = $this->makeReport($assignment, status: 'draft', number: 2);

        $response = $this->actingAs($studentUser, 'sanctum')
            ->patchJson("/api/v1/reports/{$reportTwo->id}", [
                'report_number' => 1,
            ]);

        $response->assertStatus(409)
            ->assertJsonPath('error_code', 'duplicate_report');

        $this->assertDatabaseHas('reports', [
            'id' => $reportTwo->id,
            'report_number' => 2,
        ]);
    }

    public function test_editing_content_only_does_not_rerun_placement_validation(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();
        $this->makeReport($assignment, status: 'draft', number: 1);
        $reportTwo = $this->makeReport($assignment, status: 'draft', number: 2);

        // Same report_number as before (2) — no actual change — should not
        // trigger the duplicate check against itself.
        $response = $this->actingAs($studentUser, 'sanctum')
            ->patchJson("/api/v1/reports/{$reportTwo->id}", [
                'content' => 'Only the content changed.',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.content', 'Only the content changed.');
    }

    public function test_editing_a_report_on_a_completed_assignment_returns_422(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();
        $report = $this->makeReport($assignment);
        $assignment->update(['status' => 'completed']);

        $response = $this->actingAs($studentUser, 'sanctum')
            ->patchJson("/api/v1/reports/{$report->id}", [
                'content' => 'Trying to edit after the assignment ended.',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'assignment_not_active');

        $this->assertDatabaseHas('reports', [
            'id' => $report->id,
            'content' => 'Original content.',
        ]);
    }
}
