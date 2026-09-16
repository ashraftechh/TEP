<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;

uses(RefreshDatabase::class);

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

test('validation fails when required fields are missing', function () {
    $this->postJson('/api/v1/auth/reset-password', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['token', 'email', 'password']);
});

test('validation fails when password is too short or confirmation does not match', function () {
    $this->postJson('/api/v1/auth/reset-password', [
        'token' => 'some-token',
        'email' => 'user@example.com',
        'password' => 'short',
        'password_confirmation' => 'short',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['password']);

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => 'some-token',
        'email' => 'user@example.com',
        'password' => 'NewPass123!',
        'password_confirmation' => 'Mismatched123!',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['password']);
});

// ---------------------------------------------------------------------------
// Success Path & Subsequent Login Verification
// ---------------------------------------------------------------------------

test('user can reset password with a valid token and log in with the new password', function () {
    Event::fake([PasswordReset::class]);

    $user = User::factory()->create([
        'email' => 'salem@example.com',
        'password' => Hash::make('OldPassword123!'),
        'status' => 'active',
        'email_verified_at' => now(),
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

    $token = Password::createToken($user);

    $response = $this->postJson('/api/v1/auth/reset-password', [
        'token' => $token,
        'email' => 'salem@example.com',
        'password' => 'NewSecurePass456!',
        'password_confirmation' => 'NewSecurePass456!',
    ]);

    $response->assertOk()
        ->assertJsonPath('message', __('passwords.reset'));

    // Verify password was updated and rehashed
    $user->refresh();
    expect(Hash::check('NewSecurePass456!', $user->password))->toBeTrue()
        ->and(Hash::check('OldPassword123!', $user->password))->toBeFalse();

    Event::assertDispatched(PasswordReset::class, fn (PasswordReset $event) => $event->user->id === $user->id);

    // Old password must fail on login attempt
    $this->postJson('/api/v1/auth/login', [
        'email' => 'salem@example.com',
        'password' => 'OldPassword123!',
    ])->assertStatus(401);

    // New password must succeed on subsequent login attempt
    $loginResponse = $this->postJson('/api/v1/auth/login', [
        'email' => 'salem@example.com',
        'password' => 'NewSecurePass456!',
    ]);

    $loginResponse->assertOk()
        ->assertJsonPath('data.email', 'salem@example.com')
        ->assertJsonPath('message', __('auth.login_success'));
});

test('resetting password marks email as verified if previously null', function () {
    $user = User::factory()->create([
        'email' => 'unverified@example.com',
        'email_verified_at' => null,
        'status' => 'active',
    ]);

    $token = Password::createToken($user);

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => $token,
        'email' => 'unverified@example.com',
        'password' => 'NewPassword123!',
        'password_confirmation' => 'NewPassword123!',
    ])->assertOk();

    $user->refresh();
    expect($user->email_verified_at)->not->toBeNull();
});

test('SSO-only account with null password can establish a local password via reset and log in locally', function () {
    $user = User::factory()->create([
        'email' => 'sso-user@example.com',
        'password' => null,
        'status' => 'active',
        'email_verified_at' => now(),
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

    $token = Password::createToken($user);

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => $token,
        'email' => 'sso-user@example.com',
        'password' => 'FirstLocal@Password1',
        'password_confirmation' => 'FirstLocal@Password1',
    ])->assertOk();

    $user->refresh();
    expect($user->password)->not->toBeNull()
        ->and(Hash::check('FirstLocal@Password1', $user->password))->toBeTrue();

    // Subsequent local login attempt must succeed
    $loginResponse = $this->postJson('/api/v1/auth/login', [
        'email' => 'sso-user@example.com',
        'password' => 'FirstLocal@Password1',
    ]);

    $loginResponse->assertOk()
        ->assertJsonPath('data.email', 'sso-user@example.com');
});

test('resetting password invalidates all existing database sessions for that user', function () {
    $user = User::factory()->create(['email' => 'session-test@example.com']);
    $otherUser = User::factory()->create(['email' => 'other-user@example.com']);

    // Seed active sessions in the sessions table
    DB::table('sessions')->insert([
        [
            'id' => 'session_1',
            'user_id' => $user->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'Mozilla/5.0',
            'payload' => 'payload1',
            'last_activity' => now()->timestamp,
        ],
        [
            'id' => 'session_2',
            'user_id' => $user->id,
            'ip_address' => '192.168.1.1',
            'user_agent' => 'Mobile Safari',
            'payload' => 'payload2',
            'last_activity' => now()->timestamp,
        ],
        [
            'id' => 'session_3',
            'user_id' => $otherUser->id,
            'ip_address' => '10.0.0.1',
            'user_agent' => 'Chrome',
            'payload' => 'payload3',
            'last_activity' => now()->timestamp,
        ],
    ]);

    $token = Password::createToken($user);

    $this->postJson('/api/v1/auth/reset-password', [
        'token' => $token,
        'email' => 'session-test@example.com',
        'password' => 'NewPassword123!',
        'password_confirmation' => 'NewPassword123!',
    ])->assertOk();

    // User's sessions must be wiped, other user's session remains intact
    expect(DB::table('sessions')->where('user_id', $user->id)->count())->toBe(0)
        ->and(DB::table('sessions')->where('user_id', $otherUser->id)->count())->toBe(1);
});

// ---------------------------------------------------------------------------
// Token Expiration and Single-Use Guarantees
// ---------------------------------------------------------------------------

test('already-used token cannot be used again and returns 422 without modifying password', function () {
    $user = User::factory()->create([
        'email' => 'single-use@example.com',
        'password' => Hash::make('OriginalPassword123!'),
        'status' => 'active',
        'email_verified_at' => now(),
    ]);

    $token = Password::createToken($user);

    // 1. First reset succeeds
    $this->postJson('/api/v1/auth/reset-password', [
        'token' => $token,
        'email' => 'single-use@example.com',
        'password' => 'FirstReset@456Pass',
        'password_confirmation' => 'FirstReset@456Pass',
    ])->assertOk();

    // 2. Second reset attempt with the same token must fail with 422
    $secondResponse = $this->postJson('/api/v1/auth/reset-password', [
        'token' => $token,
        'email' => 'single-use@example.com',
        'password' => 'SecondAttempt@789Pass',
        'password_confirmation' => 'SecondAttempt@789Pass',
    ]);

    $secondResponse->assertUnprocessable()
        ->assertJsonValidationErrors(['email'])
        ->assertJsonPath('errors.email.0', __('passwords.token'));

    // Password must remain the one from the first reset, not the second attempt
    $user->refresh();
    expect(Hash::check('FirstReset@456Pass', $user->password))->toBeTrue()
        ->and(Hash::check('SecondAttempt@789Pass', $user->password))->toBeFalse();
});

test('returns 422 when password reset token is invalid', function () {
    $user = User::factory()->create(['email' => 'user@example.com']);

    $response = $this->postJson('/api/v1/auth/reset-password', [
        'token' => 'invalid-token-string',
        'email' => 'user@example.com',
        'password' => 'NewPassword123!',
        'password_confirmation' => 'NewPassword123!',
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['email'])
        ->assertJsonPath('errors.email.0', __('passwords.token'));
});

test('returns 422 when password reset token has expired and does not update password', function () {
    $user = User::factory()->create([
        'email' => 'expired@example.com',
        'password' => Hash::make('UnalteredPass123!'),
        'status' => 'active',
    ]);

    $token = Password::createToken($user);

    // Travel beyond the default 60-minute token expiration
    Carbon::setTestNow(now()->addMinutes(65));

    $response = $this->postJson('/api/v1/auth/reset-password', [
        'token' => $token,
        'email' => 'expired@example.com',
        'password' => 'AttemptedPass123!',
        'password_confirmation' => 'AttemptedPass123!',
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['email'])
        ->assertJsonPath('errors.email.0', __('passwords.token'));

    // Password must remain unchanged
    $user->refresh();
    expect(Hash::check('UnalteredPass123!', $user->password))->toBeTrue()
        ->and(Hash::check('AttemptedPass123!', $user->password))->toBeFalse();
});

test('returns 422 when email does not exist', function () {
    $response = $this->postJson('/api/v1/auth/reset-password', [
        'token' => 'any-token',
        'email' => 'nonexistent@example.com',
        'password' => 'NewPassword123!',
        'password_confirmation' => 'NewPassword123!',
    ]);

    $response->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

// ---------------------------------------------------------------------------
// Guest Middleware Guard
// ---------------------------------------------------------------------------

test('authenticated user cannot access reset-password endpoint', function () {
    $user = User::factory()->create(['status' => 'active']);

    $this->actingAs($user)
        ->postJson('/api/v1/auth/reset-password', [
            'token' => 'some-token',
            'email' => $user->email,
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ])
        ->assertStatus(409);
});
