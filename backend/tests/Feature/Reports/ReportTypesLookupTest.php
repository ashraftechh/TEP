<?php

declare(strict_types=1);

namespace Tests\Feature\Reports;

use App\Models\Role;
use App\Models\StudentProfile;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\ReportTypeSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportTypesLookupTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(PermissionSeeder::class);
        $this->seed(ReportTypeSeeder::class);
    }

    public function test_authenticated_student_can_list_active_report_types(): void
    {
        $role = Role::where('name', 'student')->firstOrFail();
        $user = User::factory()->create(['status' => 'active', 'email_verified_at' => now()]);
        StudentProfile::create([
            'user_id' => $user->id,
            'student_number' => 'STU000001',
            'university_name' => 'Saba Region University',
            'level_year' => 4,
        ]);
        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $role->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/report-types');

        $response->assertStatus(200)
            ->assertJsonCount(4, 'data');

        $codes = collect($response->json('data'))->pluck('code')->all();
        $this->assertEqualsCanonicalizing(['daily', 'weekly', 'monthly', 'final'], $codes);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->getJson('/api/v1/report-types');

        $response->assertStatus(401);
    }
}
