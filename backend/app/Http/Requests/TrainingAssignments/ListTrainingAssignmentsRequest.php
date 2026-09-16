<?php

declare(strict_types=1);

namespace App\Http\Requests\TrainingAssignments;

use Illuminate\Foundation\Http\FormRequest;

/**
 * TEP-665 — GET /api/v1/training-assignments
 *
 * Unlike the applications own.*company.* split (two separate endpoints,
 * one `permission:` middleware each), this is ONE endpoint serving four
 * different roles off two different permissions
 * (`training_assignments.own.view` for student/academic_supervisor/
 * company_representative, `training_assignments.view_any` for
 * training_coordinator/super_admin) — so the OR is checked here, in
 * authorize(), the same division of responsibility already used by
 * CompanyApplicationsRequest/MyApplicationsRequest, rather than as a single
 * route `permission:` middleware (which only supports one permission
 * string). The actual role-scoping of WHICH rows are visible happens in
 * the controller query, not here.
 */
class ListTrainingAssignmentsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user) {
            return false;
        }

        return $user->hasPermission('training_assignments.own.view')
            || $user->hasPermission('training_assignments.view_any');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'status' => ['nullable', 'string', 'in:active,suspended,completed,terminated'],
            'q' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
