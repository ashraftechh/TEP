<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\Auth\ResetPasswordNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Intercept all outbound mail/notifications so nothing actually sends.
    Mail::fake();
    Notification::fake();
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

test('validation fails when email is missing', function () {
    $this->postJson('/api/v1/auth/forgot-password', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

test('validation fails when email is malformed', function () {
    $this->postJson('/api/v1/auth/forgot-password', ['email' => 'not-an-email'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

// ---------------------------------------------------------------------------
// Security: account enumeration prevention
// ---------------------------------------------------------------------------

test('returns 200 with generic message for a registered email', function () {
    $user = User::factory()->create(['status' => 'active']);

    $response = $this->postJson('/api/v1/auth/forgot-password', [
        'email' => $user->email,
    ]);

    $response->assertOk()
        ->assertJsonPath('message', __('auth.password_reset_link_sent'));
});

test('returns 404 with error message for a nonexistent email', function () {
    $response = $this->postJson('/api/v1/auth/forgot-password', [
        'email' => 'nobody@notregistered.example',
    ]);

    $response->assertNotFound()
        ->assertJsonPath('message', __('auth.email_not_found'))
        ->assertJsonPath('errors.email.0', __('auth.email_not_found'));
});

// ---------------------------------------------------------------------------
// Password broker integration
// ---------------------------------------------------------------------------

test('password broker receives the reset link request for a valid user', function () {
    $user = User::factory()->create(['status' => 'active']);

    Password::shouldReceive('sendResetLink')
        ->once()
        ->with(['email' => $user->email])
        ->andReturn(Password::RESET_LINK_SENT);

    $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])
        ->assertOk();
});

// ---------------------------------------------------------------------------
// Authenticated users are blocked (guest middleware)
// ---------------------------------------------------------------------------

test('authenticated user cannot access forgot-password endpoint', function () {
    $user = User::factory()->create(['status' => 'active']);

    $this->actingAs($user)
        ->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])
        ->assertStatus(409); // Breeze API guest middleware returns 409 for authenticated JSON requests
});

test('password reset notification is dispatched with correct frontend SPA url', function () {
    $user = User::factory()->create(['status' => 'active']);

    $this->postJson('/api/v1/auth/forgot-password', ['email' => $user->email])
        ->assertOk();

    Notification::assertSentTo($user, ResetPasswordNotification::class, function ($notification) use ($user) {
        $mail = $notification->toMail($user);
        $url = $mail->viewData['url'] ?? '';

        return str_contains($url, config('app.frontend_url').'/reset-password')
            && str_contains($url, 'token=')
            && str_contains($url, 'email='.urlencode($user->email));
    });
});
