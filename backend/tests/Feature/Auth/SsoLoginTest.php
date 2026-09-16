<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\SsoIdentity;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;
use Mockery;

uses(RefreshDatabase::class);

/**
 * Helper: build a fake Socialite user object for tests.
 *
 * @param  array{id?: string, email?: string, name?: string}  $overrides
 */
function fakeSocialiteUser(array $overrides = []): SocialiteUser
{
    $mock = Mockery::mock(SocialiteUser::class);
    $mock->allows('getId')->andReturn($overrides['id'] ?? 'provider-sub-123');
    $mock->allows('getEmail')->andReturn($overrides['email'] ?? 'sso-user@example.com');
    $mock->allows('getName')->andReturn($overrides['name'] ?? 'SSO User');

    return $mock;
}

// ---------------------------------------------------------------------------
// Redirect endpoint
// ---------------------------------------------------------------------------

test('GET /auth/google/redirect returns a redirect to Google', function () {
    Socialite::shouldReceive('driver->stateless->redirect')
        ->once()
        ->andReturn(redirect('https://accounts.google.com/o/oauth2/auth'));

    $this->get('/api/v1/auth/google/redirect')->assertRedirect();
});

test('GET /auth/microsoft/redirect returns a redirect to Microsoft', function () {
    Socialite::shouldReceive('driver->stateless->redirect')
        ->once()
        ->andReturn(redirect('https://login.microsoftonline.com/'));

    $this->get('/api/v1/auth/microsoft/redirect')->assertRedirect();
});

test('unknown provider is rejected with 404', function () {
    $this->get('/api/v1/auth/facebook/redirect')->assertNotFound();
});

// ---------------------------------------------------------------------------
// Callback — existing SSO identity
// ---------------------------------------------------------------------------

test('returning SSO user with existing identity row is logged in without creating new records', function () {
    $user = User::factory()->create(['status' => 'active']);

    SsoIdentity::create([
        'user_id' => $user->id,
        'provider' => 'google',
        'provider_subject_id' => 'stable-sub-id-999',
        'provider_email' => $user->email,
    ]);

    Socialite::shouldReceive('driver->stateless->user')
        ->once()
        ->andReturn(fakeSocialiteUser(['id' => 'stable-sub-id-999', 'email' => $user->email]));

    $response = $this->get('/api/v1/auth/google/callback');

    $response->assertRedirect(
        Config::string('app.frontend_url', 'http://localhost:5173').'/oauth/callback'
    );

    // last_login_at was set
    expect($user->fresh()->last_login_at)->not->toBeNull();

    // No duplicate SSO rows
    expect(SsoIdentity::count())->toBe(1);
});

// ---------------------------------------------------------------------------
// Callback — existing local user (link SSO identity)
// ---------------------------------------------------------------------------

test('SSO callback for email matching existing local user links SSO identity and logs in', function () {
    $user = User::factory()->create([
        'email' => 'local@example.com',
        'status' => 'active',
    ]);

    expect(SsoIdentity::count())->toBe(0);

    Socialite::shouldReceive('driver->stateless->user')
        ->once()
        ->andReturn(fakeSocialiteUser([
            'id' => 'brand-new-sub-id',
            'email' => 'local@example.com',
        ]));

    $response = $this->get('/api/v1/auth/google/callback');

    $response->assertRedirect(
        Config::string('app.frontend_url', 'http://localhost:5173').'/oauth/callback'
    );

    // SSO identity row was created and linked
    expect(SsoIdentity::count())->toBe(1);
    $identity = SsoIdentity::first();
    expect($identity->user_id)->toBe($user->id)
        ->and($identity->provider)->toBe('google')
        ->and($identity->provider_subject_id)->toBe('brand-new-sub-id');

    // Existing users table row is unchanged (no new user was created)
    expect(User::count())->toBe(1);
});

// ---------------------------------------------------------------------------
// Callback — JIT provisioning (brand new account)
// ---------------------------------------------------------------------------

test('SSO callback with no matching identity or email JIT-provisions a minimal incomplete account', function () {
    expect(User::count())->toBe(0);

    Socialite::shouldReceive('driver->stateless->user')
        ->once()
        ->andReturn(fakeSocialiteUser([
            'id' => 'jit-sub-999',
            'email' => 'brandnew@example.com',
            'name' => 'Brand New User',
        ]));

    $response = $this->get('/api/v1/auth/google/callback');

    // Redirected to /oauth/callback
    $response->assertRedirect(
        Config::string('app.frontend_url', 'http://localhost:5173').'/oauth/callback'
    );

    // A new user was provisioned
    expect(User::count())->toBe(1);
    $newUser = User::first();
    expect($newUser->email)->toBe('brandnew@example.com')
        ->and($newUser->status)->toBe('incomplete')
        ->and($newUser->password)->toBeNull()           // SSO-only; local login fails gracefully
        ->and($newUser->email_verified_at)->not->toBeNull(); // Provider verified the email

    // No role assigned
    expect($newUser->userRoles()->count())->toBe(0);

    // SSO identity row created
    expect(SsoIdentity::count())->toBe(1);
    $identity = SsoIdentity::first();
    expect($identity->provider_subject_id)->toBe('jit-sub-999')
        ->and($identity->provider)->toBe('google');

    // A second callback with the exact same provider_subject_id does NOT duplicate users or sso_identities
    Socialite::shouldReceive('driver->stateless->user')
        ->once()
        ->andReturn(fakeSocialiteUser([
            'id' => 'jit-sub-999',
            'email' => 'brandnew@example.com',
            'name' => 'Brand New User',
        ]));

    $secondResponse = $this->get('/api/v1/auth/google/callback');
    $secondResponse->assertRedirect();

    expect(User::count())->toBe(1);
    expect(SsoIdentity::count())->toBe(1);
});

test('SSO identity is matched by provider_subject_id, not by email — IDOR protection', function () {
    // User A has an SSO identity with provider_subject_id = 'user-a-sub'
    $userA = User::factory()->create(['email' => 'user-a@example.com', 'status' => 'active']);
    SsoIdentity::create([
        'user_id' => $userA->id,
        'provider' => 'google',
        'provider_subject_id' => 'user-a-sub',
        'provider_email' => 'user-a@example.com',
    ]);

    // An attacker presents user-a@example.com's email but their own subject ID
    // → must NOT log in as User A; instead provisions a new account
    Socialite::shouldReceive('driver->stateless->user')
        ->once()
        ->andReturn(fakeSocialiteUser([
            'id' => 'attacker-sub-different',
            'email' => 'user-a@example.com',   // same email, different sub
        ]));

    $this->get('/api/v1/auth/google/callback');

    // userA's identity is unchanged — attacker got a new account or linked differently
    expect(SsoIdentity::where('user_id', $userA->id)->count())->toBe(1);
    expect(SsoIdentity::first()->provider_subject_id)->toBe('user-a-sub');
});
