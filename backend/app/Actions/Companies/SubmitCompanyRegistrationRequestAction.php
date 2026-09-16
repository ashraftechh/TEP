<?php

declare(strict_types=1);

namespace App\Actions\Companies;

use App\Models\Company;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubmitCompanyRegistrationRequestAction
{
    /**
     * Submit or re-submit a pre-account company registration request.
     *
     * @param  array<string, mixed>  $data
     *
     * @throws ValidationException
     */
    public function execute(array $data): Company
    {
        $contactEmail = $data['contact_email'] ?? $data['email'] ?? null;
        $registrationNumber = $data['registration_number'] ?? null;

        // Check for existing active/pending request (excluding rejected and changes_requested)
        $existingCompany = Company::whereNotIn('status', ['rejected', 'changes_requested'])
            ->where(function ($query) use ($contactEmail, $registrationNumber) {
                if (! empty($contactEmail)) {
                    $query->where('contact_email', $contactEmail);
                }
                if (! empty($registrationNumber)) {
                    $query->orWhere('registration_number', $registrationNumber);
                }
            })
            ->first();

        if ($existingCompany !== null) {
            $field = (! empty($registrationNumber) && $existingCompany->registration_number === $registrationNumber)
                ? 'registration_number'
                : 'contact_email';

            throw ValidationException::withMessages([
                $field => [__('companies.request_already_exists')],
            ]);
        }

        // If there is an existing company in 'changes_requested' status, update and move back to 'pending_verification'
        $changesRequestedCompany = Company::where('status', 'changes_requested')
            ->where(function ($query) use ($contactEmail, $registrationNumber) {
                if (! empty($contactEmail)) {
                    $query->where('contact_email', $contactEmail);
                }
                if (! empty($registrationNumber)) {
                    $query->orWhere('registration_number', $registrationNumber);
                }
            })
            ->first();

        if ($changesRequestedCompany !== null) {
            return DB::transaction(function () use ($changesRequestedCompany, $data, $contactEmail) {
                $changesRequestedCompany->update([
                    'name' => [
                        'en' => $data['name'],
                        'ar' => $data['name'],
                    ],
                    'description' => isset($data['description']) && $data['description'] !== null
                        ? [
                            'en' => $data['description'],
                            'ar' => $data['description'],
                        ]
                        : null,
                    'contact_email' => $contactEmail,
                    'phone' => $data['phone'] ?? null,
                    'website' => $data['website'] ?? null,
                    'registration_number' => $data['registration_number'] ?? null,
                    'industry_id' => $data['industry_id'] ?? null,
                    'status' => 'pending_verification',
                    'status_reason' => null,
                ]);

                return $changesRequestedCompany;
            });
        }

        return DB::transaction(function () use ($data, $contactEmail) {
            return Company::create([
                'name' => [
                    'en' => $data['name'],
                    'ar' => $data['name'],
                ],
                'description' => isset($data['description']) && $data['description'] !== null
                    ? [
                        'en' => $data['description'],
                        'ar' => $data['description'],
                    ]
                    : null,
                'contact_email' => $contactEmail,
                'phone' => $data['phone'] ?? null,
                'website' => $data['website'] ?? null,
                'registration_number' => $data['registration_number'] ?? null,
                'industry_id' => $data['industry_id'] ?? null,
                'status' => 'pending_verification',
            ]);
        });
    }
}
