<?php

declare(strict_types=1);

namespace Tests\Feature\Filament;

use App\Filament\Resources\AttendanceRecords\Pages\ListAttendanceRecords;
use App\Models\Application;
use App\Models\AttendanceRecord;
use App\Models\Company;
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
use Livewire\Livewire;
use Tests\TestCase;

class AttendanceRecordResourceTest extends TestCase
{
    use RefreshDatabase;

    private Role $coordinatorRole;

    private Major $major;

    private OpportunityType $oppType;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(PermissionSeeder::class);
        $this->seed(LookupSeeder::class);

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

    protected function createScenario(): array
    {
        $company = Company::factory()->approved()->create();
        $studentUser = User::factory()->create(['status' => 'active', 'email_verified_at' => now()]);
        $studentProfile = StudentProfile::create([
            'user_id' => $studentUser->id,
            'student_number' => 'STU999999',
            'major_id' => $this->major->id,
            'university_name' => 'Saba Region University',
            'level_year' => 4,
            'gpa' => 3.9,
        ]);

        $opp = Opportunity::create([
            'company_id' => $company->id,
            'opportunity_type_id' => $this->oppType->id,
            'title' => ['en' => 'QA Intern', 'ar' => 'متدرب جودة'],
            'department' => ['en' => 'Tech', 'ar' => 'تقنية'],
            'description' => ['en' => 'QA internship', 'ar' => 'تدريب جودة'],
            'status' => 'published',
            'seats_count' => 3,
            'is_published' => true,
            'published_at' => now(),
        ]);

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

        return [$assignment, $studentUser, $studentProfile, $company];
    }

    public function test_coordinator_can_render_attendance_records_list(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [$assignment, $studentUser] = $this->createScenario();

        $record = AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => '2026-09-05',
            'status' => 'present',
            'approval_status' => 'pending',
            'recorded_by' => $studentUser->id,
            'version' => 1,
        ]);

        Livewire::actingAs($coordinator)
            ->test(ListAttendanceRecords::class)
            ->assertSuccessful()
            ->assertSee('STU999999');
    }

    public function test_coordinator_can_approve_record_in_filament(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [$assignment, $studentUser] = $this->createScenario();

        $record = AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => '2026-09-05',
            'status' => 'present',
            'approval_status' => 'pending',
            'recorded_by' => $studentUser->id,
            'version' => 1,
        ]);

        Livewire::actingAs($coordinator)
            ->test(ListAttendanceRecords::class)
            ->callTableAction('approve', $record);

        $record->refresh();
        $this->assertSame(AttendanceRecord::APPROVAL_APPROVED, $record->approval_status);
        $this->assertSame($coordinator->id, $record->approved_by);
    }

    public function test_coordinator_can_reject_record_in_filament(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [$assignment, $studentUser] = $this->createScenario();

        $record = AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => '2026-09-05',
            'status' => 'absent',
            'reason' => 'Left early',
            'approval_status' => 'pending',
            'recorded_by' => $studentUser->id,
            'version' => 1,
        ]);

        Livewire::actingAs($coordinator)
            ->test(ListAttendanceRecords::class)
            ->callTableAction('reject', $record, [
                'reason' => 'Invalid justification provided',
            ]);

        $record->refresh();
        $this->assertSame(AttendanceRecord::APPROVAL_REJECTED, $record->approval_status);
        $this->assertSame('Invalid justification provided', $record->reason);
        $this->assertSame($coordinator->id, $record->approved_by);
    }

    public function test_attendance_records_has_status_tabs_matching_company_requests(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [$assignment, $studentUser] = $this->createScenario();

        $pendingRecord = AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => '2026-09-01',
            'status' => 'present',
            'approval_status' => 'pending',
            'recorded_by' => $studentUser->id,
            'version' => 1,
        ]);

        $approvedRecord = AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => '2026-09-02',
            'status' => 'present',
            'approval_status' => 'approved',
            'recorded_by' => $studentUser->id,
            'version' => 1,
        ]);

        $rejectedRecord = AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => '2026-09-03',
            'status' => 'absent',
            'approval_status' => 'rejected',
            'recorded_by' => $studentUser->id,
            'version' => 1,
        ]);

        Livewire::actingAs($coordinator)
            ->test(ListAttendanceRecords::class)
            ->assertCanSeeTableRecords([$pendingRecord, $approvedRecord, $rejectedRecord])
            ->set('activeTab', 'pending')
            ->assertCanSeeTableRecords([$pendingRecord])
            ->assertCanNotSeeTableRecords([$approvedRecord, $rejectedRecord])
            ->set('activeTab', 'approved')
            ->assertCanSeeTableRecords([$approvedRecord])
            ->assertCanNotSeeTableRecords([$pendingRecord, $rejectedRecord])
            ->set('activeTab', 'rejected')
            ->assertCanSeeTableRecords([$rejectedRecord])
            ->assertCanNotSeeTableRecords([$pendingRecord, $approvedRecord]);
    }

    public function test_coordinator_can_filter_attendance_records_by_company_and_student(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [$assignment1, $studentUser1, $studentProfile1, $company1] = $this->createScenario();

        // Build a completely independent second scenario so assignment2 gets its own
        // Application and never collides on the unique training_assignments.application_id constraint.
        $company2 = Company::factory()->approved()->create();
        $studentUser2 = User::factory()->create(['status' => 'active', 'email_verified_at' => now()]);
        $studentProfile2 = StudentProfile::create([
            'user_id' => $studentUser2->id,
            'student_number' => 'STU888888',
            'major_id' => $this->major->id,
            'university_name' => 'Saba Region University',
            'level_year' => 4,
            'gpa' => 3.5,
        ]);

        $opp2 = Opportunity::create([
            'company_id' => $company2->id,
            'opportunity_type_id' => $this->oppType->id,
            'title' => ['en' => 'Dev Intern', 'ar' => 'متدرب تطوير'],
            'department' => ['en' => 'Engineering', 'ar' => 'هندسة'],
            'description' => ['en' => 'Dev internship', 'ar' => 'تدريب تطوير'],
            'status' => 'published',
            'seats_count' => 2,
            'is_published' => true,
            'published_at' => now(),
        ]);

        $file2 = File::create([
            'uploader_id' => $studentUser2->id,
            'fileable_type' => User::class,
            'fileable_id' => $studentUser2->id,
            'purpose' => 'cv',
            'disk' => 'public',
            'path' => 'cvs/test2.pdf',
            'original_name' => 'test2.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 2048,
            'scan_status' => 'clean',
            'scanned_at' => now(),
        ]);

        $app2 = Application::create([
            'opportunity_id' => $opp2->id,
            'student_profile_id' => $studentProfile2->id,
            'cv_file_id' => $file2->id,
            'status' => 'accepted',
            'submitted_at' => now()->subDays(8),
            'version' => 1,
        ]);

        $assignment2 = TrainingAssignment::create([
            'application_id' => $app2->id,
            'student_profile_id' => $studentProfile2->id,
            'company_id' => $company2->id,
            'opportunity_id' => $opp2->id,
            'academic_supervisor_id' => null,
            'field_supervisor_id' => null,
            'training_coordinator_id' => null,
            'status' => 'active',
            'start_date' => now()->subMonth()->toDateString(),
            'end_date' => now()->addMonths(2)->toDateString(),
            'progress_percentage' => 10,
            'required_reports_count' => 12,
            'version' => 1,
        ]);

        $record1 = AttendanceRecord::create([
            'training_assignment_id' => $assignment1->id,
            'attendance_date' => '2026-09-01',
            'status' => 'present',
            'approval_status' => 'approved',
            'recorded_by' => $studentUser1->id,
            'version' => 1,
        ]);

        $record2 = AttendanceRecord::create([
            'training_assignment_id' => $assignment2->id,
            'attendance_date' => '2026-09-01',
            'status' => 'present',
            'approval_status' => 'approved',
            'recorded_by' => $studentUser2->id,
            'version' => 1,
        ]);

        Livewire::actingAs($coordinator)
            ->test(ListAttendanceRecords::class)
            ->assertCanSeeTableRecords([$record1, $record2])
            ->filterTable('company', (string) $company1->id)
            ->assertCanSeeTableRecords([$record1])
            ->assertCanNotSeeTableRecords([$record2])
            ->resetTableFilters()
            ->filterTable('student', (string) $studentProfile2->id)
            ->assertCanSeeTableRecords([$record2])
            ->assertCanNotSeeTableRecords([$record1]);
    }

    public function test_coordinator_searching_attendance_records_highlights_matching_text(): void
    {
        $coordinator = $this->createCoordinatorUser();
        [$assignment, $studentUser] = $this->createScenario();

        AttendanceRecord::create([
            'training_assignment_id' => $assignment->id,
            'attendance_date' => '2026-09-01',
            'status' => 'present',
            'approval_status' => 'pending',
            'recorded_by' => $studentUser->id,
            'version' => 1,
        ]);

        Livewire::actingAs($coordinator)
            ->test(ListAttendanceRecords::class)
            ->searchTable('STU999')
            ->assertSeeHtml('<mark style="background-color: rgba(253, 224, 71, 0.55); color: inherit; font-weight: 700; padding: 1px 3px; border-radius: 4px;">STU999</mark>');
    }
}
