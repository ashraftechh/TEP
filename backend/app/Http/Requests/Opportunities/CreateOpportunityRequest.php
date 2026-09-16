<?php

declare(strict_types=1);

namespace App\Http\Requests\Opportunities;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class CreateOpportunityRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * Requires `opportunities.manage` permission and an active (non-suspended)
     * company. Suspended companies may not create new opportunities.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user || ! $user->hasPermission('opportunities.own.create')) {
            return false;
        }

        return $user->companyRepresentative?->company !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title_ar' => ['required', 'string', 'max:255'],
            'title_en' => ['required', 'string', 'max:255'],
            'department_ar' => ['nullable', 'string', 'max:255'],
            'department_en' => ['nullable', 'string', 'max:255'],
            'description_ar' => ['required', 'string', 'max:5000'],
            'description_en' => ['required', 'string', 'max:5000'],
            'opportunity_type_id' => ['required', 'integer', 'exists:opportunity_types,id'],
            'training_cycle_id' => ['nullable', 'integer', 'exists:training_cycles,id'],
            'work_mode' => ['nullable', 'string', 'in:full_time,part_time,remote,hybrid'],
            'location' => ['nullable', 'string', 'max:255'],
            'duration' => ['nullable', 'string', 'max:100'],
            'capacity' => ['required', 'integer', 'min:1'],
            'salary' => ['nullable', 'numeric', 'min:0'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'application_deadline' => ['nullable', 'date', 'after_or_equal:today'],
            'major_ids' => ['nullable', 'array'],
            'major_ids.*' => ['integer', 'exists:majors,id'],
            'skill_ids' => ['nullable', 'array'],
            'skill_ids.*' => ['integer', 'exists:skills,id'],
            'requirements_ar' => ['nullable', 'array'],
            'requirements_ar.*' => ['required', 'string', 'max:500'],
            'requirements_en' => ['nullable', 'array'],
            'requirements_en.*' => ['required', 'string', 'max:500'],
            'benefits_ar' => ['nullable', 'array'],
            'benefits_ar.*' => ['required', 'string', 'max:500'],
            'benefits_en' => ['nullable', 'array'],
            'benefits_en.*' => ['required', 'string', 'max:500'],
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $reqAr = $this->input('requirements_ar');
            $reqEn = $this->input('requirements_en');

            $reqArCount = is_array($reqAr) ? count($reqAr) : 0;
            $reqEnCount = is_array($reqEn) ? count($reqEn) : 0;

            if ($reqArCount !== $reqEnCount) {
                $validator->errors()->add(
                    'requirements_en',
                    __('validation.requirements_count_mismatch', [
                        'attribute' => 'requirements_en',
                        'default' => 'The English requirements count must match the Arabic requirements count.',
                    ])
                );
            }

            $benAr = $this->input('benefits_ar');
            $benEn = $this->input('benefits_en');

            $benArCount = is_array($benAr) ? count($benAr) : 0;
            $benEnCount = is_array($benEn) ? count($benEn) : 0;

            if ($benArCount !== $benEnCount) {
                $validator->errors()->add(
                    'benefits_en',
                    __('validation.benefits_count_mismatch', [
                        'attribute' => 'benefits_en',
                        'default' => 'The English benefits count must match the Arabic benefits count.',
                    ])
                );
            }
        });
    }

    /**
     * Custom validation messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'end_date.after_or_equal' => __('validation.after_or_equal', [
                'attribute' => 'end_date',
                'date' => 'start_date',
            ]),
            'application_deadline.after_or_equal' => __('validation.after_or_equal', [
                'attribute' => 'application_deadline',
                'date' => 'today',
            ]),
        ];
    }
}
