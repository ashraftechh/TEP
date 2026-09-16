<?php

declare(strict_types=1);

namespace App\Http\Requests\Companies;

use App\Models\Company;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CompanyRegistrationRequestRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('email') && ! $this->has('contact_email')) {
            $this->merge(['contact_email' => $this->input('email')]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $contactEmail = $this->input('contact_email') ?? $this->input('email');
        $phone = $this->input('phone');
        $registrationNumber = $this->input('registration_number');

        $changesRequestedId = Company::where('status', 'changes_requested')
            ->where(function ($q) use ($contactEmail, $phone, $registrationNumber) {
                if ($contactEmail) {
                    $q->where('contact_email', $contactEmail);
                }
                if ($phone) {
                    $q->orWhere('phone', $phone);
                }
                if ($registrationNumber) {
                    $q->orWhere('registration_number', $registrationNumber);
                }
            })
            ->value('id');

        return [
            'name' => ['required', 'string', 'min:3', 'max:255'],
            'contact_email' => [
                'required',
                'string',
                app()->environment('testing') ? 'email:rfc' : 'email:rfc,dns',
                'max:255',
                $changesRequestedId
                    ? Rule::unique('companies', 'contact_email')->ignore($changesRequestedId)
                    : 'unique:companies,contact_email',
                'indisposable',
            ],
            'email' => [
                'nullable',
                'string',
                'max:255',
            ],
            'phone' => [
                'nullable',
                'string',
                'phone:YE',
                'max:20',
                $changesRequestedId
                    ? Rule::unique('companies', 'phone')->ignore($changesRequestedId)
                    : 'unique:companies,phone',
            ],
            'industry_id' => ['nullable', 'integer', 'exists:industries,id'],
            'registration_number' => [
                'nullable',
                'string',
                'max:100',
                $changesRequestedId
                    ? Rule::unique('companies', 'registration_number')->ignore($changesRequestedId)
                    : 'unique:companies,registration_number',
            ],
            'website' => ['nullable', 'string', 'url', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
