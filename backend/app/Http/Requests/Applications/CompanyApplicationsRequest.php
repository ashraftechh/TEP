<?php

declare(strict_types=1);

namespace App\Http\Requests\Applications;

use Illuminate\Foundation\Http\FormRequest;

class CompanyApplicationsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * TEP-644 — Gate: `applications.company.view` permission AND the user
     * must actually be a company representative (have a companyRepresentative
     * record). There is no per-row permission for this action — hasPermission()
     * only confirms the role may review ITS OWN company's applications in
     * general — so the actual company_id scoping happens in the controller
     * query, the same division of responsibility used by OpportunityController
     * ::index() for the company_representative branch.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user || ! $user->hasPermission('applications.company.view')) {
            return false;
        }

        return $user->companyRepresentative !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * ASSUMPTION: status enum values are 'submitted', 'under_review',
     * 'interview_scheduled', 'accepted', 'rejected', 'withdrawn' — same
     * flagged open question as MyApplicationsRequest / WithdrawApplicationRequest,
     * not confirmed by the source ERD beyond "ENUM".
     *
     * `opportunity_id` is only checked for existence here — whether it
     * actually belongs to the acting representative's company is enforced
     * in the controller query (an id from another company simply yields an
     * empty result set, never another company's data).
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'opportunity_id' => ['nullable', 'integer', 'exists:opportunities,id'],
            'status' => [
                'nullable',
                'string',
                'in:submitted,under_review,interview_scheduled,accepted,rejected,withdrawn',
            ],
            'sort_by' => ['nullable', 'string', 'in:created_at,submitted_at,status'],
            'sort_dir' => ['nullable', 'string', 'in:asc,desc'],
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
            'opportunity_id' => __('validation.attributes.opportunity_id', ['default' => 'opportunity']),
            'status' => __('validation.attributes.status', ['default' => 'status']),
            'per_page' => __('validation.attributes.per_page', ['default' => 'per page']),
        ];
    }
}
