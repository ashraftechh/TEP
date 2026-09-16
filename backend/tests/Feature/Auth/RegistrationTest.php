<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\Major;
use App\Models\Role;
use App\Models\StudentProfile;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\RoleSeeder;
use Illuminate\Auth\Events\Registered;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(RoleSeeder::class);
});

test('successful student registration creates users, student_profiles, and unscoped user_roles', function () {
    Event::fake([Registered::class]);

    $collegeId = DB::table('colleges')->insertGetId([
        'code' => 'eng',
        'name' => json_encode(['en' => 'College of Engineering', 'ar' => 'كلية الهندسة']),
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $deptId = DB::table('departments')->insertGetId([
        'college_id' => $collegeId,
        'code' => 'swe',
        'name' => json_encode(['en' => 'Software Engineering', 'ar' => 'هندسة البرمجيات']),
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $major = Major::create([
        'department_id' => $deptId,
        'code' => 'swe_major',
        'name' => ['en' => 'Software Engineering', 'ar' => 'هندسة برمجيات'],
        'is_active' => true,
    ]);

    $payload = [
        'name' => 'Ahmed Ali',
        'email' => 'ahmed.student@example.com',
        'phone' => '+967771234567',
        'password' => 'SecurePass123!',
        'password_confirmation' => 'SecurePass123!',
        'account_type' => 'student',
        'major_id' => $major->id,
    ];

    $response = $this->postJson('/api/v1/auth/register', $payload);

    $response->assertStatus(201)
        ->assertJsonPath('data.name', 'Ahmed Ali')
        ->assertJsonPath('data.email', 'ahmed.student@example.com')
        ->assertJsonPath('data.status', 'pending');

    // 1. Assert users table row
    $user = User::where('email', 'ahmed.student@example.com')->first();
    expect($user)->not->toBeNull()
        ->and($user->name)->toBe('Ahmed Ali')
        ->and($user->status)->toBe('pending')
        ->and($user->email_verified_at)->toBeNull();

    // 2. Assert student_profiles table row
    $profile = StudentProfile::where('user_id', $user->id)->first();
    expect($profile)->not->toBeNull()
        ->and($profile->major_id)->toBe($major->id)
        ->and($profile->student_number)->toStartWith('STU-');

    // 3. Assert user_roles row (unscoped for students: scope_type and scope_id both null)
    $studentRole = Role::where('name', 'student')->firstOrFail();
    $userRole = UserRole::where('user_id', $user->id)->first();
    expect($userRole)->not->toBeNull()
        ->and($userRole->role_id)->toBe($studentRole->id)
        ->and($userRole->scope_type)->toBeNull()
        ->and($userRole->scope_id)->toBeNull();

    // 4. Assert Registered event was dispatched
    Event::assertDispatched(Registered::class, function (Registered $event) use ($user) {
        return $event->user->id === $user->id;
    });

    // 5. Assert auto-login occurred — the user is authenticated in session immediately
    // after registration so they can call POST /api/v1/auth/email/resend without logging in again.
    // The frontend route guard detects status === 'pending' and redirects to /verify-email.
    expect(Auth::check())->toBeTrue();
    expect(Auth::id())->toBe($user->id);
});

test('company self-registration is rejected with 422', function () {
    $payload = [
        'name' => 'Fouad Al-Banna',
        'email' => 'fouad@techcorp.com',
        'phone' => '+967731234567',
        'password' => 'TechCorpPass123!',
        'password_confirmation' => 'TechCorpPass123!',
        'account_type' => 'company',
        'company_name' => 'TechCorp Solutions',
        'industry_id' => 1,
    ];

    $response = $this->postJson('/api/v1/auth/register', $payload);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['account_type']);
});

test('duplicate email returns 422 error', function () {
    User::factory()->create([
        'email' => 'duplicate@example.com',
    ]);

    $payload = [
        'name' => 'New User',
        'email' => 'duplicate@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'account_type' => 'student',
        'major_id' => 1,
    ];

    $response = $this->postJson('/api/v1/auth/register', $payload);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['email']);
});

test('missing major_id when account_type is student returns 422', function () {
    $payload = [
        'name' => 'Student User',
        'email' => 'student.missing.major@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'account_type' => 'student',
    ];

    $response = $this->postJson('/api/v1/auth/register', $payload);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['major_id']);
});

test('password confirmation mismatch returns 422', function () {
    $payload = [
        'name' => 'Mismatch Pass',
        'email' => 'mismatch@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'DifferentPass456!',
        'account_type' => 'student',
        'major_id' => 1,
    ];

    $response = $this->postJson('/api/v1/auth/register', $payload);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['password']);
});

test('password shorter than 8 characters returns 422', function () {
    $payload = [
        'name' => 'Short Pass',
        'email' => 'shortpass@example.com',
        'password' => 'Short1!',
        'password_confirmation' => 'Short1!',
        'account_type' => 'student',
        'major_id' => 1,
    ];

    $response = $this->postJson('/api/v1/auth/register', $payload);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['password']);
});

test('invalid account_type returns 422', function () {
    $payload = [
        'name' => 'Invalid Type',
        'email' => 'invalidtype@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'account_type' => 'super_admin',
    ];

    $response = $this->postJson('/api/v1/auth/register', $payload);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['account_type']);
});

test('non-existent major_id returns 422', function () {
    $payload = [
        'name' => 'Non Existent Major',
        'email' => 'nonexistentmajor@example.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'account_type' => 'student',
        'major_id' => 999999,
    ];

    $response = $this->postJson('/api/v1/auth/register', $payload);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['major_id']);
});

test('disposable email address is rejected with 422', function () {
    $payload = [
        'name' => 'Disposable User',
        'email' => 'user@mailinator.com',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'account_type' => 'student',
        'major_id' => 1,
    ];

    $response = $this->postJson('/api/v1/auth/register', $payload);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['email']);
});
