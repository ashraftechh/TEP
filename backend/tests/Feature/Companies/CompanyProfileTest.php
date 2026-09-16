<?php

declare(strict_types=1);

namespace Tests\Feature\Companies;

use App\Models\Application;
use App\Models\Company;
use App\Models\CompanyRepresentative;
use App\Models\File;
use App\Models\Industry;
use App\Models\Opportunity;
use App\Models\OpportunityType;
use App\Models\Role;
use App\Models\StudentProfile;
use App\Models\User;
use App\Models\UserRole;
use Database\Seeders\PermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CompanyProfileTest extends TestCase
{
    use RefreshDatabase;

    private Role $repRole;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
        $this->seed(PermissionSeeder::class);
        $this->repRole = Role::where('name', 'company_representative')->firstOrFail();
    }

    private function createRepresentativeUser(Company $company, bool $isPrimary = true): User
    {
        $user = User::factory()->create([
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        CompanyRepresentative::create([
            'company_id' => $company->id,
            'user_id' => $user->id,
            'is_primary' => $isPrimary,
            'job_title' => 'HR Manager',
        ]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $this->repRole->id,
            'scope_type' => 'company',
            'scope_id' => $company->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        return $user;
    }

    public function test_get_company_unauthenticated_returns_401(): void
    {
        $response = $this->getJson('/api/v1/company');

        $response->assertStatus(401);
    }

    public function test_get_company_when_user_has_no_company_returns_404(): void
    {
        $user = User::factory()->create([
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $this->repRole->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        $response = $this->actingAs($user)->getJson('/api/v1/company');

        $response->assertStatus(404)
            ->assertJson([
                'message' => __('companies.no_company'),
            ]);
    }

    public function test_get_company_returns_full_company_details_with_bilingual_fields(): void
    {
        $industry = Industry::create([
            'code' => 'TECH',
            'name' => ['en' => 'Technology', 'ar' => 'تكنولوجيا'],
            'is_active' => true,
        ]);

        $company = Company::create([
            'name' => ['en' => 'Acme Corp', 'ar' => 'شركة أكمي'],
            'registration_number' => 'REG-12345',
            'industry_id' => $industry->id,
            'description' => ['en' => 'Software solutions', 'ar' => 'حلول برمجية'],
            'contact_email' => 'contact@acme.com',
            'phone' => '+967771234567',
            'website' => 'https://acme.com',
            'address' => 'Main St, Sanaa',
            'city' => 'Sanaa',
            'established_year' => 2018,
            'employees_count' => '50-100',
            'status' => 'approved',
        ]);

        $user = $this->createRepresentativeUser($company);

        $response = $this->actingAs($user)->getJson('/api/v1/company');

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $company->id)
            ->assertJsonPath('data.name.en', 'Acme Corp')
            ->assertJsonPath('data.name.ar', 'شركة أكمي')
            ->assertJsonPath('data.registration_number', 'REG-12345')
            ->assertJsonPath('data.industry_id', $industry->id)
            ->assertJsonPath('data.industry.id', $industry->id)
            ->assertJsonPath('data.industry.code', 'TECH')
            ->assertJsonPath('data.description.en', 'Software solutions')
            ->assertJsonPath('data.description.ar', 'حلول برمجية')
            ->assertJsonPath('data.email', 'contact@acme.com')
            ->assertJsonPath('data.contact_email', 'contact@acme.com')
            ->assertJsonPath('data.phone', '+967771234567')
            ->assertJsonPath('data.website', 'https://acme.com')
            ->assertJsonPath('data.address', 'Main St, Sanaa')
            ->assertJsonPath('data.city', 'Sanaa')
            ->assertJsonPath('data.established_year', 2018)
            ->assertJsonPath('data.employees_count', '50-100')
            ->assertJsonPath('data.status', 'approved')
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'name',
                    'registration_number',
                    'industry_id',
                    'industry' => ['id', 'code', 'name', 'is_active'],
                    'description',
                    'email',
                    'contact_email',
                    'phone',
                    'website',
                    'address',
                    'city',
                    'established_year',
                    'employees_count',
                    'logo',
                    'logo_url',
                    'logo_file_id',
                    'status',
                    'status_reason',
                    'created_at',
                    'updated_at',
                ],
                'message',
            ]);
    }

    public function test_get_company_with_logo_and_changes_requested_status(): void
    {
        $logoFile = File::create([
            'uploader_id' => null,
            'fileable_type' => Company::class,
            'fileable_id' => null,
            'purpose' => 'company_logo',
            'disk' => 'public',
            'path' => 'logos/company1.png',
            'original_name' => 'logo.png',
            'mime_type' => 'image/png',
            'size_bytes' => 12345,
            'checksum' => 'abc123hash',
        ]);

        $company = Company::create([
            'name' => ['en' => 'Beta Tech', 'ar' => 'بيتا للتقنية'],
            'registration_number' => 'REG-99999',
            'contact_email' => 'contact@beta.com',
            'logo_file_id' => $logoFile->id,
            'status' => 'changes_requested',
            'status_reason' => 'Please provide updated commercial registration certificate.',
        ]);

        $user = $this->createRepresentativeUser($company);

        $response = $this->actingAs($user)->getJson('/api/v1/company');

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $company->id)
            ->assertJsonPath('data.logo_file_id', $logoFile->id)
            ->assertJsonPath('data.status', 'changes_requested')
            ->assertJsonPath('data.status_reason', 'Please provide updated commercial registration certificate.');

        $this->assertNotNull($response->json('data.logo'));
    }

    public function test_update_company_unauthenticated_returns_401(): void
    {
        $response = $this->patchJson('/api/v1/company', [
            'name_ar' => 'شركة أكمي المحدثة',
            'name_en' => 'Acme Corp Updated',
        ]);

        $response->assertStatus(401);
    }

    public function test_update_company_unauthorized_user_without_permission_returns_403(): void
    {
        $studentRole = Role::where('name', 'student')->firstOrFail();
        $user = User::factory()->create([
            'status' => 'active',
            'email_verified_at' => now(),
        ]);

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $studentRole->id,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);

        $response = $this->actingAs($user)->patchJson('/api/v1/company', [
            'name_ar' => 'شركة جديدة',
            'name_en' => 'New Company',
        ]);

        $response->assertStatus(403);
    }

    public function test_update_company_validation_failure_returns_422(): void
    {
        $company = Company::create([
            'name' => ['en' => 'Acme Corp', 'ar' => 'شركة أكمي'],
            'status' => 'approved',
        ]);

        $user = $this->createRepresentativeUser($company);

        $response = $this->actingAs($user)->patchJson('/api/v1/company', [
            'name_ar' => '', // required
            'name_en' => '', // required
            'website' => 'invalid-url',
            'established_year' => 1800, // min 1900
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name_ar', 'name_en', 'website', 'established_year']);
    }

    public function test_update_company_successful_updates_fields_and_preserves_status(): void
    {
        $industry = Industry::create([
            'code' => 'HEALTH',
            'name' => ['en' => 'Healthcare', 'ar' => 'الرعاية الصحية'],
            'is_active' => true,
        ]);

        $company = Company::create([
            'name' => ['en' => 'Original Name', 'ar' => 'الاسم الأصلي'],
            'description' => ['en' => 'Old desc', 'ar' => 'وصف قديم'],
            'contact_email' => 'old@company.com',
            'phone' => '+967770000000',
            'status' => 'approved',
            'status_reason' => null,
        ]);

        $user = $this->createRepresentativeUser($company);

        $response = $this->actingAs($user)->patchJson('/api/v1/company', [
            'name_ar' => 'شركة الرعاية الحديثة',
            'name_en' => 'Modern Healthcare Co.',
            'description_ar' => 'خدمات رعاية صحية متطورة',
            'description_en' => 'Advanced healthcare services',
            'industry_id' => $industry->id,
            'registration_number' => 'CR-556677',
            'email' => 'newcontact@moderncare.com',
            'phone' => '+967771112233',
            'website' => 'https://moderncare.com',
            'address' => 'Zubairi St',
            'city' => 'Sanaa',
            'established_year' => 2021,
            'employees_count' => '100-250',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.name.en', 'Modern Healthcare Co.')
            ->assertJsonPath('data.name.ar', 'شركة الرعاية الحديثة')
            ->assertJsonPath('data.description.en', 'Advanced healthcare services')
            ->assertJsonPath('data.description.ar', 'خدمات رعاية صحية متطورة')
            ->assertJsonPath('data.industry_id', $industry->id)
            ->assertJsonPath('data.registration_number', 'CR-556677')
            ->assertJsonPath('data.email', 'newcontact@moderncare.com')
            ->assertJsonPath('data.phone', '+967771112233')
            ->assertJsonPath('data.website', 'https://moderncare.com')
            ->assertJsonPath('data.address', 'Zubairi St')
            ->assertJsonPath('data.city', 'Sanaa')
            ->assertJsonPath('data.established_year', 2021)
            ->assertJsonPath('data.employees_count', '100-250')
            ->assertJsonPath('data.status', 'approved') // Status remains approved!
            ->assertJsonPath('message', __('companies.profile_updated_successfully'));

        $company->refresh();
        $this->assertSame('Modern Healthcare Co.', $company->getTranslation('name', 'en'));
        $this->assertSame('شركة الرعاية الحديثة', $company->getTranslation('name', 'ar'));
        $this->assertSame('CR-556677', $company->registration_number);
        $this->assertSame('approved', $company->status);
    }

    public function test_update_company_fails_when_registration_number_belongs_to_another_company(): void
    {
        Company::create([
            'name' => ['en' => 'Existing Co', 'ar' => 'شركة قائمة'],
            'registration_number' => 'CR-DUPLICATE',
            'status' => 'approved',
        ]);

        $company = Company::create([
            'name' => ['en' => 'My Co', 'ar' => 'شركتي'],
            'registration_number' => 'CR-ORIGINAL',
            'status' => 'approved',
        ]);

        $user = $this->createRepresentativeUser($company);

        $response = $this->actingAs($user)->patchJson('/api/v1/company', [
            'name_ar' => 'شركتي المحدثة',
            'name_en' => 'My Updated Co',
            'registration_number' => 'CR-DUPLICATE',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['registration_number']);
    }

    public function test_upload_logo_unauthenticated_returns_401(): void
    {
        Storage::fake('public');
        $file = UploadedFile::fake()->image('logo.png');

        $response = $this->postJson('/api/v1/company/logo', [
            'logo' => $file,
        ]);

        $response->assertStatus(401);
    }

    public function test_upload_logo_validation_failure_returns_422(): void
    {
        Storage::fake('public');
        $company = Company::create([
            'name' => ['en' => 'Acme Corp', 'ar' => 'شركة أكمي'],
            'status' => 'approved',
        ]);

        $user = $this->createRepresentativeUser($company);

        // Upload non-image (txt file)
        $txtFile = UploadedFile::fake()->create('document.pdf', 500, 'application/pdf');

        $response = $this->actingAs($user)->postJson('/api/v1/company/logo', [
            'logo' => $txtFile,
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['logo']);
    }

    public function test_upload_logo_successful_creates_file_and_updates_company(): void
    {
        Storage::fake('public');
        $company = Company::create([
            'name' => ['en' => 'Acme Corp', 'ar' => 'شركة أكمي'],
            'status' => 'approved',
        ]);

        $user = $this->createRepresentativeUser($company);

        $logo = UploadedFile::fake()->image('brand_logo.png', 300, 300);

        $response = $this->actingAs($user)->postJson('/api/v1/company/logo', [
            'logo' => $logo,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.id', $company->id)
            ->assertJsonPath('message', __('companies.logo_uploaded_successfully'));

        $this->assertNotNull($response->json('data.logo_file_id'));
        $this->assertNotNull($response->json('data.logo'));

        $company->refresh();
        $this->assertNotNull($company->logo_file_id);

        $fileModel = File::find($company->logo_file_id);
        $this->assertNotNull($fileModel);
        $this->assertSame('company_logo', $fileModel->purpose);
        $this->assertSame('clean', $fileModel->scan_status);
        $this->assertSame($user->id, $fileModel->uploader_id);
        $this->assertSame(Company::class, $fileModel->fileable_type);
        $this->assertSame($company->id, $fileModel->fileable_id);

        Storage::disk('public')->assertExists($fileModel->path);
    }

    public function test_get_company_returns_real_stats_from_database(): void
    {
        $company = Company::create([
            'name' => ['en' => 'Acme Corp', 'ar' => 'شركة أكمي'],
            'status' => 'approved',
        ]);

        $user = $this->createRepresentativeUser($company);

        $oppType = OpportunityType::firstOrCreate(
            ['code' => 'cooperative'],
            ['name' => ['en' => 'Cooperative', 'ar' => 'تعاوني'], 'is_active' => true]
        );

        // 2 published opportunities, 1 draft
        $opp1 = Opportunity::factory()->for($company)->published()->create(['capacity' => 5]);
        $opp2 = Opportunity::factory()->for($company)->published()->create(['capacity' => 5]);
        Opportunity::factory()->for($company)->create(['status' => 'draft', 'capacity' => 5]);

        // Student & applications
        $studentUser = User::factory()->create(['status' => 'active']);
        $studentProfile = StudentProfile::create([
            'user_id' => $studentUser->id,
            'student_number' => 'STU998877',
        ]);

        // 1 accepted application
        Application::create([
            'opportunity_id' => $opp1->id,
            'student_profile_id' => $studentProfile->id,
            'status' => 'accepted',
        ]);

        // 1 submitted application
        Application::create([
            'opportunity_id' => $opp2->id,
            'student_profile_id' => $studentProfile->id,
            'status' => 'submitted',
        ]);

        $response = $this->actingAs($user)->getJson('/api/v1/company');

        $response->assertStatus(200)
            ->assertJsonPath('data.stats.available_opportunities', 2)
            ->assertJsonPath('data.stats.accepted_students', 1)
            ->assertJsonPath('data.available_opportunities_count', 2)
            ->assertJsonPath('data.accepted_students_count', 1);
    }
}
