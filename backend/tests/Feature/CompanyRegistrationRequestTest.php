<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Industry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CompanyRegistrationRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_can_submit_company_registration_request(): void
    {
        $industry = Industry::factory()->create();

        $payload = [
            'name' => 'Acme Corporation',
            'email' => 'contact@acme.corp',
            'phone' => '+967 770 123 456',
            'industry_id' => $industry->id,
            'registration_number' => 'CR-987654',
            'website' => 'https://acme.corp',
            'description' => 'A leading software and logistics company.',
        ];

        $response = $this->postJson('/api/v1/companies/request', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'message' => __('companies.request_submitted_successfully'),
            ]);

        $this->assertDatabaseHas('companies', [
            'contact_email' => 'contact@acme.corp',
            'registration_number' => 'CR-987654',
            'industry_id' => $industry->id,
            'status' => 'pending_verification',
        ]);

        $company = Company::where('contact_email', 'contact@acme.corp')->first();
        $this->assertNotNull($company);
        $this->assertSame('Acme Corporation', $company->getTranslation('name', 'en'));
        $this->assertSame('Acme Corporation', $company->getTranslation('name', 'ar'));
        $this->assertSame('A leading software and logistics company.', $company->getTranslation('description', 'en'));
        $this->assertSame('A leading software and logistics company.', $company->getTranslation('description', 'ar'));

        // Assert NO company_representatives row was created (pre-account flow)
        $this->assertDatabaseCount('company_representatives', 0);
    }

    public function test_company_registration_request_validation_fails_on_missing_required_fields(): void
    {
        $response = $this->postJson('/api/v1/companies/request', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'contact_email']);
    }

    public function test_company_registration_request_fails_on_invalid_email_and_website(): void
    {
        $response = $this->postJson('/api/v1/companies/request', [
            'name' => 'Test Company',
            'email' => 'not-an-email',
            'website' => 'not-a-url',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['contact_email', 'website']);
    }

    public function test_company_registration_request_fails_on_nonexistent_industry_id(): void
    {
        $response = $this->postJson('/api/v1/companies/request', [
            'name' => 'Test Company',
            'email' => 'valid@company.com',
            'industry_id' => 99999,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['industry_id']);
    }

    public function test_duplicate_registration_request_by_email_is_rejected(): void
    {
        Company::factory()->create([
            'contact_email' => 'duplicate@company.com',
            'status' => 'pending_verification',
        ]);

        $response = $this->postJson('/api/v1/companies/request', [
            'name' => 'Duplicate Company Name',
            'email' => 'duplicate@company.com',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['contact_email']);
    }

    public function test_duplicate_registration_request_by_phone_is_rejected(): void
    {
        Company::factory()->create([
            'contact_email' => 'first@company.com',
            'phone' => '+967 770 123 456',
            'status' => 'pending_verification',
        ]);

        $response = $this->postJson('/api/v1/companies/request', [
            'name' => 'Second Company Name',
            'email' => 'second@company.com',
            'phone' => '+967 770 123 456',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['phone']);
    }

    public function test_duplicate_registration_request_by_registration_number_is_rejected(): void
    {
        Company::factory()->create([
            'contact_email' => 'existing@company.com',
            'registration_number' => 'CR-112233',
            'status' => 'under_review',
        ]);

        $response = $this->postJson('/api/v1/companies/request', [
            'name' => 'Different Company Name',
            'email' => 'different@company.com',
            'registration_number' => 'CR-112233',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['registration_number']);

        // Assert no second row was created
        $this->assertDatabaseCount('companies', 1);
    }

    public function test_company_registration_request_response_contains_no_sensitive_data(): void
    {
        $industry = Industry::factory()->create();

        $response = $this->postJson('/api/v1/companies/request', [
            'name' => 'Clean Response Corp',
            'email' => 'clean@response.corp',
            'industry_id' => $industry->id,
            'registration_number' => 'CR-CLEAN-01',
        ]);

        $response->assertStatus(201)
            ->assertExactJson([
                'message' => __('companies.request_submitted_successfully'),
            ]);

        // Assert response contains no internal IDs or sensitive company model attributes
        $response->assertJsonMissing([
            'id',
            'status',
            'status_reason',
            'approved_by',
            'approved_at',
            'created_at',
            'updated_at',
        ]);
    }

    public function test_company_registration_request_is_rate_limited(): void
    {
        for ($i = 1; $i <= 3; $i++) {
            $response = $this->postJson('/api/v1/companies/request', [
                'name' => "Company {$i}",
                'email' => "rate-limit-{$i}@example.com",
            ]);
            $response->assertStatus(201);
        }

        // 4th request from same IP within the hour window must be throttled
        $response = $this->postJson('/api/v1/companies/request', [
            'name' => 'Company 4',
            'email' => 'rate-limit-4@example.com',
        ]);

        $response->assertStatus(429);
    }
}
