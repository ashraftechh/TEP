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

class SubmitReportTest extends TestCase
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
            'content' => 'Completed assigned tasks.',
            'status' => $status,
            'version' => 0,
            'submitted_at' => $status === 'draft' ? null : now(),
        ]);
    }

    public function test_student_can_submit_own_draft_report(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();
        $report = $this->makeReport($assignment, status: 'draft');

        $response = $this->actingAs($studentUser, 'sanctum')
            ->postJson("/api/v1/reports/{$report->id}/submit");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $report->id)
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonPath('data.version', 1);

        $report->refresh();
        $this->assertSame('submitted', $report->status);
        $this->assertNotNull($report->submitted_at);
        $this->assertSame(1, $report->version);
    }

    public function test_student_can_submit_revision_requested_report(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();
        $report = $this->makeReport($assignment, status: 'revision_requested');

        $response = $this->actingAs($studentUser, 'sanctum')
            ->postJson("/api/v1/reports/{$report->id}/submit");

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $report->id)
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonPath('data.version', 1);

        $report->refresh();
        $this->assertSame('submitted', $report->status);
        $this->assertNotNull($report->submitted_at);
    }

    public function test_submitting_already_submitted_report_returns_422(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();
        $report = $this->makeReport($assignment, status: 'submitted');

        $response = $this->actingAs($studentUser, 'sanctum')
            ->postJson("/api/v1/reports/{$report->id}/submit");

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'report_not_submittable');

        $report->refresh();
        $this->assertSame('submitted', $report->status);
    }

    public function test_submitting_approved_report_returns_422(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();
        $report = $this->makeReport($assignment, status: 'approved');

        $response = $this->actingAs($studentUser, 'sanctum')
            ->postJson("/api/v1/reports/{$report->id}/submit");

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'report_not_submittable');
    }

    /**
     * Behavior intentionally changed: a rejected report can now be
     * resubmitted directly, the same as revision_requested — rejected and
     * revision_requested differ only in severity signal to the student,
     * not in what they're allowed to do next (see UpdateReportAction /
     * SubmitReportAction doc comments).
     */
    public function test_submitting_rejected_report_succeeds(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();
        $report = $this->makeReport($assignment, status: 'rejected');

        $response = $this->actingAs($studentUser, 'sanctum')
            ->postJson("/api/v1/reports/{$report->id}/submit");

        $response->assertOk()
+            ->assertJsonPath('data.status', 'submitted');
    }

    public function test_submitting_under_review_report_returns_422(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();
        $report = $this->makeReport($assignment, status: 'under_review');

        $response = $this->actingAs($studentUser, 'sanctum')
            ->postJson("/api/v1/reports/{$report->id}/submit");

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'report_not_submittable');
    }

    public function test_student_cannot_submit_another_students_report(): void
    {
        [$assignment] = $this->makeAssignment();
        $report = $this->makeReport($assignment, status: 'draft');
        [$otherStudentUser] = $this->createStudentUser();

        $response = $this->actingAs($otherStudentUser, 'sanctum')
            ->postJson("/api/v1/reports/{$report->id}/submit");

        $response->assertStatus(403);
    }

    public function test_non_student_role_cannot_submit_report(): void
    {
        [$assignment] = $this->makeAssignment();
        $report = $this->makeReport($assignment, status: 'draft');
        $repUser = $this->createRepUser();

        $response = $this->actingAs($repUser, 'sanctum')
            ->postJson("/api/v1/reports/{$report->id}/submit");

        $response->assertStatus(403);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        [$assignment] = $this->makeAssignment();
        $report = $this->makeReport($assignment, status: 'draft');

        $response = $this->postJson("/api/v1/reports/{$report->id}/submit");

        $response->assertStatus(401);
    }

    public function test_student_cannot_submit_report_when_final_report_is_already_approved(): void
    {
        [$assignment, $studentUser] = $this->makeAssignment();
        $finalType = ReportType::where('code', 'final')->firstOrFail();

        // Create approved final report
        Report::create([
            'training_assignment_id' => $assignment->id,
            'title' => 'Final Report',
            'report_type_id' => $finalType->id,
            'report_number' => 1,
            'content' => 'Final report content.',
            'status' => 'approved',
            'version' => 1,
            'submitted_at' => now()->subDays(2),
            'approved_at' => now()->subDay(),
        ]);

        // A draft report from earlier
        $draftReport = $this->makeReport($assignment, status: 'draft');

        $response = $this->actingAs($studentUser, 'sanctum')
            ->postJson("/api/v1/reports/{$draftReport->id}/submit");

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'training_completed');
    }
}
