<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('unauthenticated guest cannot access POST /api/v1/auth/logout', function () {
    $this->postJson('/api/v1/auth/logout')
        ->assertUnauthorized();
});

test('authenticated user can log out and receives 204 No Content', function () {
    $user = User::factory()->create([
        'status' => 'active',
        'email_verified_at' => now(),
    ]);

    Sanctum::actingAs($user);

    $response = $this->postJson('/api/v1/auth/logout');

    $response->assertNoContent();
    $this->assertGuest('web');
});

test('logging out with a personal access token deletes the token from database', function () {
    $user = User::factory()->create([
        'status' => 'active',
        'email_verified_at' => now(),
    ]);

    $token = $user->createToken('test-token');

    $response = $this->withToken($token->plainTextToken)
        ->postJson('/api/v1/auth/logout');

    $response->assertNoContent();

    // Verify token was revoked from database
    expect($user->tokens()->count())->toBe(0);
});

test('pending user can log out (logout is not blocked by account status)', function () {
    // Logout must work regardless of status — a pending user who just registered
    // and wants to log out should not be stuck in an authenticated state.
    $user = User::factory()->create([
        'status' => 'pending',
        'email_verified_at' => null,
    ]);

    Sanctum::actingAs($user);

    $this->postJson('/api/v1/auth/logout')
        ->assertNoContent();

    $this->assertGuest('web');
});

test('bearer token is deleted from the database so future requests with the same token are rejected', function () {
    // After logout, the personal_access_tokens row is deleted, meaning
    // any subsequent request bearing that token would be rejected by Sanctum.
    // We assert the DB state directly; Sanctum's in-process guard cache makes
    // it impossible to re-test the same token within one test request cycle.
    $user = User::factory()->create([
        'status' => 'active',
        'email_verified_at' => now(),
    ]);

    $token = $user->createToken('test-token');

    expect($user->tokens()->count())->toBe(1);

    $this->withToken($token->plainTextToken)
        ->postJson('/api/v1/auth/logout')
        ->assertNoContent();

    // Token row is gone — any future request with this token will be rejected by Sanctum
    expect($user->fresh()->tokens()->count())->toBe(0);
});

test('logout with multiple tokens only revokes the current token', function () {
    $user = User::factory()->create([
        'status' => 'active',
        'email_verified_at' => now(),
    ]);

    $currentToken = $user->createToken('current-device');
    $user->createToken('other-device');

    expect($user->tokens()->count())->toBe(2);

    $this->withToken($currentToken->plainTextToken)
        ->postJson('/api/v1/auth/logout')
        ->assertNoContent();

    // Only the used token is revoked; the other device token remains
    expect($user->fresh()->tokens()->count())->toBe(1);
});
