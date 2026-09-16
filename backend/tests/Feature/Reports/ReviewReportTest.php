<?php

declare(strict_types=1);

namespace Tests\Feature\Reports;

use App\Models\Application;
use App\Models\Company;
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

class ReviewReportTest extends TestCase
{
    use RefreshDatabase;

    private Role $studentRole;

    private Role $supervisorRole;

    private Role $coordinatorRole;

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
        $this->supervisorRole = Role::where('name', 'academic_supervisor')->firstOrFail();
        $this->coordinatorRole = Role::where('name', 'training_coordinator')->firstOrFail();
        $this->weeklyType = ReportType::where('code', 'weekly')->firstOrFail();

        $this->oppType = OpportunityType::create([
            'name' => ['en' => 'Internship', 'ar' => 'تدريب تعاوني'],
            'code' => 'COOP',
            'is_active' => true,
        ]);

        $collegeId = DB::table('colleges')->insertGetId([
            'name' => json_encode(['en' => 'Faculty of Computing', 'ar' => 'كلية الحاسبات']),
            'code' => 'FCIT',
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

    protected function createSupervisorUser(): User
    {
        $user = User::factory()->create([
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $this->supervisorRole->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        return $user;
    }

    protected function createCoordinatorUser(): User
    {
        $user = User::factory()->create([
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $this->coordinatorRole->id,
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
            'title' => ['en' => 'Backend Trainee', 'ar' => 'متدرب'],
            'department' => ['en' => 'Tech', 'ar' => 'تقنية'],
            'description' => ['en' => 'Internship', 'ar' => 'تدريب'],
            'status' => 'published',
            'seats_count' => 5,
            'is_published' => true,
            'published_at' => now(),
        ]);
    }

    /**
     * @return array{0: TrainingAssignment, 1: User, 2: StudentProfile, 3: User}
     */
    protected function makeAssignmentWithSupervisor(?User $supervisor = null): array
    {
        $supervisor = $supervisor ?? $this->createSupervisorUser();
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
            'academic_supervisor_id' => $supervisor->id,
            'field_supervisor_id' => null,
            'training_coordinator_id' => null,
            'status' => 'active',
            'start_date' => now()->subMonth()->toDateString(),
            'end_date' => now()->addMonths(2)->toDateString(),
            'progress_percentage' => 0,
            'required_reports_count' => 4,
            'version' => 1,
        ]);

        return [$assignment, $studentUser, $studentProfile, $supervisor];
    }

    protected function makeReport(TrainingAssignment $assignment, string $status = 'submitted', int $number = 1): Report
    {
        return Report::create([
            'training_assignment_id' => $assignment->id,
            'title' => 'Week '.$number.' Report',
            'report_type_id' => $this->weeklyType->id,
            'report_number' => $number,
            'content' => 'Report content summary for review test.',
            'status' => $status,
            'version' => 1,
            'submitted_at' => $status === 'submitted' ? now() : null,
            'due_at' => now()->addDays(7),
        ]);
    }

    public function test_assigned_supervisor_can_approve_report_with_grade(): void
    {
        [$assignment, $student, $profile, $supervisor] = $this->makeAssignmentWithSupervisor();
        $report = $this->makeReport($assignment, 'submitted');

        $response = $this->actingAs($supervisor)
            ->postJson("/api/v1/reports/{$report->id}/review", [
                'decision' => 'approved',
                'feedback' => 'Great performance this week. Keep it up!',
                'grade' => 95,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.grade', '95.00')
            ->assertJsonPath('data.version', 2)
            ->assertJsonPath('data.feedback', 'Great performance this week. Keep it up!')
            ->assertJsonPath('message', __('reports.reviewed_successfully'));

        $this->assertDatabaseHas('reports', [
            'id' => $report->id,
            'status' => 'approved',
            'grade' => 95.00,
            'version' => 2,
        ]);

        $this->assertDatabaseHas('report_reviews', [
            'report_id' => $report->id,
            'reviewer_id' => $supervisor->id,
            'decision' => 'approved',
            'feedback' => 'Great performance this week. Keep it up!',
            'from_status' => 'submitted',
            'to_status' => 'approved',
        ]);
    }

    public function test_assigned_supervisor_can_reject_report_with_feedback(): void
    {
        [$assignment, $student, $profile, $supervisor] = $this->makeAssignmentWithSupervisor();
        $report = $this->makeReport($assignment, 'submitted');

        $response = $this->actingAs($supervisor)
            ->postJson("/api/v1/reports/{$report->id}/review", [
                'decision' => 'rejected',
                'feedback' => 'Report does not meet minimum technical depth requirements.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.grade', null)
            ->assertJsonPath('data.version', 2);

        $this->assertDatabaseHas('reports', [
            'id' => $report->id,
            'status' => 'rejected',
            'grade' => null,
            'version' => 2,
        ]);

        $this->assertDatabaseHas('report_reviews', [
            'report_id' => $report->id,
            'reviewer_id' => $supervisor->id,
            'decision' => 'rejected',
            'from_status' => 'submitted',
            'to_status' => 'rejected',
        ]);
    }

    public function test_assigned_supervisor_can_request_revision_on_report(): void
    {
        [$assignment, $student, $profile, $supervisor] = $this->makeAssignmentWithSupervisor();
        $report = $this->makeReport($assignment, 'submitted');

        $response = $this->actingAs($supervisor)
            ->postJson("/api/v1/reports/{$report->id}/review", [
                'decision' => 'revision_requested',
                'feedback' => 'Please add more details to the methodology section.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'revision_requested')
            ->assertJsonPath('data.version', 2);

        $this->assertDatabaseHas('reports', [
            'id' => $report->id,
            'status' => 'revision_requested',
            'version' => 2,
        ]);
    }

    public function test_approving_without_grade_returns_422(): void
    {
        [$assignment, $student, $profile, $supervisor] = $this->makeAssignmentWithSupervisor();
        $report = $this->makeReport($assignment, 'submitted');

        $this->actingAs($supervisor)
            ->postJson("/api/v1/reports/{$report->id}/review", [
                'decision' => 'approved',
                'feedback' => 'Looks good',
                'grade' => null,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['grade']);
    }

    public function test_rejecting_without_feedback_returns_422_with_specific_message(): void
    {
        [$assignment, $student, $profile, $supervisor] = $this->makeAssignmentWithSupervisor();
        $report = $this->makeReport($assignment, 'submitted');

        $this->actingAs($supervisor)
            ->postJson("/api/v1/reports/{$report->id}/review", [
                'decision' => 'rejected',
                'feedback' => '',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['feedback'])
            ->assertJsonPath('errors.feedback.0', __('reports.validation.feedback_required_reject'));
    }

    public function test_requesting_revision_without_feedback_returns_422_with_specific_message(): void
    {
        [$assignment, $student, $profile, $supervisor] = $this->makeAssignmentWithSupervisor();
        $report = $this->makeReport($assignment, 'submitted');

        $this->actingAs($supervisor)
            ->postJson("/api/v1/reports/{$report->id}/review", [
                'decision' => 'revision_requested',
                'feedback' => '',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['feedback'])
            ->assertJsonPath('errors.feedback.0', __('reports.validation.feedback_required_revision'));
    }

    public function test_approving_report_recalculates_assignment_progress_percentage(): void
    {
        [$assignment, $student, $profile, $supervisor] = $this->makeAssignmentWithSupervisor();
        // required_reports_count is 4
        $report1 = $this->makeReport($assignment, 'submitted', 1);
        $report2 = $this->makeReport($assignment, 'submitted', 2);

        // Approve report 1 -> 1 / 4 = 25%
        $this->actingAs($supervisor)
            ->postJson("/api/v1/reports/{$report1->id}/review", [
                'decision' => 'approved',
                'feedback' => 'Well done',
                'grade' => 90,
            ])
            ->assertOk();

        $assignment->refresh();
        $this->assertSame(25, (int) $assignment->progress_percentage);

        // Approve report 2 -> 2 / 4 = 50%
        $this->actingAs($supervisor)
            ->postJson("/api/v1/reports/{$report2->id}/review", [
                'decision' => 'approved',
                'feedback' => 'Excellent work',
                'grade' => 92,
            ])
            ->assertOk();

        $assignment->refresh();
        $this->assertSame(50, (int) $assignment->progress_percentage);
    }

    public function test_cannot_review_report_that_is_not_submitted(): void
    {
        [$assignment, $student, $profile, $supervisor] = $this->makeAssignmentWithSupervisor();

        $draftReport = $this->makeReport($assignment, 'draft');

        $this->actingAs($supervisor)
            ->postJson("/api/v1/reports/{$draftReport->id}/review", [
                'decision' => 'approved',
                'feedback' => 'Good draft',
                'grade' => 88,
            ])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'report_not_reviewable');
    }

    public function test_unassigned_supervisor_cannot_review_report_returns_403(): void
    {
        [$assignment, $student, $profile, $supervisor] = $this->makeAssignmentWithSupervisor();
        $otherSupervisor = $this->createSupervisorUser();
        $report = $this->makeReport($assignment, 'submitted');

        $this->actingAs($otherSupervisor)
            ->postJson("/api/v1/reports/{$report->id}/review", [
                'decision' => 'approved',
                'feedback' => 'Good',
                'grade' => 85,
            ])
            ->assertForbidden();
    }

    public function test_student_cannot_review_report_returns_403(): void
    {
        [$assignment, $student, $profile, $supervisor] = $this->makeAssignmentWithSupervisor();
        $report = $this->makeReport($assignment, 'submitted');

        $this->actingAs($student)
            ->postJson("/api/v1/reports/{$report->id}/review", [
                'decision' => 'approved',
                'feedback' => 'Good',
                'grade' => 100,
            ])
            ->assertForbidden();
    }

    public function test_unauthenticated_user_cannot_review_returns_401(): void
    {
        [$assignment, $student, $profile, $supervisor] = $this->makeAssignmentWithSupervisor();
        $report = $this->makeReport($assignment, 'submitted');

        $this->postJson("/api/v1/reports/{$report->id}/review", [
            'decision' => 'approved',
            'feedback' => 'Good',
            'grade' => 90,
        ])->assertUnauthorized();
    }

    public function test_reviews_history_endpoint_authorization_and_response(): void
    {
        [$assignment, $student, $profile, $supervisor] = $this->makeAssignmentWithSupervisor();
        $report = $this->makeReport($assignment, 'submitted');

        // Review it
        $this->actingAs($supervisor)
            ->postJson("/api/v1/reports/{$report->id}/review", [
                'decision' => 'revision_requested',
                'feedback' => 'First feedback',
            ])
            ->assertOk();

        // 1. Assigned supervisor can view reviews
        $response = $this->actingAs($supervisor)
            ->getJson("/api/v1/reports/{$report->id}/reviews")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.decision', 'revision_requested')
            ->assertJsonPath('data.0.feedback', 'First feedback')
            ->assertJsonPath('data.0.reviewer.id', $supervisor->id);

        // 2. Student owner can view reviews
        $this->actingAs($student)
            ->getJson("/api/v1/reports/{$report->id}/reviews")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        // 3. Coordinator can view reviews
        $coordinator = $this->createCoordinatorUser();
        $this->actingAs($coordinator)
            ->getJson("/api/v1/reports/{$report->id}/reviews")
            ->assertOk()
            ->assertJsonCount(1, 'data');

        // 4. Other student cannot view reviews
        [$otherStudent, $otherProfile] = $this->createStudentUser();
        $this->actingAs($otherStudent)
            ->getJson("/api/v1/reports/{$report->id}/reviews")
            ->assertForbidden();
    }

    public function test_supervisor_can_list_assigned_reports_with_filters(): void
    {
        [$assignment, $student, $profile, $supervisor] = $this->makeAssignmentWithSupervisor();
        $submittedReport = $this->makeReport($assignment, 'submitted', 1);
        $approvedReport = $this->makeReport($assignment, 'approved', 2);

        // Another assignment with different supervisor
        [$otherAssignment, $otherStudent, $otherProfile, $otherSupervisor] = $this->makeAssignmentWithSupervisor();
        $otherReport = $this->makeReport($otherAssignment, 'submitted', 1);

        // Supervisor lists assigned reports
        $response = $this->actingAs($supervisor)
            ->getJson('/api/v1/reports')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        // Filter by status
        $this->actingAs($supervisor)
            ->getJson('/api/v1/reports?status=submitted')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $submittedReport->id);

        // Filter by report type
        $this->actingAs($supervisor)
            ->getJson("/api/v1/reports?report_type_id={$this->weeklyType->id}")
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_full_resubmission_cycle_allows_reviewing_again(): void
    {
        [$assignment, $student, $profile, $supervisor] = $this->makeAssignmentWithSupervisor();
        $report = $this->makeReport($assignment, 'submitted', 1);

        // 1. Supervisor requests revision
        $this->actingAs($supervisor)
            ->postJson("/api/v1/reports/{$report->id}/review", [
                'decision' => 'revision_requested',
                'feedback' => 'Please provide more details on database indexing.',
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'revision_requested');

        $report->refresh();
        $this->assertSame('revision_requested', $report->status);

        // 2. Student updates and resubmits
        $this->actingAs($student)
            ->patchJson("/api/v1/reports/{$report->id}", [
                'content' => 'Updated content with comprehensive indexing benchmarks.',
            ])
            ->assertOk();

        $this->actingAs($student)
            ->postJson("/api/v1/reports/{$report->id}/submit")
            ->assertOk()
            ->assertJsonPath('data.status', 'submitted');

        $report->refresh();
        $this->assertSame('submitted', $report->status);

        // 3. Supervisor can review the resubmitted report and approve
        $this->actingAs($supervisor)
            ->postJson("/api/v1/reports/{$report->id}/review", [
                'decision' => 'approved',
                'feedback' => 'Excellent improvements made. Approved.',
                'grade' => 96,
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonPath('data.grade', '96.00');

        $report->refresh();
        $this->assertSame('approved', $report->status);
        $this->assertCount(2, $report->reviews);
    }
}
