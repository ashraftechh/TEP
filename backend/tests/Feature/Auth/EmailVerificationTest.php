<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\URL;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

/**
 * Helper: build a valid signed verification URL for the given user.
 */
function verificationUrlFor(User $user): string
{
    return URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $user->id, 'hash' => sha1($user->email)],
    );
}

/**
 * Helper: extract just the path + query from an absolute signed URL
 * so the test hits the route through the test HTTP client correctly.
 */
function verificationPathFor(User $user): string
{
    $full = verificationUrlFor($user);
    $parsed = parse_url($full);

    return $parsed['path'].'?'.($parsed['query'] ?? '');
}

// ---------------------------------------------------------------------------
// Success path
// ---------------------------------------------------------------------------

test('valid signed link verifies email, activates account, and returns 200', function () {
    Event::fake([Verified::class]);

    $user = User::factory()->unverified()->create(['status' => 'pending']);

    Sanctum::actingAs($user);

    $response = $this->getJson(verificationPathFor($user));

    $response->assertOk()
        ->assertJson([
            'message' => __('auth.email_verified'),
        ]);

    $user->refresh();
    expect($user->email_verified_at)->not->toBeNull()
        ->and($user->status)->toBe('active');

    Event::assertDispatched(Verified::class);
});

test('already-verified user hitting the link again returns 200 without re-dispatching event or altering active status', function () {
    Event::fake([Verified::class]);

    $user = User::factory()->create([
        'email_verified_at' => now(),
        'status' => 'active',
    ]);

    Sanctum::actingAs($user);

    $response = $this->getJson(verificationPathFor($user));

    $response->assertOk()
        ->assertJson(['message' => __('auth.email_verified')]);

    // Status must remain unchanged
    expect($user->fresh()->status)->toBe('active');

    Event::assertNotDispatched(Verified::class);
});

// ---------------------------------------------------------------------------
// Security: tampered / expired signature
// ---------------------------------------------------------------------------

test('tampered hash in URL is rejected with 403', function () {
    $user = User::factory()->unverified()->create(['status' => 'pending']);

    Sanctum::actingAs($user);

    // Correct id but wrong hash
    $url = URL::temporarySignedRoute(
        'verification.verify',
        now()->addMinutes(60),
        ['id' => $user->id, 'hash' => sha1('wrong@email.com')],
    );

    $parsed = parse_url($url);
    $path = $parsed['path'].'?'.($parsed['query'] ?? '');

    $this->getJson($path)->assertStatus(403);

    expect($user->fresh()->email_verified_at)->toBeNull()
        ->and($user->fresh()->status)->toBe('pending');
});

test('expired signed URL is rejected with 403', function () {
    $user = User::factory()->unverified()->create(['status' => 'pending']);

    Sanctum::actingAs($user);

    // URL that expired 1 minute ago
    $expiredUrl = URL::temporarySignedRoute(
        'verification.verify',
        now()->subMinute(),
        ['id' => $user->id, 'hash' => sha1($user->email)],
    );

    $parsed = parse_url($expiredUrl);
    $path = $parsed['path'].'?'.($parsed['query'] ?? '');

    $this->getJson($path)->assertStatus(403);
});

test('id mismatch — another user cannot verify with someone else\'s link', function () {
    $owner = User::factory()->unverified()->create(['status' => 'pending']);
    $attacker = User::factory()->unverified()->create(['status' => 'pending']);

    Sanctum::actingAs($attacker);

    // Link belongs to $owner, but $attacker is authenticated
    $response = $this->getJson(verificationPathFor($owner));

    // Laravel's EmailVerificationRequest will reject because the id doesn't
    // match the authenticated user → 403
    $response->assertStatus(403);

    expect($attacker->fresh()->email_verified_at)->toBeNull();
});

// ---------------------------------------------------------------------------
// Security: unauthenticated access
// ---------------------------------------------------------------------------

test('unauthenticated guest accessing verification link returns 401', function () {
    $user = User::factory()->unverified()->create(['status' => 'pending']);

    $this->getJson(verificationPathFor($user))->assertStatus(401);
});

// ---------------------------------------------------------------------------
// Business logic: status only changes from pending → active, not other values
// ---------------------------------------------------------------------------

test('suspended user who verifies email does not get promoted to active', function () {
    Event::fake([Verified::class]);

    $user = User::factory()->unverified()->create(['status' => 'suspended']);

    Sanctum::actingAs($user);

    $this->getJson(verificationPathFor($user))->assertOk();

    $user->refresh();
    expect($user->email_verified_at)->not->toBeNull()
        ->and($user->status)->toBe('suspended'); // unchanged — not pending
});
