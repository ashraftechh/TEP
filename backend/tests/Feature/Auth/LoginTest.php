<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Success path
// ---------------------------------------------------------------------------

test('active user with correct credentials logs in and receives UserResource with server-resolved role', function () {
    $role = Role::create([
        'name' => 'student',
        'label' => ['en' => 'Student', 'ar' => 'طالب'],
        'is_system' => true,
    ]);

    $user = User::factory()->create([
        'email' => 'student.active@example.com',
        'password' => Hash::make('CorrectPass1!'),
        'status' => 'active',
    ]);

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'assigned_at' => now(),
    ]);

    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'student.active@example.com',
        'password' => 'CorrectPass1!',
    ]);

    $response->assertOk()
        ->assertJsonPath('message', __('auth.login_success'))
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.email', 'student.active@example.com')
        ->assertJsonPath('data.status', 'active')
        ->assertJsonPath('data.roles.0.name', 'student');

    // last_login_at was touched
    expect($user->fresh()->last_login_at)->not->toBeNull();
    $this->assertAuthenticatedAs($user);
});

test('request body containing forged role field is strictly ignored and resolved from database user_roles', function () {
    $studentRole = Role::create([
        'name' => 'student',
        'label' => ['en' => 'Student', 'ar' => 'طالب'],
        'is_system' => true,
    ]);

    $user = User::factory()->create([
        'email' => 'student.tamper@example.com',
        'password' => Hash::make('CorrectPass1!'),
        'status' => 'active',
    ]);

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $studentRole->id,
        'assigned_at' => now(),
    ]);

    // Attacker sends forged role='super_admin' in request payload
    $response = $this->postJson('/api/v1/auth/login', [
        'email' => 'student.tamper@example.com',
        'password' => 'CorrectPass1!',
        'role' => 'super_admin', // forged client field — MUST be ignored
    ]);

    $response->assertOk();

    // 1. Response roles array MUST contain only the database role ('student'), NOT 'super_admin'
    $response->assertJsonPath('data.roles.0.name', 'student')
        ->assertJsonMissing(['name' => 'super_admin']);

    // 2. Response top-level must not echo any forged 'role' key
    $responseData = $response->json('data');
    expect($responseData)->not->toHaveKey('role');

    // 3. Database user_roles was NOT altered
    expect($user->fresh()->userRoles()->first()->role->name)->toBe('student');
});

// ---------------------------------------------------------------------------
// Credential failures — all return identical 401 (no oracle)
// ---------------------------------------------------------------------------

test('wrong password returns 401 with generic failed message', function () {
    User::factory()->create([
        'email' => 'user@example.com',
        'password' => Hash::make('CorrectPass1!'),
        'status' => 'active',
    ]);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'user@example.com',
        'password' => 'WrongPassword!',
    ])->assertUnauthorized()
        ->assertJsonPath('message', __('auth.failed'));
});

test('unknown email returns the same generic 401 as wrong password', function () {
    $this->postJson('/api/v1/auth/login', [
        'email' => 'nobody@example.com',
        'password' => 'SomePassword1!',
    ])->assertUnauthorized()
        ->assertJsonPath('message', __('auth.failed'));
});

test('SSO-only user (password null) receives the same generic 401 as wrong password', function () {
    // JIT-provisioned SSO account — no password set
    User::factory()->create([
        'email' => 'sso@example.com',
        'password' => null,
        'status' => 'active',
    ]);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'sso@example.com',
        'password' => 'AnyPassword1!',
    ])->assertUnauthorized()
        ->assertJsonPath('message', __('auth.failed'));
});

// ---------------------------------------------------------------------------
// Status gates — checked only after credentials are verified
// ---------------------------------------------------------------------------

test('pending user can log in and receives 200 (frontend redirects to /verify-email)', function () {
    $user = User::factory()->unverified()->create([
        'email' => 'pending@example.com',
        'password' => Hash::make('CorrectPass1!'),
        'status' => 'pending',
    ]);

    $role = Role::firstOrCreate(
        ['name' => 'student'],
        ['label' => ['en' => 'Student', 'ar' => 'طالب'], 'is_system' => true]
    );

    UserRole::create([
        'user_id' => $user->id,
        'role_id' => $role->id,
        'assigned_at' => now(),
    ]);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'pending@example.com',
        'password' => 'CorrectPass1!',
    ])->assertOk()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.email', 'pending@example.com');

    // The user is now authenticated in session; the frontend route guard
    // will redirect them to /verify-email based on their pending status.
    $this->assertAuthenticatedAs($user);
});

test('suspended user receives 403 with error_code account_suspended', function () {
    User::factory()->create([
        'email' => 'suspended@example.com',
        'password' => Hash::make('CorrectPass1!'),
        'status' => 'suspended',
    ]);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'suspended@example.com',
        'password' => 'CorrectPass1!',
    ])->assertStatus(403)
        ->assertJsonPath('error_code', 'account_suspended')
        ->assertJsonPath('message', __('auth.account_suspended'));
});

test('incomplete user (edge case) receives 403 with error_code registration_incomplete', function () {
    // Normally an incomplete account has no password; this tests the explicit guard
    // that fires if a manual DB edit ever creates this combination.
    User::factory()->create([
        'email' => 'incomplete@example.com',
        'password' => Hash::make('CorrectPass1!'),
        'status' => 'incomplete',
    ]);

    $this->postJson('/api/v1/auth/login', [
        'email' => 'incomplete@example.com',
        'password' => 'CorrectPass1!',
    ])->assertStatus(403)
        ->assertJsonPath('error_code', 'registration_incomplete')
        ->assertJsonPath('message', __('auth.registration_incomplete'));
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

test('missing email and password return 422 validation errors', function () {
    $this->postJson('/api/v1/auth/login', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email', 'password']);
});

test('malformed email returns 422', function () {
    $this->postJson('/api/v1/auth/login', [
        'email' => 'not-an-email',
        'password' => 'SomePass1!',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

// ---------------------------------------------------------------------------
// Auth state
// ---------------------------------------------------------------------------

test('already authenticated user hitting the login endpoint receives 409', function () {
    $user = User::factory()->create(['status' => 'active']);

    Sanctum::actingAs($user);

    $this->postJson('/api/v1/auth/login', [
        'email' => $user->email,
        'password' => 'password',
    ])->assertStatus(409); // RedirectIfAuthenticated returns 409 Conflict for API requests
});

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

test('sixth login attempt within a minute is rate-limited with 429', function () {
    // First 5 attempts — all fail with 401 (wrong password), but that's fine;
    // we're testing the throttle, not the credentials.
    for ($i = 0; $i < 5; $i++) {
        $this->postJson('/api/v1/auth/login', [
            'email' => 'ratelimit@example.com',
            'password' => 'WrongPass!',
        ]);
    }

    $this->postJson('/api/v1/auth/login', [
        'email' => 'ratelimit@example.com',
        'password' => 'WrongPass!',
    ])->assertStatus(429);
});

// ---------------------------------------------------------------------------
// GET /api/v1/auth/me (Hydration endpoint)
// ---------------------------------------------------------------------------

test('authenticated user can retrieve their profile and resolved roles via /auth/me', function () {
    $user = User::factory()->create(['status' => 'active']);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/v1/auth/me');

    $response->assertOk()
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.email', $user->email)
        ->assertJsonPath('data.status', 'active');
});

test('unauthenticated guest requesting /auth/me receives 401', function () {
    $this->getJson('/api/v1/auth/me')->assertUnauthorized();
});
