<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\Auth\VerifyEmailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('unverified authenticated user can request a new verification link', function () {
    Notification::fake();

    $user = User::factory()->unverified()->create();

    Sanctum::actingAs($user);

    $response = $this->postJson('/api/v1/auth/email/resend');

    $response->assertOk()
        ->assertJson([
            'message' => __('auth.verification_link_sent'),
        ]);

    Notification::assertSentTo($user, VerifyEmailNotification::class);
});

test('already verified user receives identical 200 response without sending a notification', function () {
    Notification::fake();

    $user = User::factory()->create([
        'email_verified_at' => now(),
    ]);

    Sanctum::actingAs($user);

    $response = $this->postJson('/api/v1/auth/email/resend');

    $response->assertOk()
        ->assertJson([
            'message' => __('auth.verification_link_sent'),
        ]);

    Notification::assertNothingSent();
});

test('unauthenticated guest request to resend verification link is rejected with 401', function () {
    $response = $this->postJson('/api/v1/auth/email/resend');

    $response->assertStatus(401);
});

test('resend verification link endpoint is rate limited to 6 requests per minute', function () {
    Notification::fake();

    $user = User::factory()->unverified()->create();

    Sanctum::actingAs($user);

    // First 6 requests should succeed
    for ($i = 0; $i < 6; $i++) {
        $this->postJson('/api/v1/auth/email/resend')->assertOk();
    }

    // 7th request should be rate-limited
    $response = $this->postJson('/api/v1/auth/email/resend');

    $response->assertStatus(429);
});
