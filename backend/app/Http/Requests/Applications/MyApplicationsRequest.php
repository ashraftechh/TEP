<?php

declare(strict_types=1);

namespace App\Http\Requests\Applications;

use Illuminate\Foundation\Http\FormRequest;

class MyApplicationsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * Gate: must hold `applications.own.view` permission AND have a student
     * profile. The student_profile_id is NEVER taken from the request — it is
     * always implicitly the authenticated user's own profile (same pattern as
     * ApplyToOpportunityRequest).
     */
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user) {
            return false;
        }

        return $user->hasPermission('applications.own.view')
            && $user->studentProfile !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * ASSUMPTION: status enum values are 'submitted', 'under_review',
     * 'interview_scheduled', 'accepted', 'rejected', 'withdrawn' — flagged
     * open question, not confirmed by the source ERD beyond "ENUM".
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'status' => [
                'nullable',
                'string',
                'in:submitted,under_review,interview_scheduled,accepted,rejected,withdrawn',
            ],
            'q' => ['nullable', 'string', 'max:255'],
            'opportunity_type_id' => ['nullable', 'integer', 'exists:opportunity_types,id'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }

    /**
     * Custom translated attribute names.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'status' => __('validation.attributes.status', ['default' => 'status']),
            'per_page' => __('validation.attributes.per_page', ['default' => 'per page']),
        ];
    }
}
