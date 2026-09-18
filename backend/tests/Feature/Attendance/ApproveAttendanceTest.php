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

class ApproveAttendanceTest extends TestCase
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

    public function test_academic_supervisor_can_approve_attendance_record(): void
    {
        $supervisor = $this->createAcademicSupervisorUser();
        [$repUser, $company] = $this->createRepUser();
        [$assignment] = $this->makeAssignment($company, academicSupervisor: $supervisor);

        $record = AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => now()->subDay()->toDateString(),
            'status' => 'present',
            'approval_status' => 'pending',
            'recorded_by' => $repUser->id,
            'version' => 1,
        ]);

        $response = $this->actingAs($supervisor, 'sanctum')
            ->patchJson("/api/v1/attendance-records/{$record->id}/approve");

        $response->assertStatus(200)
            ->assertJsonPath('data.approval_status', 'approved')
            ->assertJsonPath('data.approved_by', $supervisor->id);

        $this->assertDatabaseHas('attendance_records', [
            'id' => $record->id,
            'approval_status' => 'approved',
            'approved_by' => $supervisor->id,
        ]);
    }

    public function test_academic_supervisor_can_reject_attendance_record_with_reason(): void
    {
        $supervisor = $this->createAcademicSupervisorUser();
        [$repUser, $company] = $this->createRepUser();
        [$assignment] = $this->makeAssignment($company, academicSupervisor: $supervisor);

        $record = AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => now()->subDay()->toDateString(),
            'status' => 'absent',
            'reason' => 'No show',
            'approval_status' => 'pending',
            'recorded_by' => $repUser->id,
            'version' => 1,
        ]);

        $response = $this->actingAs($supervisor, 'sanctum')
            ->patchJson("/api/v1/attendance-records/{$record->id}/reject", [
                'reason' => 'Unexcused absence without prior notice',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.approval_status', 'rejected')
            ->assertJsonPath('data.reason', 'Unexcused absence without prior notice')
            ->assertJsonPath('data.approved_by', $supervisor->id);

        $this->assertDatabaseHas('attendance_records', [
            'id' => $record->id,
            'approval_status' => 'rejected',
            'reason' => 'Unexcused absence without prior notice',
            'approved_by' => $supervisor->id,
        ]);
    }

    public function test_rejecting_without_reason_returns_422(): void
    {
        $supervisor = $this->createAcademicSupervisorUser();
        [$repUser, $company] = $this->createRepUser();
        [$assignment] = $this->makeAssignment($company, academicSupervisor: $supervisor);

        $record = AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => now()->subDay()->toDateString(),
            'status' => 'absent',
            'approval_status' => 'pending',
            'recorded_by' => $repUser->id,
            'version' => 1,
        ]);

        $response = $this->actingAs($supervisor, 'sanctum')
            ->patchJson("/api/v1/attendance-records/{$record->id}/reject", [
                // reason missing
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);
    }

    public function test_academic_supervisor_cannot_approve_unassigned_student_attendance(): void
    {
        $supervisor1 = $this->createAcademicSupervisorUser();
        $supervisor2 = $this->createAcademicSupervisorUser();
        [$repUser, $company] = $this->createRepUser();
        [$assignment] = $this->makeAssignment($company, academicSupervisor: $supervisor2);

        $record = AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => now()->subDay()->toDateString(),
            'status' => 'present',
            'approval_status' => 'pending',
            'recorded_by' => $repUser->id,
            'version' => 1,
        ]);

        $response = $this->actingAs($supervisor1, 'sanctum')
            ->patchJson("/api/v1/attendance-records/{$record->id}/approve");

        $response->assertStatus(403);
    }

    public function test_training_coordinator_can_approve_and_reject_attendance(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [$repUser, $company] = $this->createRepUser();
        [$assignment] = $this->makeAssignment($company);

        $record = AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => now()->subDay()->toDateString(),
            'status' => 'present',
            'approval_status' => 'pending',
            'recorded_by' => $repUser->id,
            'version' => 1,
        ]);

        $response = $this->actingAs($coordinator, 'sanctum')
            ->patchJson("/api/v1/attendance-records/{$record->id}/approve");

        $response->assertStatus(200)
            ->assertJsonPath('data.approval_status', 'approved')
            ->assertJsonPath('data.approved_by', $coordinator->id);
    }

    public function test_approving_an_already_approved_record_returns_422(): void
    {
        $supervisor = $this->createAcademicSupervisorUser();
        [$repUser, $company] = $this->createRepUser();
        [$assignment] = $this->makeAssignment($company, academicSupervisor: $supervisor);

        $record = AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => now()->subDay()->toDateString(),
            'status' => 'present',
            'approval_status' => 'approved',
            'recorded_by' => $repUser->id,
            'approved_by' => $supervisor->id,
            'approved_at' => now()->subHour(),
            'version' => 2,
        ]);

        $response = $this->actingAs($supervisor, 'sanctum')
            ->patchJson("/api/v1/attendance-records/{$record->id}/approve");

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'attendance_record_not_reviewable');
    }

    public function test_rejecting_an_already_approved_record_returns_422(): void
    {
        $supervisor = $this->createAcademicSupervisorUser();
        [$repUser, $company] = $this->createRepUser();
        [$assignment] = $this->makeAssignment($company, academicSupervisor: $supervisor);

        $record = AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => now()->subDay()->toDateString(),
            'status' => 'present',
            'approval_status' => 'approved',
            'recorded_by' => $repUser->id,
            'approved_by' => $supervisor->id,
            'approved_at' => now()->subHour(),
            'version' => 2,
        ]);

        $response = $this->actingAs($supervisor, 'sanctum')
            ->patchJson("/api/v1/attendance-records/{$record->id}/reject", [
                'reason' => 'Trying to flip an already-decided record.',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'attendance_record_not_reviewable');

        $this->assertDatabaseHas('attendance_records', [
            'id' => $record->id,
            'approval_status' => 'approved',
        ]);
    }

    public function test_approving_an_already_rejected_record_returns_422(): void
    {
        $supervisor = $this->createAcademicSupervisorUser();
        [$repUser, $company] = $this->createRepUser();
        [$assignment] = $this->makeAssignment($company, academicSupervisor: $supervisor);

        $record = AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => now()->subDay()->toDateString(),
            'status' => 'absent',
            'approval_status' => 'rejected',
            'reason' => 'Originally rejected.',
            'recorded_by' => $repUser->id,
            'approved_by' => $supervisor->id,
            'approved_at' => now()->subHour(),
            'version' => 2,
        ]);

        $response = $this->actingAs($supervisor, 'sanctum')
            ->patchJson("/api/v1/attendance-records/{$record->id}/approve");

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'attendance_record_not_reviewable');
    }
}
