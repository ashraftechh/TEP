<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\LookupSeeder;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Filament\Panel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserPermissionsResourceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(PermissionSeeder::class);
        $this->seed(LookupSeeder::class);
    }

    public function test_auth_me_returns_permissions_array_for_student(): void
    {
        $user = User::factory()->create(['status' => 'active']);
        $role = Role::where('name', 'student')->firstOrFail();
        UserRole::create(['user_id' => $user->id, 'role_id' => $role->id]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/auth/me');

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'email',
                    'roles',
                    'permissions',
                ],
            ]);

        $permissions = $response->json('data.permissions');
        $this->assertIsArray($permissions);
        $this->assertContains('student_profiles.own.view', $permissions);
        $this->assertContains('applications.own.create', $permissions);
        $this->assertContains('opportunities.view_any', $permissions);
        $this->assertNotContains('opportunities.own.create', $permissions);
        $this->assertNotContains('companies.approve', $permissions);
    }

    public function test_auth_me_returns_permissions_array_for_company_rep(): void
    {
        $user = User::factory()->create(['status' => 'active']);
        $role = Role::where('name', 'company_representative')->firstOrFail();
        UserRole::create(['user_id' => $user->id, 'role_id' => $role->id]);

        Sanctum::actingAs($user);

        $response = $this->getJson('/api/v1/auth/me');

        $response->assertOk();
        $permissions = $response->json('data.permissions');
        $this->assertContains('opportunities.own.create', $permissions);
        $this->assertContains('companies.own.update', $permissions);
        $this->assertContains('company_representatives.own.view', $permissions);
        $this->assertNotContains('companies.approve', $permissions);
    }

    public function test_application_area_access_boundaries(): void
    {
        $studentUser = User::factory()->create();
        $studentRole = Role::where('name', 'student')->firstOrFail();
        UserRole::create(['user_id' => $studentUser->id, 'role_id' => $studentRole->id]);

        $coordinatorUser = User::factory()->create();
        $coordinatorRole = Role::where('name', 'training_coordinator')->firstOrFail();
        UserRole::create(['user_id' => $coordinatorUser->id, 'role_id' => $coordinatorRole->id]);

        $superAdminUser = User::factory()->create();
        $superAdminRole = Role::where('name', 'super_admin')->firstOrFail();
        UserRole::create(['user_id' => $superAdminUser->id, 'role_id' => $superAdminRole->id]);

        $panel = \Mockery::mock(Panel::class);

        $this->assertFalse($studentUser->canAccessPanel($panel));
        $this->assertTrue($coordinatorUser->canAccessPanel($panel));
        $this->assertTrue($superAdminUser->canAccessPanel($panel));
    }

    public function test_backend_roles_cannot_login_via_frontend_login_api(): void
    {
        $adminUser = User::factory()->create([
            'email' => 'admin@univ.edu',
            'password' => 'SecurePass123!',
            'status' => 'active',
        ]);
        $adminRole = Role::where('name', 'super_admin')->firstOrFail();
        UserRole::create(['user_id' => $adminUser->id, 'role_id' => $adminRole->id]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@univ.edu',
            'password' => 'SecurePass123!',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'error_code' => 'unauthorized_application_area',
            ]);
    }
}
