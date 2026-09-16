<?php

declare(strict_types=1);

namespace App\Http\Requests\Companies;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCompanyProfileRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('companies.own.update') ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $companyId = $this->user()?->companyRepresentative?->company_id;

        return [
            'name_ar' => ['required', 'string', 'min:3', 'max:255'],
            'name_en' => ['required', 'string', 'min:3', 'max:255'],
            'description_ar' => ['nullable', 'string', 'max:2000'],
            'description_en' => ['nullable', 'string', 'max:2000'],
            'industry_id' => ['nullable', 'integer', 'exists:industries,id'],
            'registration_number' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('companies', 'registration_number')->ignore($companyId),
            ],
            'email' => [
                'nullable',
                'string',
                app()->environment('testing') ? 'email:rfc' : 'email:rfc,dns',
                'max:255',
            ],
            'phone' => ['nullable', 'string', 'max:20'],
            'website' => ['nullable', 'string', 'url', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'established_year' => [
                'nullable',
                'integer',
                'min:1900',
                'max:'.date('Y'),
            ],
            'employees_count' => ['nullable', 'string', 'max:20'],
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name_ar' => __('companies.attributes.name_ar'),
            'name_en' => __('companies.attributes.name_en'),
            'description_ar' => __('companies.attributes.description_ar'),
            'description_en' => __('companies.attributes.description_en'),
            'industry_id' => __('companies.attributes.industry_id'),
            'registration_number' => __('companies.attributes.registration_number'),
            'email' => __('companies.attributes.email'),
            'phone' => __('companies.attributes.phone'),
            'website' => __('companies.attributes.website'),
            'address' => __('companies.attributes.address'),
            'city' => __('companies.attributes.city'),
            'established_year' => __('companies.attributes.established_year'),
            'employees_count' => __('companies.attributes.employees_count'),
        ];
    }
}
