<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Register temporary test routes using the 'verified' middleware alias
    Route::middleware(['auth:sanctum', 'verified'])->get('/api/v1/test/protected-route', function () {
        return response()->json(['message' => 'Access granted to verified user.']);
    });
});

test('verified active user can access verified protected route', function () {
    $user = User::factory()->create([
        'email_verified_at' => now(),
        'status' => 'active',
    ]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/v1/test/protected-route');

    $response->assertOk()
        ->assertJson(['message' => 'Access granted to verified user.']);
});

test('pending unverified user is rejected with 403 and error_code email_not_verified', function () {
    $user = User::factory()->unverified()->create([
        'status' => 'pending',
    ]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/v1/test/protected-route');

    $response->assertStatus(403)
        ->assertJson([
            'message' => __('auth.email_not_verified'),
            'error_code' => 'email_not_verified',
        ]);
});

test('suspended user is rejected with 403 and error_code account_suspended', function () {
    $user = User::factory()->create([
        'email_verified_at' => now(),
        'status' => 'suspended',
    ]);

    Sanctum::actingAs($user);

    $response = $this->getJson('/api/v1/test/protected-route');

    $response->assertStatus(403)
        ->assertJson([
            'message' => __('auth.account_suspended'),
            'error_code' => 'account_suspended',
        ]);
});

test('unauthenticated guest is rejected with 401 before reaching verified check', function () {
    $response = $this->getJson('/api/v1/test/protected-route');

    $response->assertStatus(401);
});
