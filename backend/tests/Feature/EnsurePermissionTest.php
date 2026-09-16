<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class EnsurePermissionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Route::middleware(['api', 'permission:companies.approve'])
            ->get('/test-global-permission', fn () => response()->json(['message' => 'success']));

        Route::middleware(['api', 'permission:company.own.manage,company'])
            ->get('/test-scoped-permission/{company}', fn ($company) => response()->json(['message' => 'success']));
    }

    public function test_guest_access_returns_401(): void
    {
        $response = $this->getJson('/test-global-permission');

        $response->assertStatus(401)
            ->assertExactJson(['message' => 'Unauthenticated.']);
    }

    public function test_user_without_permission_returns_403(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/test-global-permission');

        $response->assertStatus(403)
            ->assertExactJson(['message' => 'This action is unauthorized.']);
    }

    public function test_user_with_global_permission_passes(): void
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'training_coordinator']);
        $permission = Permission::firstOrCreate(['name' => 'companies.approve']);
        $role->permissions()->syncWithoutDetaching([$permission->id]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $role->id,
            'scope_type' => null,
            'scope_id' => null,
        ]);

        $response = $this->actingAs($user)->getJson('/test-global-permission');

        $response->assertOk()
            ->assertExactJson(['message' => 'success']);
    }

    public function test_user_with_matching_scoped_permission_passes(): void
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'company_representative']);
        $permission = Permission::firstOrCreate(['name' => 'company.own.manage']);
        $role->permissions()->syncWithoutDetaching([$permission->id]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $role->id,
            'scope_type' => 'company',
            'scope_id' => 5,
        ]);

        $response = $this->actingAs($user)->getJson('/test-scoped-permission/5');

        $response->assertOk()
            ->assertExactJson(['message' => 'success']);
    }

    public function test_user_with_mismatched_scoped_permission_returns_403(): void
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'company_representative']);
        $permission = Permission::firstOrCreate(['name' => 'company.own.manage']);
        $role->permissions()->syncWithoutDetaching([$permission->id]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $role->id,
            'scope_type' => 'company',
            'scope_id' => 5,
        ]);

        $response = $this->actingAs($user)->getJson('/test-scoped-permission/6');

        $response->assertStatus(403)
            ->assertExactJson(['message' => 'This action is unauthorized.']);
    }
}
