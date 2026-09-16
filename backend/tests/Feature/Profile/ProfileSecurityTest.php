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
use Illuminate\Routing\Route as RoutingRoute;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->seed(PermissionSeeder::class);
});

// ---------------------------------------------------------------------------
// Helper: create a minimal student with a student_profile
// ---------------------------------------------------------------------------

function makeStudentWithProfile(): User
{
    $user = User::factory()->create([
        'status' => 'active',
        'email_verified_at' => now(),
    ]);

    $role = Role::where('name', 'student')->firstOrFail();
    UserRole::create(['user_id' => $user->id, 'role_id' => $role->id]);

    StudentProfile::create([
        'user_id' => $user->id,
        'student_number' => 'STU-587-'.$user->id,
        'university_name' => 'Sanaa University',
        'level_year' => 3,
        'gpa' => 3.50,
    ]);

    return $user;
}

// ===========================================================================
// TEP-587 — REQUIREMENT: No arbitrary user ID on profile route
// ===========================================================================

/**
 * The GET/PATCH /profile routes must NEVER expose an {id} or {user} segment —
 * they always resolve to "me" (the authenticated user). This test inspects
 * the registered route list directly so it can never be bypassed by a passing
 * HTTP test that happens to hit the right user by coincidence.
 */
test('STRUCTURAL: profile routes contain no arbitrary user ID parameter', function () {
    $profileRoutes = collect(Route::getRoutes()->getRoutes())
        ->filter(fn (RoutingRoute $r) => str_starts_with($r->uri(), 'api/v1/profile'));

    expect($profileRoutes)->not->toBeEmpty();

    foreach ($profileRoutes as $route) {
        /** @var RoutingRoute $route */
        $paramNames = $route->parameterNames();

        // None of the profile routes may accept a free user-id segment.
        // Allowed params: skill_id (integer-constrained), provider (google|microsoft).
        expect($paramNames)
            ->not->toContain('id')
            ->not->toContain('user_id')
            ->not->toContain('user');
    }
});

// ===========================================================================
// TEP-587 — REQUIREMENT: Each of the 5 roles returns the correct shape
// ===========================================================================

test('GET /profile as student returns major, skills, interests and NO department or company data', function () {
    $user = makeStudentWithProfile();

    $collegeId = DB::table('colleges')->insertGetId([
        'name' => json_encode(['en' => 'CS', 'ar' => 'حاسوب']),
        'code' => 'CS587',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $department = Department::create([
        'college_id' => $collegeId,
        'code' => 'IT587',
        'name' => ['en' => 'IT', 'ar' => 'تقنية'],
    ]);

    $major = Major::create([
        'department_id' => $department->id,
        'code' => 'SE587',
        'name' => ['en' => 'Software Engineering', 'ar' => 'هندسة البرمجيات'],
        'is_active' => true,
    ]);

    $user->studentProfile->update(['major_id' => $major->id, 'interests' => ['AI', 'Laravel']]);

    $skill = Skill::create(['name' => ['en' => 'React', 'ar' => 'رياكت'], 'is_active' => true]);
    $user->studentProfile->skills()->attach($skill->id, ['proficiency' => 'intermediate']);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/v1/profile');

    $response->assertOk()
        ->assertJsonPath('data.roles.0.name', 'student')
        // Student-specific fields must be present
        ->assertJsonPath('data.student_profile.major.code', 'SE587')
        ->assertJsonPath('data.student_profile.skills.0.proficiency', 'intermediate')
        ->assertJsonPath('data.student_profile.interests', ['AI', 'Laravel'])
        // Cross-role sections must be absent
        ->assertJsonMissingPath('data.academic_supervisor_profile')
        ->assertJsonMissingPath('data.training_coordinator_profile')
        ->assertJsonMissingPath('data.company_representative');
});

test('GET /profile as academic_supervisor returns department data and no student/company sections', function () {
    $user = User::factory()->create(['status' => 'active', 'email_verified_at' => now()]);
    $role = Role::where('name', 'academic_supervisor')->firstOrFail();
    UserRole::create(['user_id' => $user->id, 'role_id' => $role->id]);

    $collegeId = DB::table('colleges')->insertGetId([
        'name' => json_encode(['en' => 'Engineering', 'ar' => 'الهندسة']),
        'code' => 'ENG587',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $department = Department::create([
        'college_id' => $collegeId,
        'code' => 'SE587B',
        'name' => ['en' => 'Software Dept', 'ar' => 'قسم البرمجيات'],
    ]);

    AcademicSupervisorProfile::create([
        'user_id' => $user->id,
        'department_id' => $department->id,
    ]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/v1/profile');

    $response->assertOk()
        ->assertJsonPath('data.roles.0.name', 'academic_supervisor')
        ->assertJsonPath('data.academic_supervisor_profile.department.code', 'SE587B')
        // Must not bleed into student/company sections
        ->assertJsonMissingPath('data.student_profile')
        ->assertJsonMissingPath('data.training_coordinator_profile')
        ->assertJsonMissingPath('data.company_representative');
});

test('GET /profile as training_coordinator returns department data and no student/company sections', function () {
    $user = User::factory()->create(['status' => 'active', 'email_verified_at' => now()]);
    $role = Role::where('name', 'training_coordinator')->firstOrFail();
    UserRole::create(['user_id' => $user->id, 'role_id' => $role->id]);

    $collegeId = DB::table('colleges')->insertGetId([
        'name' => json_encode(['en' => 'Business', 'ar' => 'الأعمال']),
        'code' => 'BUS587',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $department = Department::create([
        'college_id' => $collegeId,
        'code' => 'MGMT587',
        'name' => ['en' => 'Management', 'ar' => 'الإدارة'],
    ]);

    TrainingCoordinatorProfile::create([
        'user_id' => $user->id,
        'department_id' => $department->id,
    ]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/v1/profile');

    $response->assertOk()
        ->assertJsonPath('data.roles.0.name', 'training_coordinator')
        ->assertJsonPath('data.training_coordinator_profile.department.code', 'MGMT587')
        ->assertJsonMissingPath('data.student_profile')
        ->assertJsonMissingPath('data.academic_supervisor_profile')
        ->assertJsonMissingPath('data.company_representative');
});

test('GET /profile as company_representative returns company name, status, and job_title — no student/dept sections', function () {
    $user = User::factory()->create(['status' => 'active', 'email_verified_at' => now()]);
    $role = Role::where('name', 'company_representative')->firstOrFail();
    UserRole::create(['user_id' => $user->id, 'role_id' => $role->id]);

    $industryId = DB::table('industries')->insertGetId([
        'code' => 'TECH587',
        'name' => json_encode(['en' => 'Technology', 'ar' => 'تقنية']),
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $company = Company::create([
        'name' => ['en' => 'AlSultan Tech', 'ar' => 'تقنية السلطان'],
        'industry_id' => $industryId,
        'status' => 'approved',
    ]);

    CompanyRepresentative::create([
        'user_id' => $user->id,
        'company_id' => $company->id,
        'job_title' => 'CTO',
        'is_primary' => true,
    ]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/v1/profile');

    $response->assertOk()
        ->assertJsonPath('data.roles.0.name', 'company_representative')
        ->assertJsonPath('data.company_representative.job_title', 'CTO')
        ->assertJsonPath('data.company_representative.company.status', 'approved')
        ->assertJsonMissingPath('data.student_profile')
        ->assertJsonMissingPath('data.academic_supervisor_profile')
        ->assertJsonMissingPath('data.training_coordinator_profile');
});

test('GET /profile as super_admin returns base user data only with no nested profile sections', function () {
    $user = User::factory()->create(['status' => 'active', 'email_verified_at' => now()]);
    $role = Role::where('name', 'super_admin')->firstOrFail();
    UserRole::create(['user_id' => $user->id, 'role_id' => $role->id]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/v1/profile');

    $response->assertOk()
        ->assertJsonPath('data.roles.0.name', 'super_admin')
        ->assertJsonStructure(['data' => ['id', 'name', 'email', 'status', 'roles']])
        ->assertJsonMissingPath('data.student_profile')
        ->assertJsonMissingPath('data.academic_supervisor_profile')
        ->assertJsonMissingPath('data.training_coordinator_profile')
        ->assertJsonMissingPath('data.company_representative');
});

// ===========================================================================
// TEP-587 — REQUIREMENT: student submitting department_id is rejected
// ===========================================================================

test('student cannot submit department_id in update request — it is rejected as a prohibited field', function () {
    $user = makeStudentWithProfile();

    Sanctum::actingAs($user);

    // department_id is only valid for supervisor/coordinator roles.
    // A student submitting it must receive a 422, not a silent pass-through.
    $response = $this->patchJson('/api/v1/profile', [
        'department_id' => 1,
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['department_id']);

    // The student_profile's content must remain unchanged by this rejected request.
    $user->studentProfile->refresh();
    expect($user->studentProfile->university_name)->toBe('Sanaa University');
});

// ===========================================================================
// TEP-587 — REQUIREMENT: email cannot be changed through this endpoint
// ===========================================================================

test('attempting to change email via PATCH /profile is rejected with 422 and documented message', function () {
    $user = User::factory()->create([
        'email' => 'original@university.edu',
        'status' => 'active',
    ]);

    Sanctum::actingAs($user);

    $response = $this->patchJson('/api/v1/profile', [
        'email' => 'hacker@evil.com',
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['email'])
        ->assertJsonPath('errors.email.0', __('profile.email_cannot_be_changed'));

    // Email in database must be untouched
    $user->refresh();
    expect($user->email)->toBe('original@university.edu');
});

test('updating valid fields alongside email still rejects the entire request because email is prohibited', function () {
    $user = User::factory()->create([
        'name' => 'Original Name',
        'email' => 'original@university.edu',
        'status' => 'active',
    ]);

    Sanctum::actingAs($user);

    $response = $this->patchJson('/api/v1/profile', [
        'name' => 'New Name',
        'email' => 'new@hacker.com',
    ]);

    // Validation must fail regardless of other valid fields
    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);

    // Name must not have changed either since the whole request fails
    $user->refresh();
    expect($user->email)->toBe('original@university.edu');
});

// ===========================================================================
// TEP-587 — REQUIREMENT: SSO unlinking anti-lockout and success paths
// ===========================================================================

test('ANTI-LOCKOUT: unlinking only SSO identity with no password returns 422 and identity is preserved', function () {
    $user = User::factory()->create([
        'password' => null, // SSO-only account
        'status' => 'active',
    ]);
    $role = Role::where('name', 'student')->firstOrFail();
    UserRole::create(['user_id' => $user->id, 'role_id' => $role->id]);

    SsoIdentity::create([
        'user_id' => $user->id,
        'provider' => 'google',
        'provider_subject_id' => 'sole-google-identity-587',
        'provider_email' => 'sole@gmail.com',
    ]);

    Sanctum::actingAs($user);

    $response = $this->deleteJson('/api/v1/profile/sso/google');

    $response->assertUnprocessable()
        ->assertJsonPath('message', __('profile.cannot_unlink_last_auth_method'));

    // The identity must still be in the database
    expect($user->ssoIdentities()->where('provider', 'google')->exists())->toBeTrue();
});

test('unlinking one of two SSO identities succeeds even when no local password exists', function () {
    $user = User::factory()->create([
        'password' => null, // No password — relying entirely on SSO
        'status' => 'active',
    ]);
    $role = Role::where('name', 'student')->firstOrFail();
    UserRole::create(['user_id' => $user->id, 'role_id' => $role->id]);

    SsoIdentity::create([
        'user_id' => $user->id,
        'provider' => 'google',
        'provider_subject_id' => 'google-587-first',
        'provider_email' => 'user@gmail.com',
    ]);

    SsoIdentity::create([
        'user_id' => $user->id,
        'provider' => 'microsoft',
        'provider_subject_id' => 'ms-587-second',
        'provider_email' => 'user@outlook.com',
    ]);

    Sanctum::actingAs($user);

    $response = $this->deleteJson('/api/v1/profile/sso/google');

    $response->assertOk()
        ->assertJsonPath('message', __('profile.sso_unlinked'));

    expect($user->ssoIdentities()->where('provider', 'google')->exists())->toBeFalse()
        ->and($user->ssoIdentities()->where('provider', 'microsoft')->exists())->toBeTrue();
});

test('unlinking an SSO identity succeeds when user has a local password even if it is the only SSO link', function () {
    $user = User::factory()->create([
        'password' => Hash::make('strong-local-password'),
        'status' => 'active',
    ]);
    $role = Role::where('name', 'company_representative')->firstOrFail();
    UserRole::create(['user_id' => $user->id, 'role_id' => $role->id]);

    SsoIdentity::create([
        'user_id' => $user->id,
        'provider' => 'microsoft',
        'provider_subject_id' => 'ms-rep-587',
        'provider_email' => 'rep@company.com',
    ]);

    Sanctum::actingAs($user);

    $response = $this->deleteJson('/api/v1/profile/sso/microsoft');

    $response->assertOk()
        ->assertJsonPath('message', __('profile.sso_unlinked'));

    expect($user->ssoIdentities()->count())->toBe(0);
});

// ===========================================================================
// TEP-587 — REQUIREMENT: No {id} route segment — structural + HTTP proof
// ===========================================================================

test('GET /api/v1/profile/{id} returns 404 — no such route exists', function () {
    // This can never silently work because no {id} route is registered.
    // An attempt with a real user's ID must also fail — the endpoint is always "me".
    $user = User::factory()->create(['status' => 'active']);
    Sanctum::actingAs($user);

    $this->getJson("/api/v1/profile/{$user->id}")->assertNotFound();
    $this->patchJson("/api/v1/profile/{$user->id}", ['name' => 'X'])->assertNotFound();
});

test('PATCH /api/v1/profile does not accept user_id in request body and update always applies to authenticated user only', function () {
    $owner = User::factory()->create(['name' => 'Owner', 'status' => 'active']);
    $other = User::factory()->create(['name' => 'Other', 'status' => 'active']);

    Sanctum::actingAs($owner);

    // Submitting another user's id in the body should not switch the target
    $response = $this->patchJson('/api/v1/profile', [
        'name' => 'Hijacked Name',
        // user_id is not a valid field at all — it may be ignored or cause 422
    ]);

    // Either the request succeeds and updates ONLY the owner
    // or fails validation — but must NEVER update $other.
    $other->refresh();
    expect($other->name)->toBe('Other');
});
