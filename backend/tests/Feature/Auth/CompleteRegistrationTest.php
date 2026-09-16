<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Ensure roles exist for testing
    Role::firstOrCreate(
        ['name' => 'student'],
        ['label' => ['en' => 'Student', 'ar' => 'طالب'], 'is_system' => true]
    );

    Role::firstOrCreate(
        ['name' => 'company_representative'],
        ['label' => ['en' => 'Company Representative', 'ar' => 'ممثل شركة'], 'is_system' => true]
    );
});

// ---------------------------------------------------------------------------
// Authorization & Guard checks
// ---------------------------------------------------------------------------

test('unauthenticated guest cannot access complete registration endpoint', function () {
    $this->postJson('/api/v1/auth/complete-registration', [
        'account_type' => 'student',
    ])->assertUnauthorized();
});

test('user with active status cannot access complete registration endpoint and receives 403', function () {
    $user = User::factory()->create([
        'status' => 'active',
        'email_verified_at' => now(),
    ]);

    Sanctum::actingAs($user);

    $response = $this->postJson('/api/v1/auth/complete-registration', [
        'account_type' => 'student',
        'major_id' => 1,
    ]);

    $response->assertStatus(403)
        ->assertJsonPath('error_code', 'registration_already_complete')
        ->assertJsonPath('message', __('auth.registration_already_complete'));

    // Critical: no side-effect rows must be created on a rejected attempt
    $this->assertDatabaseMissing('student_profiles', ['user_id' => $user->id]);
    $this->assertDatabaseMissing('companies', ['created_at' => now()->toDateString()]);
    $this->assertDatabaseMissing('user_roles', ['user_id' => $user->id]);
});

test('user with pending status cannot access complete registration endpoint and receives 403', function () {
    $user = User::factory()->create([
        'status' => 'pending',
    ]);

    Sanctum::actingAs($user);

    $response = $this->postJson('/api/v1/auth/complete-registration', [
        'account_type' => 'student',
        'major_id' => 1,
    ]);

    $response->assertStatus(403)
        ->assertJsonPath('error_code', 'registration_already_complete');
});

// ---------------------------------------------------------------------------
// Validation rules
// ---------------------------------------------------------------------------

test('validation fails when account_type is missing or invalid', function () {
    $user = User::factory()->create(['status' => 'incomplete']);
    Sanctum::actingAs($user);

    $this->postJson('/api/v1/auth/complete-registration', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['account_type']);

    $this->postJson('/api/v1/auth/complete-registration', ['account_type' => 'invalid_type'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['account_type']);
});

test('validation fails when completing as student without valid major_id', function () {
    $user = User::factory()->create(['status' => 'incomplete']);
    Sanctum::actingAs($user);

    $this->postJson('/api/v1/auth/complete-registration', [
        'account_type' => 'student',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['major_id']);

    $this->postJson('/api/v1/auth/complete-registration', [
        'account_type' => 'student',
        'major_id' => 99999, // Nonexistent
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['major_id']);
});

test('completing registration as company is rejected with 422', function () {
    $user = User::factory()->create(['status' => 'incomplete']);
    Sanctum::actingAs($user);

    $this->postJson('/api/v1/auth/complete-registration', [
        'account_type' => 'company',
        'company_name' => 'Yemen Tech Solutions',
        'industry_id' => 1,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['account_type']);
});
