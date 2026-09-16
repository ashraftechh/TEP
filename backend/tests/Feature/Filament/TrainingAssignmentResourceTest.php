<?php

declare(strict_types=1);

namespace Tests\Feature\Filament;

use App\Filament\Resources\TrainingAssignments\Pages\CreateTrainingAssignment;
use App\Filament\Resources\TrainingAssignments\Pages\EditTrainingAssignment;
use App\Filament\Resources\TrainingAssignments\Pages\ListTrainingAssignments;
use App\Filament\Resources\TrainingAssignments\Schemas\TrainingAssignmentForm;
use App\Filament\Resources\TrainingAssignments\TrainingAssignmentResource;
use App\Models\Application;
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
use Livewire\Livewire;
use ReflectionMethod;
use Tests\TestCase;

/**
 * TEP-663 — Tests: Create Training Assignment (Filament/TEP-662 portion).
 */
class TrainingAssignmentResourceTest extends TestCase
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

    // ── Helpers (mirrors tests/Feature/TrainingAssignments/CreateTrainingAssignmentTest.php) ──

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

    protected function createStudentUser(): User
    {
        $user = User::factory()->create(['status' => 'active', 'email_verified_at' => now()]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $this->studentRole->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        return $user;
    }

    protected function createRepUser(?Company $company = null): array
    {
        $company ??= Company::factory()->approved()->create();

        $user = User::factory()->create(['status' => 'active', 'email_verified_at' => now()]);

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

    protected function createStudentProfileFor(User $user): StudentProfile
    {
        return StudentProfile::create([
            'user_id' => $user->id,
            'student_number' => fake()->unique()->numerify('STU######'),
            'major_id' => $this->major->id,
            'university_name' => 'Saba Region University',
            'level_year' => 4,
            'gpa' => 3.8,
        ]);
    }

    protected function createOpportunity(Company $company): Opportunity
    {
        $id = DB::table('opportunities')->insertGetId([
            'company_id' => $company->id,
            'opportunity_type_id' => $this->oppType->id,
            'training_cycle_id' => null,
            'created_by' => null,
            'title' => json_encode(['en' => 'Backend Developer Trainee', 'ar' => 'متدرب مطور خلفية']),
            'department' => json_encode(['en' => 'Technology', 'ar' => 'التقنية']),
            'description' => json_encode(['en' => 'Hands-on Laravel internship', 'ar' => 'تدريب عملي على لارافيل']),
            'work_mode' => 'full_time',
            'location' => "Sana'a",
            'duration' => '3 months',
            'capacity' => 5,
            'accepted_count' => 0,
            'status' => 'published',
            'version' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return Opportunity::findOrFail($id);
    }

    protected function makeApplication(StudentProfile $profile, Opportunity $opportunity, string $status = 'accepted'): Application
    {
        $cvFile = File::create([
            'uploader_id' => $profile->user_id,
            'fileable_type' => User::class,
            'fileable_id' => $profile->user_id,
            'purpose' => 'cv',
            'disk' => 'public',
            'path' => 'cvs/sample_cv_' . fake()->uuid() . '.pdf',
            'original_name' => 'my_resume.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 1024 * 300,
            'scan_status' => 'clean',
            'scanned_at' => now(),
        ]);

        return Application::create([
            'opportunity_id' => $opportunity->id,
            'student_profile_id' => $profile->id,
            'cv_file_id' => $cvFile->id,
            'status' => $status,
            'version' => 0,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Panel access control
    // ─────────────────────────────────────────────────────────────────────────

    public function test_student_cannot_access_training_assignment_resource(): void
    {
        $student = $this->createStudentUser();

        $response = $this->actingAs($student)->get('/admin/training-assignments');

        $response->assertStatus(403);
    }

    public function test_training_coordinator_can_access_training_assignment_resource(): void
    {
        $coordinator = $this->createCoordinatorUser();

        $response = $this->actingAs($coordinator)->get('/admin/training-assignments');

        $response->assertStatus(200);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Application picker only lists accepted, not-yet-assigned applications
    // ─────────────────────────────────────────────────────────────────────────

    public function test_application_picker_only_lists_accepted_unassigned_applications(): void
    {
        [, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);

        $acceptedUnassignedStudent = $this->createStudentUser();
        $acceptedUnassignedProfile = $this->createStudentProfileFor($acceptedUnassignedStudent);
        $acceptedUnassignedApplication = $this->makeApplication($acceptedUnassignedProfile, $opportunity, 'accepted');

        $submittedStudent = $this->createStudentUser();
        $submittedProfile = $this->createStudentProfileFor($submittedStudent);
        $this->makeApplication($submittedProfile, $opportunity, 'submitted');

        $rejectedStudent = $this->createStudentUser();
        $rejectedProfile = $this->createStudentProfileFor($rejectedStudent);
        $this->makeApplication($rejectedProfile, $opportunity, 'rejected');

        // Accepted, but ALREADY formalised into an assignment — must be excluded too.
        $alreadyAssignedStudent = $this->createStudentUser();
        $alreadyAssignedProfile = $this->createStudentProfileFor($alreadyAssignedStudent);
        $alreadyAssignedApplication = $this->makeApplication($alreadyAssignedProfile, $opportunity, 'accepted');

        $coordinator = $this->createCoordinatorUser();
        $academicSupervisor = $this->createAcademicSupervisorUser();
        [$repUser] = $this->createRepUser($company);

        TrainingAssignment::create([
            'application_id' => $alreadyAssignedApplication->id,
            'student_profile_id' => $alreadyAssignedProfile->id,
            'company_id' => $company->id,
            'opportunity_id' => $opportunity->id,
            'academic_supervisor_id' => $academicSupervisor->id,
            'field_supervisor_id' => $repUser->id,
            'training_coordinator_id' => $coordinator->id,
            'status' => 'active',
            'start_date' => now(),
            'end_date' => now()->addMonths(3),
            'progress_percentage' => 0,
            'required_reports_count' => 4,
            'version' => 1,
        ]);

        $method = new ReflectionMethod(TrainingAssignmentForm::class, 'unassignedAcceptedApplicationOptions');
        $method->setAccessible(true);
        $options = $method->invoke(null);

        $this->assertArrayHasKey($acceptedUnassignedApplication->id, $options);
        $this->assertArrayNotHasKey($alreadyAssignedApplication->id, $options);
        $this->assertCount(1, $options);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // End-to-end creation through the Filament form
    // ─────────────────────────────────────────────────────────────────────────

    public function test_coordinator_can_create_training_assignment_via_filament_form(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        $studentUser = $this->createStudentUser();
        $studentProfile = $this->createStudentProfileFor($studentUser);
        $application = $this->makeApplication($studentProfile, $opportunity, 'accepted');
        $academicSupervisor = $this->createAcademicSupervisorUser();
        $coordinator = $this->createCoordinatorUser();

        $this->actingAs($coordinator);

        Livewire::test(CreateTrainingAssignment::class)
            ->fillForm([
                'application_id' => $application->id,
                'academic_supervisor_id' => $academicSupervisor->id,
                'field_supervisor_id' => $repUser->id,
                'start_date' => now()->addDay()->toDateString(),
                'end_date' => now()->addMonths(3)->toDateString(),
                'required_reports_count' => 4,
            ])
            ->call('create')
            ->assertHasNoFormErrors()
            ->assertRedirect(TrainingAssignmentResource::getUrl('index'));

        $this->assertDatabaseHas('training_assignments', [
            'application_id' => $application->id,
            'academic_supervisor_id' => $academicSupervisor->id,
            'field_supervisor_id' => $repUser->id,
            'training_coordinator_id' => $coordinator->id,
            'company_id' => $company->id,
            'opportunity_id' => $opportunity->id,
            'status' => 'active',
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // start_date/end_date are required on THIS form (UI-level rule — the
    // underlying columns stay nullable for other creation paths, e.g. the API)
    // ─────────────────────────────────────────────────────────────────────────

    public function test_form_requires_start_and_end_date(): void
    {
        [, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        $studentUser = $this->createStudentUser();
        $studentProfile = $this->createStudentProfileFor($studentUser);
        $application = $this->makeApplication($studentProfile, $opportunity, 'accepted');
        $coordinator = $this->createCoordinatorUser();

        $this->actingAs($coordinator);

        Livewire::test(CreateTrainingAssignment::class)
            ->fillForm([
                'application_id' => $application->id,
                'start_date' => null,
                'end_date' => null,
            ])
            ->call('create')
            ->assertHasFormErrors(['start_date' => 'required', 'end_date' => 'required']);

        $this->assertDatabaseMissing('training_assignments', ['application_id' => $application->id]);
    }

    public function test_coordinator_searching_assignments_highlights_matching_text(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        $studentUser = $this->createStudentUser();
        $studentProfile = $this->createStudentProfileFor($studentUser);
        $application = $this->makeApplication($studentProfile, $opportunity, 'accepted');
        $coordinator = $this->createCoordinatorUser();

        TrainingAssignment::create([
            'application_id' => $application->id,
            'student_profile_id' => $studentProfile->id,
            'company_id' => $company->id,
            'opportunity_id' => $opportunity->id,
            'academic_supervisor_id' => null,
            'field_supervisor_id' => $repUser->id,
            'training_coordinator_id' => $coordinator->id,
            'status' => 'active',
            'start_date' => now(),
            'end_date' => now()->addMonths(3),
            'progress_percentage' => 0,
            'required_reports_count' => 4,
            'version' => 1,
        ]);

        $searchSnippet = mb_substr($studentUser->name, 0, 3);

        Livewire::actingAs($coordinator)
            ->test(ListTrainingAssignments::class)
            ->searchTable($searchSnippet)
            ->assertSeeHtml('<mark style="background-color: rgba(253, 224, 71, 0.55); color: inherit; font-weight: 700; padding: 1px 3px; border-radius: 4px;">');
    }

    public function test_coordinator_can_access_edit_training_assignment_page(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        $studentUser = $this->createStudentUser();
        $studentProfile = $this->createStudentProfileFor($studentUser);
        $application = $this->makeApplication($studentProfile, $opportunity, 'accepted');
        $coordinator = $this->createCoordinatorUser();

        $assignment = TrainingAssignment::create([
            'application_id' => $application->id,
            'student_profile_id' => $studentProfile->id,
            'company_id' => $company->id,
            'opportunity_id' => $opportunity->id,
            'academic_supervisor_id' => null,
            'field_supervisor_id' => $repUser->id,
            'training_coordinator_id' => $coordinator->id,
            'status' => 'active',
            'start_date' => now(),
            'end_date' => now()->addMonths(3),
            'progress_percentage' => 0,
            'required_reports_count' => 4,
            'version' => 1,
        ]);

        $response = $this->actingAs($coordinator)->get("/admin/training-assignments/{$assignment->id}/edit");

        $response->assertStatus(200);
    }

    public function test_coordinator_can_edit_training_assignment_via_filament_form(): void
    {
        [$repUser, $company] = $this->createRepUser();
        [$secondRep] = $this->createRepUser($company);
        $opportunity = $this->createOpportunity($company);
        $studentUser = $this->createStudentUser();
        $studentProfile = $this->createStudentProfileFor($studentUser);
        $application = $this->makeApplication($studentProfile, $opportunity, 'accepted');
        $academicSupervisor1 = $this->createAcademicSupervisorUser();
        $academicSupervisor2 = $this->createAcademicSupervisorUser();
        $coordinator = $this->createCoordinatorUser();

        $assignment = TrainingAssignment::create([
            'application_id' => $application->id,
            'student_profile_id' => $studentProfile->id,
            'company_id' => $company->id,
            'opportunity_id' => $opportunity->id,
            'academic_supervisor_id' => $academicSupervisor1->id,
            'field_supervisor_id' => $repUser->id,
            'training_coordinator_id' => $coordinator->id,
            'status' => 'active',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonths(3)->toDateString(),
            'progress_percentage' => 0,
            'required_reports_count' => 4,
            'report_configuration' => [
                'daily' => ['enabled' => false, 'max_count' => 0],
                'weekly' => ['enabled' => true, 'max_count' => 4],
                'monthly' => ['enabled' => false, 'max_count' => 0],
                'final' => ['enabled' => false, 'max_count' => 0],
            ],
            'version' => 1,
        ]);

        $this->actingAs($coordinator);

        $newStartDate = now()->addDays(2)->toDateString();
        $newEndDate = now()->addMonths(4)->toDateString();

        Livewire::test(EditTrainingAssignment::class, ['record' => $assignment->getRouteKey()])
            ->fillForm([
                'academic_supervisor_id' => $academicSupervisor2->id,
                'field_supervisor_id' => $secondRep->id,
                'start_date' => $newStartDate,
                'end_date' => $newEndDate,
                'daily_enabled' => true,
                'daily_count' => 10,
                'weekly_enabled' => true,
                'weekly_count' => 8,
                'monthly_enabled' => true,
                'monthly_count' => 2,
                'final_enabled' => true,
                'required_reports_count' => 21,
            ])
            ->call('save')
            ->assertHasNoFormErrors();

        $assignment->refresh();

        $this->assertSame($academicSupervisor2->id, $assignment->academic_supervisor_id);
        $this->assertSame($secondRep->id, $assignment->field_supervisor_id);
        $this->assertSame($newStartDate, $assignment->start_date->toDateString());
        $this->assertSame($newEndDate, $assignment->end_date->toDateString());
        $this->assertSame(21, $assignment->required_reports_count);
        $this->assertTrue($assignment->isReportTypeEnabled('daily'));
        $this->assertSame(10, $assignment->getReportTypeMaxCount('daily'));
        $this->assertTrue($assignment->isReportTypeEnabled('weekly'));
        $this->assertSame(8, $assignment->getReportTypeMaxCount('weekly'));
        $this->assertTrue($assignment->isReportTypeEnabled('monthly'));
        $this->assertSame(2, $assignment->getReportTypeMaxCount('monthly'));
        $this->assertTrue($assignment->isReportTypeEnabled('final'));
        $this->assertSame(2, $assignment->version);
    }

    public function test_list_table_has_view_and_edit_actions(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        $studentUser = $this->createStudentUser();
        $studentProfile = $this->createStudentProfileFor($studentUser);
        $application = $this->makeApplication($studentProfile, $opportunity, 'accepted');
        $coordinator = $this->createCoordinatorUser();

        $assignment = TrainingAssignment::create([
            'application_id' => $application->id,
            'student_profile_id' => $studentProfile->id,
            'company_id' => $company->id,
            'opportunity_id' => $opportunity->id,
            'academic_supervisor_id' => null,
            'field_supervisor_id' => $repUser->id,
            'training_coordinator_id' => $coordinator->id,
            'status' => 'active',
            'start_date' => now(),
            'end_date' => now()->addMonths(3),
            'progress_percentage' => 0,
            'required_reports_count' => 4,
            'version' => 1,
        ]);

        Livewire::actingAs($coordinator)
            ->test(ListTrainingAssignments::class)
            ->assertTableActionExists('view')
            ->assertTableActionExists('edit')
            ->mountTableAction('view', $assignment)
            ->assertHasNoTableActionErrors();
    }

    public function test_application_picker_excludes_students_with_existing_active_assignment(): void
    {
        [, $company1] = $this->createRepUser();
        [, $company2] = $this->createRepUser();
        $opportunity1 = $this->createOpportunity($company1);
        $opportunity2 = $this->createOpportunity($company2);

        $student = $this->createStudentUser();
        $studentProfile = $this->createStudentProfileFor($student);

        $app1 = $this->makeApplication($studentProfile, $opportunity1, 'accepted');
        $app2 = $this->makeApplication($studentProfile, $opportunity2, 'accepted');

        $coordinator = $this->createCoordinatorUser();
        $academicSupervisor = $this->createAcademicSupervisorUser();
        [$repUser1] = $this->createRepUser($company1);

        // Assign student to opportunity 1
        TrainingAssignment::create([
            'application_id' => $app1->id,
            'student_profile_id' => $studentProfile->id,
            'company_id' => $company1->id,
            'opportunity_id' => $opportunity1->id,
            'academic_supervisor_id' => $academicSupervisor->id,
            'field_supervisor_id' => $repUser1->id,
            'training_coordinator_id' => $coordinator->id,
            'status' => 'active',
            'start_date' => now(),
            'end_date' => now()->addMonths(3),
            'progress_percentage' => 0,
            'required_reports_count' => 4,
            'version' => 1,
        ]);

        $options = TrainingAssignmentForm::applicationOptions();

        // Neither app1 (already assigned) nor app2 (student already has active assignment) should appear
        $this->assertArrayNotHasKey($app1->id, $options);
        $this->assertArrayNotHasKey($app2->id, $options);
    }

    public function test_creating_assignment_auto_withdraws_other_applications_and_releases_capacity(): void
    {
        [$repUser1, $company1] = $this->createRepUser();
        [, $company2] = $this->createRepUser();
        $opp1 = $this->createOpportunity($company1);
        $opp2 = $this->createOpportunity($company2);
        $opp3 = $this->createOpportunity($company1);
        $opp2->update(['accepted_count' => 1]);

        $student = $this->createStudentUser();
        $profile = $this->createStudentProfileFor($student);

        $app1 = $this->makeApplication($profile, $opp1, 'accepted');
        $app2 = $this->makeApplication($profile, $opp2, 'accepted');
        $app3 = $this->makeApplication($profile, $opp3, 'submitted');

        $academicSupervisor = $this->createAcademicSupervisorUser();
        $coordinator = $this->createCoordinatorUser();

        $this->actingAs($coordinator);

        Livewire::test(CreateTrainingAssignment::class)
            ->fillForm([
                'application_id' => $app1->id,
                'academic_supervisor_id' => $academicSupervisor->id,
                'field_supervisor_id' => $repUser1->id,
                'start_date' => now()->addDay()->toDateString(),
                'end_date' => now()->addMonths(3)->toDateString(),
                'required_reports_count' => 4,
            ])
            ->call('create')
            ->assertHasNoFormErrors();

        // Assignment created for app1
        $this->assertDatabaseHas('training_assignments', [
            'application_id' => $app1->id,
            'status' => 'active',
        ]);

        // app2 and app3 must be automatically withdrawn
        $this->assertDatabaseHas('applications', [
            'id' => $app2->id,
            'status' => 'withdrawn',
        ]);
        $this->assertDatabaseHas('applications', [
            'id' => $app3->id,
            'status' => 'withdrawn',
        ]);

        // opp2 capacity released (accepted_count decremented from 1 to 0)
        $this->assertSame(0, $opp2->fresh()->accepted_count);
    }

    public function test_application_label_formats_correctly_in_english_and_arabic(): void
    {
        [, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        $student = $this->createStudentUser();
        $profile = $this->createStudentProfileFor($student);
        $application = $this->makeApplication($profile, $opportunity, 'accepted');

        // English locale
        app()->setLocale('en');
        $labelEn = TrainingAssignmentForm::applicationLabel($application);
        $this->assertStringContainsString('Company:', $labelEn);
        $this->assertStringContainsString('Opportunity:', $labelEn);
        $this->assertStringContainsString('Student:', $labelEn);
        $this->assertStringContainsString($student->name, $labelEn);

        // Arabic locale
        app()->setLocale('ar');
        $labelAr = TrainingAssignmentForm::applicationLabel($application);
        $this->assertStringContainsString('الشركة:', $labelAr);
        $this->assertStringContainsString('الفرصة:', $labelAr);
        $this->assertStringContainsString('الطالب:', $labelAr);
        $this->assertStringContainsString($student->name, $labelAr);

        app()->setLocale('en');
    }

    public function test_application_filters_narrow_options(): void
    {
        [, $company1] = $this->createRepUser();
        [, $company2] = $this->createRepUser();

        $opp1 = $this->createOpportunity($company1);
        $opp2 = $this->createOpportunity($company2);

        $student1 = $this->createStudentUser();
        $profile1 = $this->createStudentProfileFor($student1);

        $student2 = $this->createStudentUser();
        $profile2 = $this->createStudentProfileFor($student2);

        $app1 = $this->makeApplication($profile1, $opp1, 'accepted');
        $app2 = $this->makeApplication($profile2, $opp2, 'accepted');

        // Company filter options include both companies
        $companies = TrainingAssignmentForm::companyFilterOptions();
        $this->assertArrayHasKey($company1->id, $companies);
        $this->assertArrayHasKey($company2->id, $companies);

        // Filter opportunities by company1
        $oppsCompany1 = TrainingAssignmentForm::opportunityFilterOptions($company1->id);
        $this->assertArrayHasKey($opp1->id, $oppsCompany1);
        $this->assertArrayNotHasKey($opp2->id, $oppsCompany1);

        // Filter students by company1
        $studentsCompany1 = TrainingAssignmentForm::studentFilterOptions($company1->id);
        $this->assertArrayHasKey($profile1->id, $studentsCompany1);
        $this->assertArrayNotHasKey($profile2->id, $studentsCompany1);

        // Filter applicationOptions by company1
        $optionsFiltered = TrainingAssignmentForm::applicationOptions(null, $company1->id);
        $this->assertArrayHasKey($app1->id, $optionsFiltered);
        $this->assertArrayNotHasKey($app2->id, $optionsFiltered);

        // Filter applicationOptions by student2
        $optionsFilteredStudent = TrainingAssignmentForm::applicationOptions(null, null, null, $profile2->id);
        $this->assertArrayNotHasKey($app1->id, $optionsFilteredStudent);
        $this->assertArrayHasKey($app2->id, $optionsFilteredStudent);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Report counts must be recalculated on EVERY date change, not just the first
    // ─────────────────────────────────────────────────────────────────────────

    public function test_report_counts_are_recalculated_when_dates_change_on_create_form(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        $studentUser = $this->createStudentUser();
        $studentProfile = $this->createStudentProfileFor($studentUser);
        $application = $this->makeApplication($studentProfile, $opportunity, 'accepted');
        $academicSupervisor = $this->createAcademicSupervisorUser();
        $coordinator = $this->createCoordinatorUser();

        $this->actingAs($coordinator);

        $start = today()->addDays(5);
        $firstEnd = $start->copy()->addDays(91);    // 92 days  => 13 weeks, 3 months
        $secondEnd = $start->copy()->addDays(150);  // 151 days => 21 weeks, 5 months

        Livewire::test(CreateTrainingAssignment::class)
            ->fillForm([
                'application_id' => $application->id,
                'academic_supervisor_id' => $academicSupervisor->id,
                'field_supervisor_id' => $repUser->id,
                'start_date' => $start->toDateString(),
                'end_date' => $firstEnd->toDateString(),
            ])
            ->fillForm(['daily_enabled' => true, 'monthly_enabled' => true])
            ->assertFormSet([
                'daily_count' => 66,
                'weekly_count' => 13,
                'monthly_count' => 3,
                'required_reports_count' => 83,
            ])
            // Changing the period afterwards must recalculate the counts too.
            ->fillForm(['end_date' => $secondEnd->toDateString()])
            ->assertFormSet([
                'daily_count' => 108,
                'weekly_count' => 21,
                'monthly_count' => 5,
                'required_reports_count' => 135,
            ]);
    }

    public function test_report_counts_are_recalculated_when_dates_change_on_edit_form(): void
    {
        [$repUser, $company] = $this->createRepUser();
        $opportunity = $this->createOpportunity($company);
        $studentUser = $this->createStudentUser();
        $studentProfile = $this->createStudentProfileFor($studentUser);
        $application = $this->makeApplication($studentProfile, $opportunity, 'accepted');
        $academicSupervisor = $this->createAcademicSupervisorUser();
        $coordinator = $this->createCoordinatorUser();

        $firstStart = today()->subDays(10);
        $firstEnd = $firstStart->copy()->addDays(91); // 92 days

        $assignment = TrainingAssignment::create([
            'application_id' => $application->id,
            'student_profile_id' => $studentProfile->id,
            'company_id' => $company->id,
            'opportunity_id' => $opportunity->id,
            'academic_supervisor_id' => $academicSupervisor->id,
            'field_supervisor_id' => $repUser->id,
            'training_coordinator_id' => $coordinator->id,
            'status' => 'active',
            'start_date' => $firstStart->toDateString(),
            'end_date' => $firstEnd->toDateString(),
            'progress_percentage' => 0,
            'required_reports_count' => 83,
            'report_configuration' => [
                'daily' => ['enabled' => true, 'max_count' => 66],
                'weekly' => ['enabled' => true, 'max_count' => 13],
                'monthly' => ['enabled' => true, 'max_count' => 3],
                'final' => ['enabled' => true, 'max_count' => 1],
            ],
            'version' => 1,
        ]);

        $this->actingAs($coordinator);

        $start = today()->addDays(5);
        $end = $start->copy()->addDays(150); // 151 days => 21 weeks, 5 months

        Livewire::test(EditTrainingAssignment::class, ['record' => $assignment->getRouteKey()])
            ->fillForm([
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ])
            ->assertFormSet([
                'daily_count' => 108,
                'weekly_count' => 21,
                'monthly_count' => 5,
                'required_reports_count' => 135,
            ]);
    }
}
