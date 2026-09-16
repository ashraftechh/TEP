<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Companies\UpdateCompanyProfileRequest;
use App\Http\Requests\Companies\UploadCompanyLogoRequest;
use App\Http\Resources\CompanyResource;
use App\Models\Company;
use App\Models\File;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    /**
     * Fetch the authenticated user's company profile in full detail.
     */
    public function show(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $representative = $user->companyRepresentative;

        if (! $representative || ! $representative->company) {
            return response()->json([
                'message' => __('companies.no_company'),
            ], 404);
        }

        $company = $representative->company;
        $company->loadMissing(['industry', 'logoFile']);

        return response()->json([
            'data' => new CompanyResource($company),
            'message' => __('companies.profile_retrieved'),
        ]);
    }

    /**
     * Update the authenticated user's company profile details.
     * Status and status_reason are preserved without alteration.
     */
    public function update(UpdateCompanyProfileRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $representative = $user->companyRepresentative;

        if (! $representative || ! $representative->company) {
            return response()->json([
                'message' => __('companies.no_company'),
            ], 404);
        }

        $company = $representative->company;
        $validated = $request->validated();

        $company->setTranslation('name', 'ar', $validated['name_ar']);
        $company->setTranslation('name', 'en', $validated['name_en']);

        if (array_key_exists('description_ar', $validated) || array_key_exists('description_en', $validated)) {
            $description = [];
            if (! empty($validated['description_ar'])) {
                $description['ar'] = $validated['description_ar'];
            }
            if (! empty($validated['description_en'])) {
                $description['en'] = $validated['description_en'];
            }
            $company->description = ! empty($description) ? $description : null;
        }

        $fillableFields = [
            'industry_id',
            'registration_number',
            'phone',
            'website',
            'address',
            'city',
            'established_year',
            'employees_count',
        ];

        foreach ($fillableFields as $field) {
            if (array_key_exists($field, $validated)) {
                $company->{$field} = $validated[$field];
            }
        }

        if (array_key_exists('email', $validated)) {
            $company->contact_email = $validated['email'];
        }

        $company->save();
        $company->load(['industry', 'logoFile']);

        return response()->json([
            'data' => new CompanyResource($company),
            'message' => __('companies.profile_updated_successfully'),
        ]);
    }

    /**
     * Upload and update the logo for the authenticated user's company.
     */
    public function uploadLogo(UploadCompanyLogoRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $representative = $user->companyRepresentative;

        if (! $representative || ! $representative->company) {
            return response()->json([
                'message' => __('companies.no_company'),
            ], 404);
        }

        $company = $representative->company;
        $uploadedFile = $request->file('logo');

        $path = $uploadedFile->store('company_logos', 'public');

        $file = File::create([
            'uploader_id' => $user->id,
            'fileable_type' => Company::class,
            'fileable_id' => $company->id,
            'purpose' => 'company_logo',
            'disk' => 'public',
            'path' => $path,
            'original_name' => $uploadedFile->getClientOriginalName(),
            'mime_type' => $uploadedFile->getMimeType() ?? 'image/jpeg',
            'size_bytes' => $uploadedFile->getSize(),
            'scan_status' => 'clean',
            'scanned_at' => now(),
        ]);

        $company->update(['logo_file_id' => $file->id]);
        $company->loadMissing(['industry', 'logoFile']);

        return response()->json([
            'data' => new CompanyResource($company),
            'message' => __('companies.logo_uploaded_successfully'),
        ]);
    }
}
