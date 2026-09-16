<?php

declare(strict_types=1);

namespace Tests\Feature\Opportunities;

use App\Models\Application;
use App\Models\Company;
use App\Models\CompanyRepresentative;
use App\Models\Major;
use App\Models\Opportunity;
use App\Models\OpportunityBenefit;
use App\Models\OpportunityRequirement;
use App\Models\OpportunityType;
use App\Models\Role;
use App\Models\Skill;
use App\Models\StudentProfile;
use App\Models\TrainingAssignment;
use App\Models\TrainingCoordinatorProfile;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\LookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class OpportunityDetailsTest extends TestCase
{
    use RefreshDatabase;

    private Role $repRole;

    private Role $studentRole;

    private Role $coordinatorRole;

    private OpportunityType $oppType;

    private Major $csMajor;

    private Skill $phpSkill;

    private Company $approvedCompany1;

    private Company $approvedCompany2;

    private Company $pendingCompany;

    private User $repUser1;

    private User $repUser2;

    private User $studentUser;

    private User $coordinatorUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(PermissionSeeder::class);
        $this->seed(LookupSeeder::class);

        $this->repRole = Role::where('name', 'company_representative')->firstOrFail();
        $this->studentRole = Role::where('name', 'student')->firstOrFail();
        $this->coordinatorRole = Role::where('name', 'training_coordinator')->firstOrFail();

        $this->oppType = OpportunityType::firstOrCreate(
            ['code' => 'cooperative'],
            ['name' => ['en' => 'Cooperative', 'ar' => 'تعاوني'], 'is_active' => true]
        );

        $collegeId = DB::table('colleges')->insertGetId([
            'name' => json_encode(['en' => 'College of Computing', 'ar' => 'كلية الحاسوب']),
            'code' => 'CS_COLLEGE',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $deptId = DB::table('departments')->insertGetId([
            'college_id' => $collegeId,
            'name' => json_encode(['en' => 'Computer Science Dept', 'ar' => 'قسم علوم الحاسوب']),
            'code' => 'CS_DEPT',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->csMajor = Major::create([
            'department_id' => $deptId,
            'name' => ['en' => 'Computer Science', 'ar' => 'علوم الحاسب'],
            'code' => 'CS',
            'is_active' => true,
        ]);

        $this->phpSkill = Skill::create([
            'name' => ['en' => 'PHP', 'ar' => 'بي إتش بي'],
            'is_active' => true,
        ]);

        // Companies
        $this->approvedCompany1 = Company::create([
            'name' => ['en' => 'Aramco', 'ar' => 'أرامكو'],
            'status' => 'approved',
        ]);

        $this->approvedCompany2 = Company::create([
            'name' => ['en' => 'SABIC', 'ar' => 'سابك'],
            'status' => 'approved',
        ]);

        $this->pendingCompany = Company::create([
            'name' => ['en' => 'Startup Hub', 'ar' => 'مركز الشركات الناشئة'],
            'status' => 'pending_verification',
        ]);

        // Users
        $this->repUser1 = User::factory()->create(['status' => 'active']);
        UserRole::create([
            'user_id' => $this->repUser1->id,
            'role_id' => $this->repRole->id,
            'assigned_at' => now(),
        ]);
        CompanyRepresentative::create([
            'user_id' => $this->repUser1->id,
            'company_id' => $this->approvedCompany1->id,
            'is_primary' => true,
        ]);

        $this->repUser2 = User::factory()->create(['status' => 'active']);
        UserRole::create([
            'user_id' => $this->repUser2->id,
            'role_id' => $this->repRole->id,
            'assigned_at' => now(),
        ]);
        CompanyRepresentative::create([
            'user_id' => $this->repUser2->id,
            'company_id' => $this->approvedCompany2->id,
            'is_primary' => true,
        ]);

        $this->studentUser = User::factory()->create(['status' => 'active']);
        UserRole::create([
            'user_id' => $this->studentUser->id,
            'role_id' => $this->studentRole->id,
            'assigned_at' => now(),
        ]);
        StudentProfile::create([
            'user_id' => $this->studentUser->id,
            'student_number' => 'STU-9999',
            'major_id' => $this->csMajor->id,
        ]);

        $this->coordinatorUser = User::factory()->create(['status' => 'active']);
        UserRole::create([
            'user_id' => $this->coordinatorUser->id,
            'role_id' => $this->coordinatorRole->id,
            'assigned_at' => now(),
        ]);
        TrainingCoordinatorProfile::create([
            'user_id' => $this->coordinatorUser->id,
            'department_id' => $deptId,
        ]);
    }

    private function createDetailedOpportunity(
        Company $company,
        string $status = 'published',
        array $attributes = []
    ): Opportunity {
        $opp = Opportunity::create(array_merge([
            'company_id' => $company->id,
            'opportunity_type_id' => $this->oppType->id,
            'created_by' => $this->repUser1->id,
            'title' => ['en' => 'Software Engineer Intern', 'ar' => 'متدرب مهندس برمجيات'],
            'department' => ['en' => 'Engineering', 'ar' => 'الهندسة'],
            'description' => ['en' => 'Great opportunity to learn backend systems.', 'ar' => 'فرصة مميزة لتعلم أنظمة الواجهة الخلفية.'],
            'work_mode' => 'full_time',
            'location' => 'Riyadh',
            'duration' => '3 months',
            'capacity' => 5,
            'accepted_count' => 0,
            'salary' => 3000.00,
            'start_date' => '2026-10-01',
            'end_date' => '2026-12-31',
            'application_deadline' => '2026-09-25',
            'status' => $status,
            'version' => 2,
        ], $attributes));

        $opp->majors()->attach($this->csMajor->id);
        $opp->skills()->attach($this->phpSkill->id);

        OpportunityRequirement::create([
            'opportunity_id' => $opp->id,
            'requirement_text' => ['en' => 'Basic knowledge of PHP', 'ar' => 'معرفة أساسية بـ PHP'],
            'sort_order' => 1,
        ]);
        OpportunityRequirement::create([
            'opportunity_id' => $opp->id,
            'requirement_text' => ['en' => 'Good communication skills', 'ar' => 'مهارات تواصل جيدة'],
            'sort_order' => 2,
        ]);

        OpportunityBenefit::create([
            'opportunity_id' => $opp->id,
            'benefit_text' => ['en' => 'Monthly stipend', 'ar' => 'مكافأة شهرية'],
            'sort_order' => 1,
        ]);
        OpportunityBenefit::create([
            'opportunity_id' => $opp->id,
            'benefit_text' => ['en' => 'Certificate of completion', 'ar' => 'شهادة إتمام تدريب'],
            'sort_order' => 2,
        ]);

        return $opp;
    }

    public function test_unauthenticated_user_cannot_view_opportunity_details(): void
    {
        $opp = $this->createDetailedOpportunity($this->approvedCompany1, 'published');

        $response = $this->getJson("/api/v1/opportunities/{$opp->id}");

        $response->assertStatus(401);
    }

    public function test_student_can_view_published_opportunity_from_approved_company(): void
    {
        $opp = $this->createDetailedOpportunity($this->approvedCompany1, 'published');

        $response = $this->actingAs($this->studentUser)
            ->getJson("/api/v1/opportunities/{$opp->id}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'company_id',
                    'company' => ['id', 'name', 'status'],
                    'opportunity_type_id',
                    'opportunity_type' => ['id', 'name', 'code'],
                    'title',
                    'department',
                    'description',
                    'work_mode',
                    'is_remote',
                    'location',
                    'duration',
                    'capacity',
                    'accepted_count',
                    'salary',
                    'start_date',
                    'end_date',
                    'application_deadline',
                    'status',
                    'version',
                    'majors' => [['id', 'name', 'code']],
                    'skills' => [['id', 'name']],
                    'requirements' => [['id', 'requirement_text', 'sort_order']],
                    'benefits' => [['id', 'benefit_text', 'sort_order']],
                    'already_applied',
                ],
            ]);

        $this->assertSame($opp->id, $response->json('data.id'));
        $this->assertSame(2, $response->json('data.version'));
        $this->assertFalse($response->json('data.is_remote'));
        $this->assertFalse($response->json('data.already_applied'));

        // Check requirements and benefits are ordered by sort_order
        $reqs = $response->json('data.requirements');
        $this->assertCount(2, $reqs);
        $this->assertSame(1, $reqs[0]['sort_order']);
        $this->assertSame(2, $reqs[1]['sort_order']);

        $benefits = $response->json('data.benefits');
        $this->assertCount(2, $benefits);
        $this->assertSame(1, $benefits[0]['sort_order']);
        $this->assertSame(2, $benefits[1]['sort_order']);
    }

    public function test_student_gets_404_for_draft_opportunity(): void
    {
        $draftOpp = $this->createDetailedOpportunity($this->approvedCompany1, 'draft');

        $response = $this->actingAs($this->studentUser)
            ->getJson("/api/v1/opportunities/{$draftOpp->id}");

        $response->assertStatus(404);
    }

    public function test_student_gets_404_for_closed_or_archived_opportunity(): void
    {
        $closedOpp = $this->createDetailedOpportunity($this->approvedCompany1, 'closed');
        $archivedOpp = $this->createDetailedOpportunity($this->approvedCompany1, 'archived');
        $completedOpp = $this->createDetailedOpportunity($this->approvedCompany1, 'completed');

        $this->actingAs($this->studentUser)
            ->getJson("/api/v1/opportunities/{$closedOpp->id}")
            ->assertStatus(404);

        $this->actingAs($this->studentUser)
            ->getJson("/api/v1/opportunities/{$archivedOpp->id}")
            ->assertStatus(404);

        $this->actingAs($this->studentUser)
            ->getJson("/api/v1/opportunities/{$completedOpp->id}")
            ->assertStatus(404);
    }

    public function test_student_gets_404_for_published_opportunity_of_non_approved_company(): void
    {
        $pendingCompanyOpp = $this->createDetailedOpportunity($this->pendingCompany, 'published');

        $response = $this->actingAs($this->studentUser)
            ->getJson("/api/v1/opportunities/{$pendingCompanyOpp->id}");

        $response->assertStatus(404);
    }

    public function test_student_already_applied_is_true_when_application_exists(): void
    {
        $opp = $this->createDetailedOpportunity($this->approvedCompany1, 'published');
        $studentProfile = StudentProfile::where('user_id', $this->studentUser->id)->firstOrFail();

        DB::table('applications')->insert([
            'student_profile_id' => $studentProfile->id,
            'opportunity_id' => $opp->id,
            'status' => 'submitted',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($this->studentUser)
            ->getJson("/api/v1/opportunities/{$opp->id}");

        $response->assertStatus(200);
        $this->assertTrue($response->json('data.already_applied'));
    }

    public function test_company_representative_can_view_own_company_opportunity_in_any_status(): void
    {
        $draftOpp = $this->createDetailedOpportunity($this->approvedCompany1, 'draft');
        $publishedOpp = $this->createDetailedOpportunity($this->approvedCompany1, 'published');
        $closedOpp = $this->createDetailedOpportunity($this->approvedCompany1, 'closed');
        $archivedOpp = $this->createDetailedOpportunity($this->approvedCompany1, 'archived');

        $this->actingAs($this->repUser1)
            ->getJson("/api/v1/opportunities/{$draftOpp->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'draft');

        $this->actingAs($this->repUser1)
            ->getJson("/api/v1/opportunities/{$publishedOpp->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'published');

        $this->actingAs($this->repUser1)
            ->getJson("/api/v1/opportunities/{$closedOpp->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'closed');

        $this->actingAs($this->repUser1)
            ->getJson("/api/v1/opportunities/{$archivedOpp->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'archived');
    }

    public function test_company_representative_gets_404_when_viewing_another_company_opportunity(): void
    {
        $sabicOpp = $this->createDetailedOpportunity($this->approvedCompany2, 'published');

        // repUser1 is from Aramco, trying to access SABIC's opportunity -> must return 404 (not 403)
        $response = $this->actingAs($this->repUser1)
            ->getJson("/api/v1/opportunities/{$sabicOpp->id}");

        $response->assertStatus(404);
    }

    public function test_already_applied_is_absent_for_non_student_users(): void
    {
        $opp = $this->createDetailedOpportunity($this->approvedCompany1, 'published');

        $response = $this->actingAs($this->repUser1)
            ->getJson("/api/v1/opportunities/{$opp->id}");

        $response->assertStatus(200);
        $this->assertArrayNotHasKey('already_applied', $response->json('data'));

        $coordinatorResponse = $this->actingAs($this->coordinatorUser)
            ->getJson("/api/v1/opportunities/{$opp->id}");

        $coordinatorResponse->assertStatus(200);
        $this->assertArrayNotHasKey('already_applied', $coordinatorResponse->json('data'));
    }

    public function test_training_coordinator_can_view_any_opportunity(): void
    {
        $draftOpp = $this->createDetailedOpportunity($this->approvedCompany1, 'draft');
        $pendingCompanyOpp = $this->createDetailedOpportunity($this->pendingCompany, 'published');

        $this->actingAs($this->coordinatorUser)
            ->getJson("/api/v1/opportunities/{$draftOpp->id}")
            ->assertStatus(200);

        $this->actingAs($this->coordinatorUser)
            ->getJson("/api/v1/opportunities/{$pendingCompanyOpp->id}")
            ->assertStatus(200);
    }

    public function test_withdrawn_application_does_not_flag_already_applied_in_show(): void
    {
        $opp = $this->createDetailedOpportunity($this->approvedCompany1, 'published');
        $studentProfileId = $this->studentUser->studentProfile->id;

        DB::table('applications')->insert([
            'student_profile_id' => $studentProfileId,
            'opportunity_id' => $opp->id,
            'status' => 'withdrawn',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($this->studentUser)
            ->getJson("/api/v1/opportunities/{$opp->id}");

        $response->assertStatus(200);
        $this->assertFalse($response->json('data.already_applied'));
        $this->assertFalse($response->json('data.has_active_assignment'));
    }

    public function test_has_active_assignment_is_true_in_show_when_student_has_assignment(): void
    {
        $opp = $this->createDetailedOpportunity($this->approvedCompany1, 'published');
        $studentProfileId = $this->studentUser->studentProfile->id;

        $assignedOpp = $this->createDetailedOpportunity($this->approvedCompany1, 'published');
        $app = Application::create([
            'opportunity_id' => $assignedOpp->id,
            'student_profile_id' => $studentProfileId,
            'status' => 'accepted',
            'version' => 1,
        ]);

        TrainingAssignment::create([
            'application_id' => $app->id,
            'student_profile_id' => $studentProfileId,
            'company_id' => $this->approvedCompany1->id,
            'opportunity_id' => $assignedOpp->id,
            'status' => 'active',
            'progress_percentage' => 0,
            'version' => 1,
        ]);

        $response = $this->actingAs($this->studentUser)
            ->getJson("/api/v1/opportunities/{$opp->id}");

        $response->assertStatus(200);
        $this->assertTrue($response->json('data.has_active_assignment'));
    }
}
