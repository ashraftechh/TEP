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

/**
 * RBAC Boundary Tests (IDOR Prevention & Client Claim Non-Trust).
 *
 * CRITICAL SAFETY BOUNDS:
 * - test_scoped_company_representative_cannot_access_other_company (Test #4)
 * - test_permission_check_does_not_trust_client_supplied_role (Test #6)
 *
 * The above two test cases verify that scoped RBAC prevents cross-resource unauthorized
 * data access (IDOR) and that client-supplied authorization claims in request payloads
 * or headers are completely ignored. They MUST NEVER be weakened or removed in refactors.
 */
class RbacScopeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Route::middleware(['api', 'permission:company.own.manage,company'])
            ->get('/companies/{company}/manage', fn () => response()->json(['status' => 'ok']));

        Route::middleware(['api', 'permission:company.own.manage,company'])
            ->post('/companies/{company}/manage', fn () => response()->json(['status' => 'ok']));
    }

    /**
     * 1. Authenticated user without any role is denied with 403.
     */
    public function test_user_without_any_role_is_denied(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/companies/5/manage');

        $response->assertStatus(403)
            ->assertExactJson(['message' => 'This action is unauthorized.']);
    }

    /**
     * 2. Unauthenticated guest request is denied with 401 (distinct from 403).
     */
    public function test_guest_is_denied_with_401_not_403(): void
    {
        $response = $this->getJson('/companies/5/manage');

        $response->assertStatus(401)
            ->assertExactJson(['message' => 'Unauthenticated.']);
    }

    /**
     * 3. Scoped company representative can access their own assigned company.
     */
    public function test_scoped_company_representative_can_access_own_company(): void
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

        $response = $this->actingAs($user)->getJson('/companies/5/manage');

        $response->assertOk()
            ->assertExactJson(['status' => 'ok']);
    }

    /**
     * 4. Scoped company representative CANNOT access another company (cross-company IDOR prevention).
     *
     * CRITICAL IDOR SAFETY TEST: Must never be removed or weakened.
     */
    public function test_scoped_company_representative_cannot_access_other_company(): void
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

        // Attempting access to Company #6 when only scoped to Company #5
        $response = $this->actingAs($user)->getJson('/companies/6/manage');

        $response->assertStatus(403)
            ->assertExactJson(['message' => 'This action is unauthorized.']);
    }

    /**
     * 5. Global (null-scope) role bypasses specific resource scope restrictions.
     */
    public function test_global_role_bypasses_scope_check(): void
    {
        $user = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'training_coordinator']);
        $permission = Permission::firstOrCreate(['name' => 'company.own.manage']);
        $role->permissions()->syncWithoutDetaching([$permission->id]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $role->id,
            'scope_type' => null,
            'scope_id' => null,
        ]);

        $response = $this->actingAs($user)->getJson('/companies/999/manage');

        $response->assertOk()
            ->assertExactJson(['status' => 'ok']);
    }

    /**
     * 6. Authorization checks rely strictly on DB records, ignoring client-supplied role/permission claims (BUG-002).
     *
     * CRITICAL SAFETY TEST: Must never be removed or weakened.
     */
    public function test_permission_check_does_not_trust_client_supplied_role(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->withHeaders([
                'X-Role' => 'super_admin',
                'X-Permissions' => 'company.own.manage',
            ])
            ->postJson('/companies/5/manage', [
                'role' => 'super_admin',
                'permissions' => ['company.own.manage'],
                'scope_type' => null,
                'scope_id' => null,
            ]);

        $response->assertStatus(403)
            ->assertExactJson(['message' => 'This action is unauthorized.']);
    }
}
