<?php

declare(strict_types=1);

namespace Tests\Feature\Profile;

use App\Models\AcademicSupervisorProfile;
use App\Models\Company;
use App\Models\CompanyRepresentative;
use App\Models\Department;
use App\Models\Major;
use App\Models\Role;
use App\Models\Skill;
use App\Models\SsoIdentity;
use App\Models\StudentProfile;
use App\Models\TrainingCoordinatorProfile;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->seed(PermissionSeeder::class);
});

// ---------------------------------------------------------------------------
// Authentication Guard
// ---------------------------------------------------------------------------

test('unauthenticated guest cannot access GET /api/v1/profile', function () {
    $this->getJson('/api/v1/profile')
        ->assertUnauthorized();
});

// ---------------------------------------------------------------------------
// Student Profile Fetching
// ---------------------------------------------------------------------------

test('student user can fetch their profile with major, skills, and linked SSO identities without leaking provider_subject_id', function () {
    $user = User::factory()->create([
        'name' => 'Salem Student',
        'email' => 'salem@student.university.edu',
        'phone' => '+967771234567',
        'status' => 'active',
        'email_verified_at' => now(),
    ]);

    $studentRole = Role::where('name', 'student')->firstOrFail();
    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $studentRole->id,
    ]);

    // Create department & major
    $collegeId = DB::table('colleges')->insertGetId([
        'name' => json_encode(['en' => 'Computer Science', 'ar' => 'علوم الحاسوب']),
        'code' => 'CS',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $department = Department::create([
        'college_id' => $collegeId,
        'code' => 'IS',
        'name' => ['en' => 'Information Systems', 'ar' => 'نظم المعلومات'],
    ]);

    $major = Major::create([
        'department_id' => $department->id,
        'code' => 'BIS',
        'name' => ['en' => 'Business Information Systems', 'ar' => 'نظم المعلومات الإدارية'],
    ]);

    $studentProfile = StudentProfile::create([
        'user_id' => $user->id,
        'student_number' => 'STU-2026-001',
        'major_id' => $major->id,
        'university_name' => 'Sanaa University',
        'level_year' => 4,
        'gpa' => 3.85,
        'bio' => 'Senior IT student looking for internship.',
        'interests' => ['Web Development', 'AI'],
        'languages' => ['Arabic', 'English'],
        'achievements' => ['Dean List 2025'],
    ]);

    $skill = Skill::create([
        'name' => ['en' => 'React', 'ar' => 'رياكت'],
        'is_active' => true,
    ]);

    $studentProfile->skills()->attach($skill->id, ['proficiency' => 'advanced']);

    // Link an SSO identity
    SsoIdentity::create([
        'user_id' => $user->id,
        'provider' => 'google',
        'provider_subject_id' => 'secret-google-sub-id-12345',
        'provider_email' => 'salem.oauth@gmail.com',
    ]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/v1/profile');

    $response->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.name', 'Salem Student')
        ->assertJsonPath('data.email', 'salem@student.university.edu')
        ->assertJsonPath('data.phone', '+967771234567')
        ->assertJsonPath('data.status', 'active')
        ->assertJsonPath('data.student_profile.student_number', 'STU-2026-001')
        ->assertJsonPath('data.student_profile.major.code', 'BIS')
        ->assertJsonPath('data.student_profile.skills.0.proficiency', 'advanced')
        ->assertJsonPath('data.sso_identities.0.provider', 'google')
        ->assertJsonPath('data.sso_identities.0.provider_email', 'salem.oauth@gmail.com');

    // CRITICAL SECURITY ASSERTION: provider_subject_id MUST NOT be exposed
    $responseData = $response->json();
    $responseString = json_encode($responseData);
    expect($responseString)->not->toContain('secret-google-sub-id-12345');
    expect($responseData['data']['sso_identities'][0])->not->toHaveKey('provider_subject_id');
});

// ---------------------------------------------------------------------------
// Academic Supervisor Profile Fetching
// ---------------------------------------------------------------------------

test('academic supervisor can fetch their profile with department details', function () {
    $user = User::factory()->create([
        'name' => 'Dr. Ahmed Supervisor',
        'email' => 'ahmed@university.edu',
        'status' => 'active',
        'email_verified_at' => now(),
    ]);

    $role = Role::where('name', 'academic_supervisor')->firstOrFail();
    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
    ]);

    $collegeId = DB::table('colleges')->insertGetId([
        'name' => json_encode(['en' => 'Engineering', 'ar' => 'الهندسة']),
        'code' => 'ENG',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $department = Department::create([
        'college_id' => $collegeId,
        'code' => 'SE',
        'name' => ['en' => 'Software Engineering', 'ar' => 'هندسة البرمجيات'],
    ]);

    AcademicSupervisorProfile::create([
        'user_id' => $user->id,
        'department_id' => $department->id,
    ]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/v1/profile');

    $response->assertOk()
        ->assertJsonPath('data.name', 'Dr. Ahmed Supervisor')
        ->assertJsonPath('data.academic_supervisor_profile.department.code', 'SE')
        ->assertJsonMissingPath('data.student_profile')
        ->assertJsonMissingPath('data.training_coordinator_profile')
        ->assertJsonMissingPath('data.company_representative');
});

// ---------------------------------------------------------------------------
// Training Coordinator Profile Fetching
// ---------------------------------------------------------------------------

test('training coordinator can fetch their profile with department details', function () {
    $user = User::factory()->create([
        'name' => 'Coordinator Mona',
        'email' => 'mona@university.edu',
        'status' => 'active',
        'email_verified_at' => now(),
    ]);

    $role = Role::where('name', 'training_coordinator')->firstOrFail();
    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
    ]);

    $collegeId = DB::table('colleges')->insertGetId([
        'name' => json_encode(['en' => 'Science', 'ar' => 'العلوم']),
        'code' => 'SCI',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $department = Department::create([
        'college_id' => $collegeId,
        'code' => 'CS',
        'name' => ['en' => 'Computer Science', 'ar' => 'علوم الحاسوب'],
    ]);

    TrainingCoordinatorProfile::create([
        'user_id' => $user->id,
        'department_id' => $department->id,
    ]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/v1/profile');

    $response->assertOk()
        ->assertJsonPath('data.name', 'Coordinator Mona')
        ->assertJsonPath('data.training_coordinator_profile.department.code', 'CS')
        ->assertJsonMissingPath('data.student_profile')
        ->assertJsonMissingPath('data.academic_supervisor_profile');
});

// ---------------------------------------------------------------------------
// Company Representative Profile Fetching
// ---------------------------------------------------------------------------

test('company representative can fetch their profile with company summary', function () {
    $user = User::factory()->create([
        'name' => 'Tariq Rep',
        'email' => 'tariq@yementeck.com',
        'status' => 'active',
        'email_verified_at' => now(),
    ]);

    $role = Role::where('name', 'company_representative')->firstOrFail();
    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
    ]);

    $industryId = DB::table('industries')->insertGetId([
        'code' => 'TECH',
        'name' => json_encode(['en' => 'Technology', 'ar' => 'تكنولوجيا المعلومات']),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $company = Company::create([
        'name' => ['en' => 'YemenTech Solutions', 'ar' => 'حلول تقنية اليمن'],
        'industry_id' => $industryId,
        'status' => 'approved',
    ]);

    CompanyRepresentative::create([
        'user_id' => $user->id,
        'company_id' => $company->id,
        'job_title' => 'HR Director',
        'is_primary' => true,
    ]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/v1/profile');

    $response->assertOk()
        ->assertJsonPath('data.name', 'Tariq Rep')
        ->assertJsonPath('data.company_representative.job_title', 'HR Director')
        ->assertJsonPath('data.company_representative.company.status', 'approved')
        ->assertJsonMissingPath('data.student_profile');
});

// ---------------------------------------------------------------------------
// Super Admin Profile Fetching
// ---------------------------------------------------------------------------

test('super admin can fetch profile containing base user data without extra nested profile table', function () {
    $user = User::factory()->create([
        'name' => 'System SuperAdmin',
        'email' => 'admin@university.edu',
        'status' => 'active',
        'email_verified_at' => now(),
    ]);

    $role = Role::where('name', 'super_admin')->firstOrFail();
    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
    ]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/v1/profile');

    $response->assertOk()
        ->assertJsonPath('data.name', 'System SuperAdmin')
        ->assertJsonPath('data.roles.0.name', 'super_admin')
        ->assertJsonMissingPath('data.student_profile')
        ->assertJsonMissingPath('data.academic_supervisor_profile')
        ->assertJsonMissingPath('data.training_coordinator_profile')
        ->assertJsonMissingPath('data.company_representative');
});
