<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\Company;
use App\Models\Major;
use App\Models\Role;
use App\Models\StudentProfile;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Basic authentication & status checks
// ---------------------------------------------------------------------------

test('authenticated active user receives full UserResource with status active', function () {
    $user = User::factory()->create([
        'name' => 'Sara Al-Hubaishi',
        'email' => 'sara@example.com',
        'phone' => '+967771234567',
        'status' => 'active',
    ]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/v1/auth/me');

    $response->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.name', 'Sara Al-Hubaishi')
        ->assertJsonPath('data.email', 'sara@example.com')
        ->assertJsonPath('data.phone', '+967771234567')
        ->assertJsonPath('data.status', 'active');
});

test('authenticated incomplete user (SSO JIT) receives status incomplete for frontend routing', function () {
    // Brand new SSO user who has not chosen Student/Company account type yet
    $user = User::factory()->create([
        'name' => 'JIT User',
        'email' => 'jit.user@example.com',
        'password' => null,
        'status' => 'incomplete',
        'email_verified_at' => now(),
    ]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/v1/auth/me');

    $response->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.status', 'incomplete');
});

test('unauthenticated request to /auth/me is rejected with 401', function () {
    $this->getJson('/api/v1/auth/me')->assertUnauthorized();
});

// ---------------------------------------------------------------------------
// Eager-loaded profile and roles verification
// ---------------------------------------------------------------------------

test('user with student profile receives eager-loaded profile and major', function () {
    $collegeId = DB::table('colleges')->insertGetId([
        'name' => json_encode(['en' => 'College of Computing', 'ar' => 'كلية الحاسوب']),
        'code' => 'comp_college',
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $departmentId = DB::table('departments')->insertGetId([
        'college_id' => $collegeId,
        'name' => json_encode(['en' => 'Computer Science Dept', 'ar' => 'قسم علوم الحاسب']),
        'code' => 'cs_dept',
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $major = Major::create([
        'department_id' => $departmentId,
        'name' => ['en' => 'Software Engineering', 'ar' => 'هندسة برمجيات'],
        'code' => 'swe_major',
        'is_active' => true,
    ]);

    $user = User::factory()->create(['status' => 'active']);

    StudentProfile::create([
        'user_id' => $user->id,
        'student_number' => 'STU-2026-999',
        'major_id' => $major->id,
        'university_name' => 'Saba Region University',
    ]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/v1/auth/me');

    $response->assertOk()
        ->assertJsonPath('data.student_profile.student_number', 'STU-2026-999')
        ->assertJsonPath('data.student_profile.major.code', 'swe_major')
        ->assertJsonPath('data.student_profile.major.name.ar', 'هندسة برمجيات');
});

test('user with company representative relation receives company details', function () {
    $user = User::factory()->create(['status' => 'active']);

    $company = Company::create([
        'name' => ['en' => 'Tech Solutions Ltd', 'ar' => 'شركة الحلول التقنية'],
        'status' => 'approved',
    ]);

    $user->companies()->attach($company->id, [
        'job_title' => 'HR Manager',
        'is_primary' => true,
    ]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/v1/auth/me');

    $response->assertOk()
        ->assertJsonPath('data.company_representative.company_id', $company->id)
        ->assertJsonPath('data.company_representative.job_title', 'HR Manager')
        ->assertJsonPath('data.company_representative.is_primary', true)
        ->assertJsonPath('data.company_representative.company.status', 'approved');
});

test('user with server-resolved roles receives full roles array', function () {
    $role = Role::create([
        'name' => 'academic_supervisor',
        'label' => ['en' => 'Academic Supervisor', 'ar' => 'مشرف أكاديمي'],
        'is_system' => true,
    ]);

    $user = User::factory()->create(['status' => 'active']);

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'assigned_at' => now(),
    ]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/v1/auth/me');

    $response->assertOk()
        ->assertJsonPath('data.roles.0.name', 'academic_supervisor')
        ->assertJsonPath('data.roles.0.label.ar', 'مشرف أكاديمي');
});

// ---------------------------------------------------------------------------
// Database session driver verification
// ---------------------------------------------------------------------------

test('sessions table stores user session correctly when database driver is used', function () {
    $user = User::factory()->create(['status' => 'active']);

    $sessionId = 'sess_'.Str::random(32);

    DB::table('sessions')->insert([
        'id' => $sessionId,
        'user_id' => $user->id,
        'ip_address' => '127.0.0.1',
        'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'payload' => serialize(['_token' => Str::random(40)]),
        'last_activity' => time(),
    ]);

    $storedSession = DB::table('sessions')->where('id', $sessionId)->first();

    expect($storedSession)->not->toBeNull()
        ->and($storedSession->user_id)->toBe($user->id)
        ->and($storedSession->ip_address)->toBe('127.0.0.1');

    // Verify session invalidation (logout/suspension cleanup) can query and delete by user_id
    DB::table('sessions')->where('user_id', $user->id)->delete();
    expect(DB::table('sessions')->where('user_id', $user->id)->count())->toBe(0);
});
