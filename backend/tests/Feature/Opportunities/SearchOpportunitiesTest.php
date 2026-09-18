<?php

declare(strict_types=1);

namespace Tests\Feature\Opportunities;

use App\Models\Application;
use App\Models\Company;
use App\Models\CompanyRepresentative;
use App\Models\Major;
use App\Models\Opportunity;
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

class SearchOpportunitiesTest extends TestCase
{
    use RefreshDatabase;

    private Role $repRole;

    private Role $studentRole;

    private Role $coordinatorRole;

    private OpportunityType $oppType;

    private Major $csMajor;

    private Major $itMajor;

    private Skill $phpSkill;

    private Skill $reactSkill;

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

        $this->itMajor = Major::create([
            'department_id' => $deptId,
            'name' => ['en' => 'Information Technology', 'ar' => 'تقنية المعلومات'],
            'code' => 'IT',
            'is_active' => true,
        ]);

        $this->phpSkill = Skill::create([
            'name' => ['en' => 'PHP', 'ar' => 'بي إتش بي'],
            'is_active' => true,
        ]);

        $this->reactSkill = Skill::create([
            'name' => ['en' => 'React', 'ar' => 'رياكت'],
            'is_active' => true,
        ]);

        $industryId = DB::table('industries')->value('id') ?? DB::table('industries')->insertGetId([
            'name' => json_encode(['en' => 'Technology', 'ar' => 'تكنولوجيا']),
            'code' => 'TECH',
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Companies
        $this->approvedCompany1 = Company::create([
            'name' => ['en' => 'Acme Tech', 'ar' => 'أكمي للتقنية'],
            'industry_id' => $industryId,
            'description' => ['en' => 'Tech Corp', 'ar' => 'شركة تقنية'],
            'email' => 'acme@example.com',
            'phone' => '+967711111111',
            'city' => 'Sanaa',
            'status' => 'approved',
        ]);

        $this->approvedCompany2 = Company::create([
            'name' => ['en' => 'Beta Solutions', 'ar' => 'بيتا للحلول'],
            'industry_id' => $industryId,
            'description' => ['en' => 'Solutions Corp', 'ar' => 'شركة حلول'],
            'email' => 'beta@example.com',
            'phone' => '+967722222222',
            'city' => 'Aden',
            'status' => 'approved',
        ]);

        $this->pendingCompany = Company::create([
            'name' => ['en' => 'Pending Co', 'ar' => 'شركة قيد المراجعة'],
            'industry_id' => $industryId,
            'description' => ['en' => 'Pending Corp', 'ar' => 'شركة غير معتمدة بعد'],
            'email' => 'pending@example.com',
            'phone' => '+967733333333',
            'city' => 'Taiz',
            'status' => 'pending_verification',
        ]);

        // Rep 1
        $this->repUser1 = User::factory()->create([
            'email' => 'rep1@example.com',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
        UserRole::create([
            'user_id' => $this->repUser1->id,
            'role_id' => $this->repRole->id,
        ]);
        CompanyRepresentative::create([
            'user_id' => $this->repUser1->id,
            'company_id' => $this->approvedCompany1->id,
            'is_primary' => true,
            'job_title' => 'HR Manager',
        ]);

        // Rep 2
        $this->repUser2 = User::factory()->create([
            'email' => 'rep2@example.com',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
        UserRole::create([
            'user_id' => $this->repUser2->id,
            'role_id' => $this->repRole->id,
        ]);
        CompanyRepresentative::create([
            'user_id' => $this->repUser2->id,
            'company_id' => $this->approvedCompany2->id,
            'is_primary' => true,
            'job_title' => 'HR Lead',
        ]);

        // Student
        $this->studentUser = User::factory()->create([
            'email' => 'student@example.com',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
        UserRole::create([
            'user_id' => $this->studentUser->id,
            'role_id' => $this->studentRole->id,
        ]);
        StudentProfile::create([
            'user_id' => $this->studentUser->id,
            'student_number' => 'STU-9901',
            'major_id' => $this->csMajor->id,
            'university_name' => 'Saba University',
            'level_year' => 4,
            'gpa' => 3.85,
        ]);

        // Training Coordinator
        $this->coordinatorUser = User::factory()->create([
            'email' => 'coord@example.com',
            'status' => 'active',
            'email_verified_at' => now(),
        ]);
        UserRole::create([
            'user_id' => $this->coordinatorUser->id,
            'role_id' => $this->coordinatorRole->id,
        ]);
        TrainingCoordinatorProfile::create([
            'user_id' => $this->coordinatorUser->id,
            'department_id' => $deptId,
        ]);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->getJson('/api/v1/opportunities');
        $response->assertStatus(401);
    }

    public function test_student_sees_only_published_opportunities_from_approved_companies(): void
    {
        // Published opp in approved company
        $publishedOpp = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
            'title' => ['en' => 'Backend Developer', 'ar' => 'مطور خلفيات'],
        ]);

        // Draft opp in approved company
        $draftOpp = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'draft',
            'title' => ['en' => 'Draft Opportunity', 'ar' => 'فرصة مسودة'],
        ]);

        // Closed opp in approved company
        $closedOpp = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'closed',
            'title' => ['en' => 'Closed Opportunity', 'ar' => 'فرصة مغلقة'],
        ]);

        // Archived opp in approved company
        $archivedOpp = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'archived',
            'title' => ['en' => 'Archived Opportunity', 'ar' => 'فرصة مؤرشفة'],
        ]);

        // Published opp in unapproved company
        $unapprovedCompanyOpp = Opportunity::factory()->create([
            'company_id' => $this->pendingCompany->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
            'title' => ['en' => 'Unapproved Co Opp', 'ar' => 'فرصة شركة غير معتمدة'],
        ]);

        $response = $this->actingAs($this->studentUser)->getJson('/api/v1/opportunities');

        $response->assertStatus(200);
        $data = $response->json('data');

        $returnedIds = collect($data)->pluck('id')->toArray();

        $this->assertContains($publishedOpp->id, $returnedIds);
        $this->assertNotContains($draftOpp->id, $returnedIds);
        $this->assertNotContains($closedOpp->id, $returnedIds);
        $this->assertNotContains($archivedOpp->id, $returnedIds);
        $this->assertNotContains($unapprovedCompanyOpp->id, $returnedIds);
    }

    public function test_student_does_not_see_opportunities_past_application_deadline(): void
    {
        // Still open: deadline in the future.
        $openOpp = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
            'application_deadline' => now()->addDay(),
        ]);

        // No deadline at all: stays open indefinitely.
        $noDeadlineOpp = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
            'application_deadline' => null,
        ]);

        // Deadline passed: must NOT appear in the student listing.
        $expiredOpp = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
            'application_deadline' => now()->subHour(),
        ]);

        $response = $this->actingAs($this->studentUser)->getJson('/api/v1/opportunities');

        $response->assertStatus(200);
        $returnedIds = collect($response->json('data'))->pluck('id')->toArray();

        $this->assertContains($openOpp->id, $returnedIds);
        $this->assertContains($noDeadlineOpp->id, $returnedIds);
        $this->assertNotContains($expiredOpp->id, $returnedIds);

        // Company reps keep seeing their own expired opportunities.
        $repResponse = $this->actingAs($this->repUser1)->getJson('/api/v1/opportunities');
        $repIds = collect($repResponse->json('data'))->pluck('id')->toArray();
        $this->assertContains($expiredOpp->id, $repIds);

        // The resource flags the closed application window for the details page.
        $this->actingAs($this->studentUser)
            ->getJson("/api/v1/opportunities/{$openOpp->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.application_open', true);

        $this->actingAs($this->studentUser)
            ->getJson("/api/v1/opportunities/{$expiredOpp->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.application_open', false);
    }

    public function test_company_rep_sees_all_statuses_of_own_company_and_none_of_others(): void
    {
        // Rep 1's company opps (draft, published, closed)
        $rep1Draft = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'draft',
            'title' => ['en' => 'Rep1 Draft', 'ar' => 'مسودة أكمي'],
        ]);
        $rep1Published = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
            'title' => ['en' => 'Rep1 Published', 'ar' => 'منشور أكمي'],
        ]);
        $rep1Closed = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'closed',
            'title' => ['en' => 'Rep1 Closed', 'ar' => 'مغلق أكمي'],
        ]);

        // Rep 2's company opps (draft, published)
        $rep2Draft = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany2->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'draft',
            'title' => ['en' => 'Rep2 Draft', 'ar' => 'مسودة بيتا'],
        ]);
        $rep2Published = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany2->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
            'title' => ['en' => 'Rep2 Published', 'ar' => 'منشور بيتا'],
        ]);

        $response = $this->actingAs($this->repUser1)->getJson('/api/v1/opportunities');

        $response->assertStatus(200);
        $returnedIds = collect($response->json('data'))->pluck('id')->toArray();

        // Rep 1 sees all their own statuses
        $this->assertContains($rep1Draft->id, $returnedIds);
        $this->assertContains($rep1Published->id, $returnedIds);
        $this->assertContains($rep1Closed->id, $returnedIds);

        // Rep 1 never sees any opportunity of Rep 2
        $this->assertNotContains($rep2Draft->id, $returnedIds);
        $this->assertNotContains($rep2Published->id, $returnedIds);
    }

    public function test_filtering_by_major_id(): void
    {
        $oppWithCs = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
            'title' => ['en' => 'CS Opportunity', 'ar' => 'فرصة حاسوب'],
        ]);
        $oppWithCs->majors()->attach($this->csMajor->id);

        $oppWithIt = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
            'title' => ['en' => 'IT Opportunity', 'ar' => 'فرصة تقنية'],
        ]);
        $oppWithIt->majors()->attach($this->itMajor->id);

        $response = $this->actingAs($this->studentUser)->getJson('/api/v1/opportunities?major_id='.$this->csMajor->id);

        $response->assertStatus(200);
        $returnedIds = collect($response->json('data'))->pluck('id')->toArray();

        $this->assertContains($oppWithCs->id, $returnedIds);
        $this->assertNotContains($oppWithIt->id, $returnedIds);
    }

    public function test_filtering_by_skill_id(): void
    {
        $oppWithPhp = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
            'title' => ['en' => 'PHP Opp', 'ar' => 'فرصة بي إتش بي'],
        ]);
        $oppWithPhp->skills()->attach($this->phpSkill->id);

        $oppWithReact = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
            'title' => ['en' => 'React Opp', 'ar' => 'فرصة رياكت'],
        ]);
        $oppWithReact->skills()->attach($this->reactSkill->id);

        $response = $this->actingAs($this->studentUser)->getJson('/api/v1/opportunities?skill_id='.$this->phpSkill->id);

        $response->assertStatus(200);
        $returnedIds = collect($response->json('data'))->pluck('id')->toArray();

        $this->assertContains($oppWithPhp->id, $returnedIds);
        $this->assertNotContains($oppWithReact->id, $returnedIds);
    }

    public function test_filtering_by_is_remote(): void
    {
        $remoteOpp = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
            'work_mode' => 'remote',
            'title' => ['en' => 'Remote Dev', 'ar' => 'مطور عن بعد'],
        ]);

        $onsiteOpp = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
            'work_mode' => 'full_time',
            'title' => ['en' => 'Onsite Dev', 'ar' => 'مطور حضوري'],
        ]);

        $response = $this->actingAs($this->studentUser)->getJson('/api/v1/opportunities?is_remote=1');

        $response->assertStatus(200);
        $returnedIds = collect($response->json('data'))->pluck('id')->toArray();

        $this->assertContains($remoteOpp->id, $returnedIds);
        $this->assertNotContains($onsiteOpp->id, $returnedIds);
    }

    public function test_free_text_search_q_matches_arabic_and_english(): void
    {
        $opp1 = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
            'title' => ['en' => 'Fullstack Laravel Engineer', 'ar' => 'مهندس برمجيات متكامل'],
            'department' => ['en' => 'Web Dev', 'ar' => 'تطوير الويب'],
        ]);

        $opp2 = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
            'title' => ['en' => 'Data Analyst', 'ar' => 'محلل بيانات الذكاء الاصطناعي'],
            'department' => ['en' => 'AI Lab', 'ar' => 'مختبر الذكاء'],
        ]);

        // Search in English
        $responseEn = $this->actingAs($this->studentUser)->getJson('/api/v1/opportunities?q=Laravel');
        $responseEn->assertStatus(200);
        $returnedIdsEn = collect($responseEn->json('data'))->pluck('id')->toArray();
        $this->assertContains($opp1->id, $returnedIdsEn);
        $this->assertNotContains($opp2->id, $returnedIdsEn);

        // Search in Arabic
        $responseAr = $this->actingAs($this->studentUser)->getJson('/api/v1/opportunities?q='.urlencode('الذكاء'));
        $responseAr->assertStatus(200);
        $returnedIdsAr = collect($responseAr->json('data'))->pluck('id')->toArray();
        $this->assertContains($opp2->id, $returnedIdsAr);
        $this->assertNotContains($opp1->id, $returnedIdsAr);
    }

    public function test_already_applied_is_computed_for_students_and_absent_for_other_roles(): void
    {
        $appliedOpp = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
            'title' => ['en' => 'Applied Opportunity', 'ar' => 'فرصة مقدم عليها'],
        ]);

        $notAppliedOpp = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
            'title' => ['en' => 'Not Applied Opportunity', 'ar' => 'فرصة غير مقدم عليها'],
        ]);

        $studentProfileId = $this->studentUser->studentProfile->id;
        DB::table('applications')->insert([
            'student_profile_id' => $studentProfileId,
            'opportunity_id' => $appliedOpp->id,
            'status' => 'submitted',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Student requester
        $responseStudent = $this->actingAs($this->studentUser)->getJson('/api/v1/opportunities');
        $responseStudent->assertStatus(200);

        $studentData = collect($responseStudent->json('data'));
        $appliedItem = $studentData->firstWhere('id', $appliedOpp->id);
        $notAppliedItem = $studentData->firstWhere('id', $notAppliedOpp->id);

        $this->assertNotNull($appliedItem);
        $this->assertNotNull($notAppliedItem);
        $this->assertArrayHasKey('already_applied', $appliedItem);
        $this->assertTrue($appliedItem['already_applied']);
        $this->assertFalse($notAppliedItem['already_applied']);

        // Company Rep requester: already_applied must be ABSENT
        $responseRep = $this->actingAs($this->repUser1)->getJson('/api/v1/opportunities');
        $responseRep->assertStatus(200);
        $repData = collect($responseRep->json('data'));
        foreach ($repData as $item) {
            $this->assertArrayNotHasKey('already_applied', $item);
        }

        // Coordinator requester: already_applied must be ABSENT
        $responseCoord = $this->actingAs($this->coordinatorUser)->getJson('/api/v1/opportunities');
        $responseCoord->assertStatus(200);
        $coordData = collect($responseCoord->json('data'));
        foreach ($coordData as $item) {
            $this->assertArrayNotHasKey('already_applied', $item);
        }
    }

    public function test_pagination_works_correctly_at_the_boundary(): void
    {
        Opportunity::factory()->count(7)->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
        ]);

        // Page 1 with per_page=3
        $page1Response = $this->actingAs($this->studentUser)->getJson('/api/v1/opportunities?per_page=3&page=1');
        $page1Response->assertStatus(200);
        $page1Data = $page1Response->json('data');
        $this->assertCount(3, $page1Data);
        $this->assertEquals(7, $page1Response->json('meta.total'));
        $this->assertEquals(3, $page1Response->json('meta.last_page'));

        // Page 3 with per_page=3 (remaining 1 item)
        $page3Response = $this->actingAs($this->studentUser)->getJson('/api/v1/opportunities?per_page=3&page=3');
        $page3Response->assertStatus(200);
        $page3Data = $page3Response->json('data');
        $this->assertCount(1, $page3Data);
    }

    public function test_withdrawn_and_rejected_applications_do_not_count_as_already_applied(): void
    {
        $withdrawnOpp = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
        ]);

        $rejectedOpp = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
        ]);

        $studentProfileId = $this->studentUser->studentProfile->id;

        DB::table('applications')->insert([
            [
                'student_profile_id' => $studentProfileId,
                'opportunity_id' => $withdrawnOpp->id,
                'status' => 'withdrawn',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'student_profile_id' => $studentProfileId,
                'opportunity_id' => $rejectedOpp->id,
                'status' => 'rejected',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        $response = $this->actingAs($this->studentUser)->getJson('/api/v1/opportunities');
        $response->assertStatus(200);

        $data = collect($response->json('data'));
        $withdrawnItem = $data->firstWhere('id', $withdrawnOpp->id);
        $rejectedItem = $data->firstWhere('id', $rejectedOpp->id);

        $this->assertNotNull($withdrawnItem);
        $this->assertNotNull($rejectedItem);
        $this->assertFalse($withdrawnItem['already_applied']);
        $this->assertFalse($rejectedItem['already_applied']);
    }

    public function test_has_active_assignment_flag_is_true_when_student_is_assigned(): void
    {
        $opp = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
        ]);

        $studentProfileId = $this->studentUser->studentProfile->id;

        // Initially false
        $res1 = $this->actingAs($this->studentUser)->getJson('/api/v1/opportunities');
        $res1->assertStatus(200);
        $item1 = collect($res1->json('data'))->firstWhere('id', $opp->id);
        $this->assertFalse($item1['has_active_assignment']);

        $assignedOpp = Opportunity::factory()->create([
            'company_id' => $this->approvedCompany1->id,
            'opportunity_type_id' => $this->oppType->id,
            'status' => 'published',
        ]);

        $app = Application::create([
            'opportunity_id' => $assignedOpp->id,
            'student_profile_id' => $studentProfileId,
            'status' => 'accepted',
            'version' => 1,
        ]);

        // Create active assignment
        TrainingAssignment::create([
            'application_id' => $app->id,
            'student_profile_id' => $studentProfileId,
            'company_id' => $this->approvedCompany1->id,
            'opportunity_id' => $assignedOpp->id,
            'status' => 'active',
            'progress_percentage' => 0,
            'version' => 1,
        ]);

        $res2 = $this->actingAs($this->studentUser)->getJson('/api/v1/opportunities');
        $res2->assertStatus(200);
        $item2 = collect($res2->json('data'))->firstWhere('id', $opp->id);
        $this->assertTrue($item2['has_active_assignment']);
    }
}
