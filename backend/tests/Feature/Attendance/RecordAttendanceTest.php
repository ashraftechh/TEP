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

class RecordAttendanceTest extends TestCase
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

    protected function makeAssignment(Company $company, string $status = 'active'): array
    {
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

    public function test_company_representative_can_record_present_attendance_successfully(): void
    {
        [$repUser, $company] = $this->createRepUser();
        [$assignment] = $this->makeAssignment($company);

        $date = now()->subDays(1)->toDateString();

        $response = $this->actingAs($repUser, 'sanctum')
            ->postJson("/api/v1/training-assignments/{$assignment->id}/attendance", [
                'attendance_date' => $date,
                'status' => 'present',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.training_assignment_id', $assignment->id)
            ->assertJsonPath('data.attendance_date', $date)
            ->assertJsonPath('data.status', 'present')
            ->assertJsonPath('data.approval_status', 'pending')
            ->assertJsonPath('data.recorded_by', $repUser->id);

        $this->assertDatabaseHas('attendance_records', [
            'training_assignment_id' => $assignment->id,
            'attendance_date' => $date,
            'status' => 'present',
            'approval_status' => 'pending',
            'recorded_by' => $repUser->id,
        ]);
    }

    public function test_company_representative_can_record_absent_with_reason(): void
    {
        [$repUser, $company] = $this->createRepUser();
        [$assignment] = $this->makeAssignment($company);

        $date = now()->subDays(2)->toDateString();

        $response = $this->actingAs($repUser, 'sanctum')
            ->postJson("/api/v1/training-assignments/{$assignment->id}/attendance", [
                'attendance_date' => $date,
                'status' => 'absent',
                'reason' => 'Medical emergency',
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'absent')
            ->assertJsonPath('data.reason', 'Medical emergency');

        $this->assertDatabaseHas('attendance_records', [
            'training_assignment_id' => $assignment->id,
            'attendance_date' => $date,
            'status' => 'absent',
            'reason' => 'Medical emergency',
        ]);
    }

    public function test_recording_duplicate_date_returns_409_conflict(): void
    {
        [$repUser, $company] = $this->createRepUser();
        [$assignment] = $this->makeAssignment($company);

        $date = now()->subDays(1)->toDateString();

        AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => $date,
            'status' => 'present',
            'recorded_by' => $repUser->id,
            'approval_status' => 'pending',
            'version' => 1,
        ]);

        $response = $this->actingAs($repUser, 'sanctum')
            ->postJson("/api/v1/training-assignments/{$assignment->id}/attendance", [
                'attendance_date' => $date,
                'status' => 'late',
                'reason' => 'Late by 1 hour',
            ]);

        $response->assertStatus(409)
            ->assertJsonPath('error_code', 'attendance_already_recorded');
    }

    public function test_cannot_record_attendance_for_non_active_assignment(): void
    {
        [$repUser, $company] = $this->createRepUser();
        [$assignment] = $this->makeAssignment($company, status: 'suspended');

        $date = now()->subDays(1)->toDateString();

        $response = $this->actingAs($repUser, 'sanctum')
            ->postJson("/api/v1/training-assignments/{$assignment->id}/attendance", [
                'attendance_date' => $date,
                'status' => 'present',
            ]);

        $response->assertStatus(422)
            ->assertJsonPath('error_code', 'assignment_not_active');
    }

    public function test_reason_is_required_for_non_present_status(): void
    {
        [$repUser, $company] = $this->createRepUser();
        [$assignment] = $this->makeAssignment($company);

        $date = now()->subDays(1)->toDateString();

        $response = $this->actingAs($repUser, 'sanctum')
            ->postJson("/api/v1/training-assignments/{$assignment->id}/attendance", [
                'attendance_date' => $date,
                'status' => 'absent',
                // reason missing
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['reason']);
    }

    public function test_attendance_date_cannot_be_in_the_future(): void
    {
        [$repUser, $company] = $this->createRepUser();
        [$assignment] = $this->makeAssignment($company);

        $futureDate = now()->addDays(2)->toDateString();

        $response = $this->actingAs($repUser, 'sanctum')
            ->postJson("/api/v1/training-assignments/{$assignment->id}/attendance", [
                'attendance_date' => $futureDate,
                'status' => 'present',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['attendance_date']);
    }

    public function test_company_representative_cannot_record_for_another_companys_assignment(): void
    {
        [$repUser1, $company1] = $this->createRepUser();
        [$repUser2, $company2] = $this->createRepUser();

        [$assignmentCompany2] = $this->makeAssignment($company2);

        $response = $this->actingAs($repUser1, 'sanctum')
            ->postJson("/api/v1/training-assignments/{$assignmentCompany2->id}/attendance", [
                'attendance_date' => now()->toDateString(),
                'status' => 'present',
            ]);

        $response->assertStatus(403);
    }

    public function test_student_cannot_record_attendance(): void
    {
        [$repUser, $company] = $this->createRepUser();
        [$assignment, $studentUser] = $this->makeAssignment($company);

        $response = $this->actingAs($studentUser, 'sanctum')
            ->postJson("/api/v1/training-assignments/{$assignment->id}/attendance", [
                'attendance_date' => now()->toDateString(),
                'status' => 'present',
            ]);

        $response->assertStatus(403);
    }
}
