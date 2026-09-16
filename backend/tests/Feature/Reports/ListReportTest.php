<?php

declare(strict_types=1);

namespace Tests\Feature\Reports;

use App\Models\Application;
use App\Models\Company;
use App\Models\CompanyRepresentative;
use App\Models\Department;
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

class ListReportTest extends TestCase
{
    use RefreshDatabase;

    private Role $studentRole;

    private Role $supervisorRole;

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
        $this->supervisorRole = Role::where('name', 'academic_supervisor')->firstOrFail();
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
            'name' => ['en' => 'Software Engineering', 'ar' => 'هندسة البرمجيات'],
            'code' => 'SWE',
            'is_active' => true,
        ]);

        $this->major = Major::create([
            'department_id' => $department->id,
            'name' => ['en' => 'Software Systems', 'ar' => 'أنظمة البرمجيات'],
            'code' => 'SS',
            'is_active' => true,
        ]);
    }

    private function createStudentUser(): array
    {
        $user = User::factory()->create();

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $this->studentRole->id,
        ]);

        $profile = StudentProfile::create([
            'user_id' => $user->id,
            'major_id' => $this->major->id,
            'student_number' => 'STU-'.fake()->unique()->numerify('######'),
            'national_id' => fake()->unique()->numerify('10########'),
            'gpa' => 3.5,
            'completed_credit_hours' => 90,
            'total_credit_hours' => 130,
            'academic_status' => 'enrolled',
        ]);

        return [$user, $profile];
    }

    private function createAssignmentFor(StudentProfile $profile, string $status = 'active'): TrainingAssignment
    {
        $company = Company::factory()->create(['status' => 'approved']);
        $repUser = User::factory()->create();

        UserRole::create([
            'user_id' => $repUser->id,
            'role_id' => $this->repRole->id,
        ]);

        CompanyRepresentative::create([
            'user_id' => $repUser->id,
            'company_id' => $company->id,
            'department' => 'Engineering',
            'position' => 'Manager',
        ]);

        $opp = Opportunity::create([
            'company_id' => $company->id,
            'opportunity_type_id' => $this->oppType->id,
            'title' => ['en' => 'Internship', 'ar' => 'تدريب'],
            'description' => ['en' => 'Desc', 'ar' => 'وصف'],
            'location' => 'Riyadh',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonths(3)->toDateString(),
            'application_deadline' => now()->addMonth()->toDateString(),
            'seats' => 5,
            'status' => 'published',
        ]);

        $app = Application::create([
            'student_profile_id' => $profile->id,
            'opportunity_id' => $opp->id,
            'status' => 'accepted',
            'applied_at' => now(),
        ]);

        return TrainingAssignment::create([
            'application_id' => $app->id,
            'student_profile_id' => $profile->id,
            'opportunity_id' => $opp->id,
            'company_id' => $company->id,
            'status' => $status,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonths(3)->toDateString(),
        ]);
    }

    public function test_guest_cannot_list_reports(): void
    {
        $this->getJson('/api/v1/reports')
            ->assertUnauthorized();
    }

    public function test_student_can_list_empty_reports(): void
    {
        [$user] = $this->createStudentUser();

        $this->actingAs($user)
            ->getJson('/api/v1/reports')
            ->assertOk()
            ->assertJsonPath('data', []);
    }

    public function test_student_sees_their_own_reports(): void
    {
        [$user, $profile] = $this->createStudentUser();
        $assignment = $this->createAssignmentFor($profile);

        Report::create([
            'training_assignment_id' => $assignment->id,
            'report_type_id' => $this->weeklyType->id,
            'title' => 'Weekly Report 1',
            'report_number' => 1,
            'content' => 'First week summary',
            'status' => 'draft',
            'version' => 1,
        ]);

        Report::create([
            'training_assignment_id' => $assignment->id,
            'report_type_id' => $this->weeklyType->id,
            'title' => 'Weekly Report 2',
            'report_number' => 2,
            'content' => 'Second week summary',
            'status' => 'submitted',
            'version' => 1,
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/v1/reports')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $response->assertJsonPath('data.0.title', 'Weekly Report 2');
        $response->assertJsonPath('data.1.title', 'Weekly Report 1');
    }

    public function test_student_cannot_see_other_students_reports(): void
    {
        [$user1, $profile1] = $this->createStudentUser();
        $assignment1 = $this->createAssignmentFor($profile1);

        [$user2, $profile2] = $this->createStudentUser();
        $assignment2 = $this->createAssignmentFor($profile2);

        Report::create([
            'training_assignment_id' => $assignment1->id,
            'report_type_id' => $this->weeklyType->id,
            'title' => 'Student 1 Report',
            'report_number' => 1,
            'content' => 'Student 1 Content',
            'status' => 'draft',
            'version' => 1,
        ]);

        Report::create([
            'training_assignment_id' => $assignment2->id,
            'report_type_id' => $this->weeklyType->id,
            'title' => 'Student 2 Report',
            'report_number' => 1,
            'content' => 'Student 2 Content',
            'status' => 'draft',
            'version' => 1,
        ]);

        $this->actingAs($user1)
            ->getJson('/api/v1/reports')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Student 1 Report');
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

    public function test_supervisor_only_sees_submitted_reports_and_not_drafts(): void
    {
        [$studentUser, $profile] = $this->createStudentUser();
        $supervisor = $this->createSupervisorUser();

        $assignment = $this->createAssignmentFor($profile);
        $assignment->update(['academic_supervisor_id' => $supervisor->id]);

        Report::create([
            'training_assignment_id' => $assignment->id,
            'report_type_id' => $this->weeklyType->id,
            'title' => 'Student Draft Report',
            'report_number' => 1,
            'content' => 'Draft in progress',
            'status' => 'draft',
            'version' => 1,
        ]);

        Report::create([
            'training_assignment_id' => $assignment->id,
            'report_type_id' => $this->weeklyType->id,
            'title' => 'Student Submitted Report',
            'report_number' => 2,
            'content' => 'Ready for review',
            'status' => 'submitted',
            'submitted_at' => now(),
            'version' => 1,
        ]);

        $response = $this->actingAs($supervisor)
            ->getJson('/api/v1/reports')
            ->assertOk();

        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.title', 'Student Submitted Report');
        $response->assertJsonPath('data.0.status', 'submitted');
    }
}
