<?php

declare(strict_types=1);

namespace Tests\Feature\Profile;

use App\Models\Department;
use App\Models\Major;
use App\Models\Role;
use App\Models\Skill;
use App\Models\SsoIdentity;
use App\Models\StudentProfile;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
    $this->seed(PermissionSeeder::class);
});

// ---------------------------------------------------------------------------
// Authentication & Basic Updates
// ---------------------------------------------------------------------------

test('unauthenticated guest cannot update profile', function () {
    $this->patchJson('/api/v1/profile', ['name' => 'New Name'])
        ->assertUnauthorized();
});

test('any authenticated user can update base profile fields like name and phone', function () {
    $user = User::factory()->create([
        'name' => 'Old Name',
        'phone' => '+967770000000',
        'status' => 'active',
    ]);

    Sanctum::actingAs($user);

    $response = $this->patchJson('/api/v1/profile', [
        'name' => 'Updated Name',
        'phone' => '+967771112233',
    ]);

    $response->assertOk()
        ->assertJsonPath('data.name', 'Updated Name')
        ->assertJsonPath('data.phone', '+967771112233');

    $user->refresh();
    expect($user->name)->toBe('Updated Name')
        ->and($user->phone)->toBe('+967771112233');
});

// ---------------------------------------------------------------------------
// Student Profile Updates
// ---------------------------------------------------------------------------

test('student can update their bio, address, interests, languages, and achievements', function () {
    $user = User::factory()->create(['status' => 'active']);
    $role = Role::where('name', 'student')->firstOrFail();
    UserRole::create(['user_id' => $user->id, 'role_id' => $role->id]);

    $collegeId = DB::table('colleges')->insertGetId([
        'name' => json_encode(['en' => 'CS', 'ar' => 'حاسوب']),
        'code' => 'CS',
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $department = Department::create([
        'college_id' => $collegeId,
        'code' => 'IT',
        'name' => ['en' => 'IT', 'ar' => 'تقنية'],
    ]);

    $major = Major::create([
        'department_id' => $department->id,
        'code' => 'SE',
        'name' => ['en' => 'Software Eng', 'ar' => 'هندسة البرمجيات'],
    ]);

    $studentProfile = StudentProfile::create([
        'user_id' => $user->id,
        'student_number' => 'STU-100',
        'major_id' => $major->id,
        'university_name' => 'Sanaa University',
        'level_year' => 3,
        'gpa' => 3.50,
        'bio' => 'Old bio',
        'address' => 'Old address',
    ]);

    Sanctum::actingAs($user);

    $response = $this->patchJson('/api/v1/profile', [
        'bio' => 'Passionate software engineer specializing in backend systems.',
        'address' => 'Sanaa, Hadda St.',
        'expected_graduation' => '2027-06-30',
        'interests' => ['Laravel', 'Cloud Architecture'],
        'languages' => ['Arabic', 'English', 'German'],
        'achievements' => ['1st Place Hackathon 2026'],
    ]);

    $response->assertOk()
        ->assertJsonPath('data.student_profile.bio', 'Passionate software engineer specializing in backend systems.')
        ->assertJsonPath('data.student_profile.address', 'Sanaa, Hadda St.')
        ->assertJsonPath('data.student_profile.interests', ['Laravel', 'Cloud Architecture'])
        ->assertJsonPath('data.student_profile.languages', ['Arabic', 'English', 'German'])
        ->assertJsonPath('data.student_profile.achievements', ['1st Place Hackathon 2026']);

    $studentProfile->refresh();
    expect($studentProfile->bio)->toBe('Passionate software engineer specializing in backend systems.')
        ->and($studentProfile->interests)->toEqual(['Laravel', 'Cloud Architecture']);
});

// ---------------------------------------------------------------------------
// Security & Explicit Restrictions
// ---------------------------------------------------------------------------

test('submitting email in profile update is rejected with 422', function () {
    $user = User::factory()->create(['status' => 'active']);
    Sanctum::actingAs($user);

    $response = $this->patchJson('/api/v1/profile', [
        'email' => 'new-email@example.com',
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['email'])
        ->assertJsonPath('errors.email.0', __('profile.email_cannot_be_changed'));
});

test('read-only fields (major_id, gpa, department_id) are prohibited from being updated', function () {
    $user = User::factory()->create(['status' => 'active']);
    $role = Role::where('name', 'student')->firstOrFail();
    UserRole::create(['user_id' => $user->id, 'role_id' => $role->id]);

    Sanctum::actingAs($user);

    $this->patchJson('/api/v1/profile', ['major_id' => 999])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['major_id']);

    $this->patchJson('/api/v1/profile', ['gpa' => 4.0])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['gpa']);

    $this->patchJson('/api/v1/profile', ['department_id' => 55])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['department_id']);
});

test('non-student roles cannot submit student-specific fields', function () {
    $user = User::factory()->create(['status' => 'active']);
    $role = Role::where('name', 'company_representative')->firstOrFail();
    UserRole::create(['user_id' => $user->id, 'role_id' => $role->id]);

    Sanctum::actingAs($user);

    $this->patchJson('/api/v1/profile', [
        'bio' => 'Some company rep bio',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['bio']);
});

// ---------------------------------------------------------------------------
// Skills Management (Student-only)
// ---------------------------------------------------------------------------

test('student can attach and detach skills with proficiency levels', function () {
    $user = User::factory()->create(['status' => 'active']);
    $role = Role::where('name', 'student')->firstOrFail();
    UserRole::create(['user_id' => $user->id, 'role_id' => $role->id]);

    $studentProfile = StudentProfile::create([
        'user_id' => $user->id,
        'student_number' => 'STU-200',
        'university_name' => 'Sanaa University',
        'level_year' => 4,
    ]);

    $skill = Skill::create([
        'name' => ['en' => 'TypeScript', 'ar' => 'تايب سكريبت'],
        'is_active' => true,
    ]);

    Sanctum::actingAs($user);

    // 1. Attach skill
    $attachResponse = $this->postJson('/api/v1/profile/skills', [
        'skill_id' => $skill->id,
        'proficiency' => 'advanced',
    ]);

    $attachResponse->assertStatus(201)
        ->assertJsonPath('message', __('profile.skill_attached'));

    expect($studentProfile->skills()->where('skill_id', $skill->id)->exists())->toBeTrue();

    // 2. Duplicate attachment returns 409
    $duplicateResponse = $this->postJson('/api/v1/profile/skills', [
        'skill_id' => $skill->id,
        'proficiency' => 'intermediate',
    ]);

    $duplicateResponse->assertStatus(409)
        ->assertJsonPath('message', __('profile.skill_already_attached'));

    // 3. Detach skill
    $detachResponse = $this->deleteJson("/api/v1/profile/skills/{$skill->id}");

    $detachResponse->assertOk()
        ->assertJsonPath('message', __('profile.skill_removed'));

    expect($studentProfile->skills()->where('skill_id', $skill->id)->exists())->toBeFalse();

    // 4. Detaching already detached skill returns 404
    $this->deleteJson("/api/v1/profile/skills/{$skill->id}")
        ->assertNotFound();
});

test('non-student cannot attach or detach skills', function () {
    $user = User::factory()->create(['status' => 'active']);
    $role = Role::where('name', 'academic_supervisor')->firstOrFail();
    UserRole::create(['user_id' => $user->id, 'role_id' => $role->id]);

    $skill = Skill::create([
        'name' => ['en' => 'Python', 'ar' => 'بايثون'],
        'is_active' => true,
    ]);

    Sanctum::actingAs($user);

    $this->postJson('/api/v1/profile/skills', [
        'skill_id' => $skill->id,
        'proficiency' => 'intermediate',
    ])->assertForbidden();

    $this->deleteJson("/api/v1/profile/skills/{$skill->id}")
        ->assertForbidden();
});

// ---------------------------------------------------------------------------
// SSO Unlinking & Anti-Lockout Security
// ---------------------------------------------------------------------------

test('user can unlink SSO identity if a local password is established', function () {
    $user = User::factory()->create([
        'status' => 'active',
        'password' => Hash::make('local-password-123'),
    ]);
    $role = Role::where('name', 'student')->firstOrFail();
    UserRole::create(['user_id' => $user->id, 'role_id' => $role->id]);

    SsoIdentity::create([
        'user_id' => $user->id,
        'provider' => 'google',
        'provider_subject_id' => 'google-sub-123',
        'provider_email' => 'user@gmail.com',
    ]);

    Sanctum::actingAs($user);

    $response = $this->deleteJson('/api/v1/profile/sso/google');

    $response->assertOk()
        ->assertJsonPath('message', __('profile.sso_unlinked'));

    expect($user->ssoIdentities()->count())->toBe(0);
});

test('user can unlink an SSO identity if they have another SSO identity even without a password', function () {
    $user = User::factory()->create([
        'status' => 'active',
        'password' => null, // No password
    ]);
    $role = Role::where('name', 'student')->firstOrFail();
    UserRole::create(['user_id' => $user->id, 'role_id' => $role->id]);

    SsoIdentity::create([
        'user_id' => $user->id,
        'provider' => 'google',
        'provider_subject_id' => 'google-sub-123',
        'provider_email' => 'user@gmail.com',
    ]);

    SsoIdentity::create([
        'user_id' => $user->id,
        'provider' => 'microsoft',
        'provider_subject_id' => 'ms-sub-456',
        'provider_email' => 'user@outlook.com',
    ]);

    Sanctum::actingAs($user);

    $response = $this->deleteJson('/api/v1/profile/sso/google');

    $response->assertOk()
        ->assertJsonPath('message', __('profile.sso_unlinked'));

    expect($user->ssoIdentities()->where('provider', 'google')->exists())->toBeFalse()
        ->and($user->ssoIdentities()->where('provider', 'microsoft')->exists())->toBeTrue();
});

test('ANTI-LOCKOUT SECURITY: user cannot unlink their ONLY SSO identity when no local password is set', function () {
    $user = User::factory()->create([
        'status' => 'active',
        'password' => null, // No password
    ]);
    $role = Role::where('name', 'student')->firstOrFail();
    UserRole::create(['user_id' => $user->id, 'role_id' => $role->id]);

    SsoIdentity::create([
        'user_id' => $user->id,
        'provider' => 'google',
        'provider_subject_id' => 'only-google-sub',
        'provider_email' => 'sole.provider@gmail.com',
    ]);

    Sanctum::actingAs($user);

    $response = $this->deleteJson('/api/v1/profile/sso/google');

    $response->assertUnprocessable()
        ->assertJsonPath('message', __('profile.cannot_unlink_last_auth_method'));

    // Identity must NOT be deleted
    expect($user->ssoIdentities()->where('provider', 'google')->exists())->toBeTrue();
});

test('unlinking non-existent SSO provider returns 404', function () {
    $user = User::factory()->create([
        'status' => 'active',
        'password' => Hash::make('password123'),
    ]);
    $role = Role::where('name', 'student')->firstOrFail();
    UserRole::create(['user_id' => $user->id, 'role_id' => $role->id]);

    Sanctum::actingAs($user);

    $this->deleteJson('/api/v1/profile/sso/google')
        ->assertNotFound();
});
