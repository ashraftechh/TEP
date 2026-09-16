<?php

declare(strict_types=1);

namespace Tests\Feature\Attendance;

use App\Models\Application;
use App\Models\AttendanceRecord;
use App\Models\Company;
use App\Models\CompanyRepresentative;
use App\Models\Department;
use App\Models\File;
use App\Models\Major;
use App\Models\Opportunity;
use App\Models\OpportunityType;
use App\Models\Role;
use App\Models\StudentProfile;
use App\Models\TrainingAssignment;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\LookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ViewAttendanceTest extends TestCase
{
    use RefreshDatabase;

    private Role $studentRole;

    private Role $repRole;

    private Role $academicSupervisorRole;

    private Role $coordinatorRole;

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
        $this->academicSupervisorRole = Role::where('name', 'academic_supervisor')->firstOrFail();
        $this->coordinatorRole = Role::where('name', 'training_coordinator')->firstOrFail();

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

    protected function createCoordinatorUser(): User
    {
        $user = User::factory()->create(['status' => 'active', 'email_verified_at' => now()]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $this->coordinatorRole->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        return $user;
    }

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

    protected function createAcademicSupervisorUser(): User
    {
        $user = User::factory()->create(['status' => 'active', 'email_verified_at' => now()]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $this->academicSupervisorRole->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        return $user;
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

    protected function makeAssignment(Company $company, ?User $academicSupervisor = null): array
    {
        $opp = $this->createOpportunity($company);
        [$studentUser, $studentProfile] = $this->createStudentUser();

        $file = File::create([
            'uploader_id' => $studentUser->id,
            'fileable_type' => User::class,
            'fileable_id' => $studentUser->id,
            'purpose' => 'cv',
            'disk' => 'public',
            'path' => 'cvs/test.pdf',
            'original_name' => 'test.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 1024,
            'scan_status' => 'clean',
            'scanned_at' => now(),
        ]);

        $app = Application::create([
            'opportunity_id' => $opp->id,
            'student_profile_id' => $studentProfile->id,
            'cv_file_id' => $file->id,
            'status' => 'accepted',
            'submitted_at' => now()->subDays(10),
            'version' => 1,
        ]);

        $assignment = TrainingAssignment::create([
            'application_id' => $app->id,
            'student_profile_id' => $studentProfile->id,
            'company_id' => $company->id,
            'opportunity_id' => $opp->id,
            'academic_supervisor_id' => $academicSupervisor?->id,
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

    public function test_company_rep_can_view_attendance_and_summary_for_their_assignment(): void
    {
        [$repUser, $company] = $this->createRepUser();
        [$assignment] = $this->makeAssignment($company);

        // Seed some attendance records
        AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => '2026-09-01',
            'status' => 'present',
            'approval_status' => 'approved',
            'recorded_by' => $repUser->id,
            'version' => 1,
        ]);

        AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => '2026-09-02',
            'status' => 'absent',
            'reason' => 'Sick',
            'approval_status' => 'pending',
            'recorded_by' => $repUser->id,
            'version' => 1,
        ]);

        $response = $this->actingAs($repUser, 'sanctum')
            ->getJson("/api/v1/training-assignments/{$assignment->id}/attendance");

        $response->assertStatus(200)
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('summary.total_days', 2)
            ->assertJsonPath('summary.present_days', 1)
            ->assertJsonPath('summary.absent_days', 1)
            ->assertJsonPath('summary.approved_count', 1)
            ->assertJsonPath('summary.pending_count', 1);
    }

    public function test_student_can_view_own_attendance_only(): void
    {
        [$repUser, $company] = $this->createRepUser();
        [$assignment1, $studentUser1] = $this->makeAssignment($company);
        [$assignment2, $studentUser2] = $this->makeAssignment($company);

        AttendanceRecord::create([
            'training_assignment_id' => $assignment1->id,
            'attendance_date' => '2026-09-01',
            'status' => 'present',
            'approval_status' => 'approved',
            'recorded_by' => $repUser->id,
            'version' => 1,
        ]);

        // Student 1 views own assignment
        $response1 = $this->actingAs($studentUser1, 'sanctum')
            ->getJson("/api/v1/training-assignments/{$assignment1->id}/attendance");

        $response1->assertStatus(200)
            ->assertJsonCount(1, 'data');

        // Student 1 tries to view Student 2's assignment -> 403
        $response2 = $this->actingAs($studentUser1, 'sanctum')
            ->getJson("/api/v1/training-assignments/{$assignment2->id}/attendance");

        $response2->assertStatus(403);
    }

    public function test_academic_supervisor_can_view_assigned_student_attendance(): void
    {
        $supervisor = $this->createAcademicSupervisorUser();
        [$repUser, $company] = $this->createRepUser();
        [$assignment] = $this->makeAssignment($company, academicSupervisor: $supervisor);

        AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => '2026-09-01',
            'status' => 'present',
            'approval_status' => 'pending',
            'recorded_by' => $repUser->id,
            'version' => 1,
        ]);

        $response = $this->actingAs($supervisor, 'sanctum')
            ->getJson("/api/v1/training-assignments/{$assignment->id}/attendance");

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_training_coordinator_can_view_any_attendance(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [$repUser, $company] = $this->createRepUser();
        [$assignment] = $this->makeAssignment($company);

        AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => '2026-09-01',
            'status' => 'present',
            'approval_status' => 'pending',
            'recorded_by' => $repUser->id,
            'version' => 1,
        ]);

        $response = $this->actingAs($coordinator, 'sanctum')
            ->getJson("/api/v1/training-assignments/{$assignment->id}/attendance");

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_rejected_attendance_records_are_excluded_from_active_summary_counts(): void
    {
        [$repUser, $company] = $this->createRepUser();
        [$assignment] = $this->makeAssignment($company);

        // 1 present (approved)
        AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => '2026-09-01',
            'status' => 'present',
            'approval_status' => 'approved',
            'recorded_by' => $repUser->id,
            'version' => 1,
        ]);

        // 1 absent (rejected by supervisor)
        AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => '2026-09-02',
            'status' => 'absent',
            'reason' => 'Disputed absence',
            'approval_status' => 'rejected',
            'recorded_by' => $repUser->id,
            'version' => 1,
        ]);

        // 1 excused (pending)
        AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => '2026-09-03',
            'status' => 'excused',
            'reason' => 'Exam',
            'approval_status' => 'pending',
            'recorded_by' => $repUser->id,
            'version' => 1,
        ]);

        $response = $this->actingAs($repUser, 'sanctum')
            ->getJson("/api/v1/training-assignments/{$assignment->id}/attendance");

        $response->assertStatus(200)
            ->assertJsonPath('summary.total_days', 3)
            ->assertJsonPath('summary.valid_days', 2)
            ->assertJsonPath('summary.present_days', 1)
            ->assertJsonPath('summary.absent_days', 0)
            ->assertJsonPath('summary.excused_days', 1)
            ->assertJsonPath('summary.rejected_count', 1);
    }
}
