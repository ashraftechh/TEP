<?php

declare(strict_types=1);

namespace Tests\Feature\Companies;

use App\Models\Company;
use App\Models\CompanyRepresentative;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class CompanyJoinTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'company_representative'], [
            'display_name' => ['en' => 'Company Representative', 'ar' => 'ممثل الشركة'],
            'description' => 'Representative of an accredited company partner.',
        ]);
    }

    private function generateSignedUrl(string $routeName, Company $company, string $email, int $days = 7): string
    {
        return URL::temporarySignedRoute(
            $routeName,
            now()->addDays($days),
            [
                'company' => $company->id,
                'email' => $email,
            ]
        );
    }

    public function test_get_join_details_returns_company_and_email(): void
    {
        $company = Company::factory()->create([
            'status' => 'approved',
        ]);

        $url = $this->generateSignedUrl('company.join', $company, 'newbie@company.org');

        $response = $this->getJson($url);

        $response->assertStatus(200)
            ->assertJson([
                'data' => [
                    'company_id' => $company->id,
                    'email' => 'newbie@company.org',
                ],
            ]);
    }

    public function test_get_join_details_returns_410_if_company_is_not_approved(): void
    {
        $unapprovedStatuses = ['pending_verification', 'under_review', 'rejected', 'changes_requested', 'suspended'];

        foreach ($unapprovedStatuses as $status) {
            $company = Company::factory()->create([
                'status' => $status,
            ]);

            $url = $this->generateSignedUrl('company.join', $company, 'test@company.org');

            $response = $this->getJson($url);

            $response->assertStatus(410)
                ->assertJson([
                    'message' => __('auth.invite_invalid_or_used'),
                ]);
        }
    }

    public function test_get_join_details_rejects_tampered_or_expired_signature(): void
    {
        $company = Company::factory()->create([
            'status' => 'approved',
        ]);

        $validUrl = $this->generateSignedUrl('company.join', $company, 'test@company.org');
        $tamperedUrl = $validUrl.'tampered';

        $this->getJson($tamperedUrl)->assertStatus(403);

        $expiredUrl = $this->generateSignedUrl('company.join', $company, 'test@company.org', -1);
        $this->getJson($expiredUrl)->assertStatus(403);
    }

    public function test_register_creates_pending_user_with_unverified_email_primary_rep_and_scoped_role(): void
    {
        $company = Company::factory()->create([
            'status' => 'approved',
        ]);

        $url = $this->generateSignedUrl('company.join.register', $company, 'founder@company.org');

        $response = $this->postJson($url, [
            'name' => 'Founder User',
            'email' => 'founder@company.org',
            'phone' => '+967771234567',
            'password' => 'SecurePass123!',
            'password_confirmation' => 'SecurePass123!',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Founder User')
            ->assertJsonPath('data.email', 'founder@company.org')
            ->assertJsonPath('data.status', 'pending');

        // Assert database records
        $user = User::where('email', 'founder@company.org')->first();
        $this->assertNotNull($user);
        $this->assertSame('pending', $user->status);
        $this->assertNull($user->email_verified_at);
        $this->assertTrue(Hash::check('SecurePass123!', $user->password));

        // First joiner must have is_primary = true
        $this->assertDatabaseHas('company_representatives', [
            'company_id' => $company->id,
            'user_id' => $user->id,
            'is_primary' => true,
        ]);

        // Scoped role assignment
        $this->assertDatabaseHas('user_roles', [
            'user_id' => $user->id,
            'scope_type' => 'company',
            'scope_id' => $company->id,
        ]);

        // User is authenticated
        $this->assertSame($user->id, Auth::id());
    }

    public function test_colleague_register_sets_is_primary_false_when_primary_already_exists(): void
    {
        $company = Company::factory()->create([
            'status' => 'approved',
        ]);

        $founder = User::factory()->create(['email' => 'founder@company.org']);
        CompanyRepresentative::create([
            'company_id' => $company->id,
            'user_id' => $founder->id,
            'is_primary' => true,
        ]);

        $url = $this->generateSignedUrl('company.join.register', $company, 'colleague@company.org');

        $response = $this->postJson($url, [
            'name' => 'Colleague Rep',
            'email' => 'colleague@company.org',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(201);

        $colleague = User::where('email', 'colleague@company.org')->first();
        $this->assertNotNull($colleague);
        $this->assertSame('pending', $colleague->status);
        $this->assertNull($colleague->email_verified_at);

        // Second joiner must have is_primary = false
        $this->assertDatabaseHas('company_representatives', [
            'company_id' => $company->id,
            'user_id' => $colleague->id,
            'is_primary' => false,
        ]);
    }

    public function test_register_returns_422_if_user_account_email_already_exists(): void
    {
        $company = Company::factory()->create([
            'status' => 'approved',
        ]);

        User::factory()->create([
            'email' => 'existing@company.org',
        ]);

        $url = $this->generateSignedUrl('company.join.register', $company, 'existing@company.org');

        $response = $this->postJson($url, [
            'name' => 'Duplicate User',
            'email' => 'existing@company.org',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_register_fails_on_validation_errors(): void
    {
        $company = Company::factory()->create([
            'status' => 'approved',
        ]);

        $url = $this->generateSignedUrl('company.join.register', $company, 'test@company.org');

        $response = $this->postJson($url, [
            'name' => '',
            'email' => 'invalid-email',
            'password' => 'short',
            'password_confirmation' => 'mismatch',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_substituting_different_email_in_signed_url_fails_with_403(): void
    {
        $company = Company::factory()->create([
            'status' => 'approved',
        ]);

        $validUrl = $this->generateSignedUrl('company.join', $company, 'authorized@company.org');
        $substitutedUrl = str_replace('authorized%40company.org', 'attacker%40company.org', $validUrl);
        if ($substitutedUrl === $validUrl) {
            $substitutedUrl = str_replace('authorized@company.org', 'attacker@company.org', $validUrl);
        }

        $response = $this->getJson($substitutedUrl);
        $response->assertStatus(403);
    }
}
