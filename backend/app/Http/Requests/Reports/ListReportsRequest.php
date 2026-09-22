<?php

declare(strict_types=1);

namespace App\Http\Requests\Reports;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

/**
 * GET /api/v1/reports
 *
 * Shared endpoint for students (reports.own.view) to view their reports,
 * and academic supervisors (reports.review) to list and filter reports submitted
 * across their assigned training placements.
 */
class ListReportsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        /** @var User|null $user */
        $user = $this->user();

        if (! $user) {
            return false;
        }

        return $user->hasPermission('reports.own.view')
            || $user->hasPermission('reports.review')
            || $user->hasPermission('training_assignments.view_any');
    }

    /**
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'status' => ['nullable', 'string', 'in:draft,submitted,under_review,approved,revision_requested,rejected'],
            'report_type_id' => ['nullable', 'integer', 'exists:report_types,id'],
            'student_id' => ['nullable', 'integer'],
            'company_id' => ['nullable', 'integer'],
            'opportunity_id' => ['nullable', 'integer'],
            // Explicit override of the default "current assignment only"
            // scoping (see ReportController::index()) — look at one
            // specific assignment's reports directly, current or historical.
            'training_assignment_id' => ['nullable', 'integer', 'exists:training_assignments,id'],
            // Academic-supervisor branch only: drop the is_current default
            // and show every one of the supervisor's students' reports,
            // across current and historical assignments alike.
            //
            // Deliberately NOT validated as `boolean` — Laravel's boolean
            // rule only accepts true, false, 0, 1, "0", "1", and rejects
            // the literal string "true" that a JS boolean becomes once
            // axios serializes it into a GET query string. That mismatch
            // made every toggle-on request 422 before reaching the
            // controller. `$request->boolean('include_history')` already
            // interprets "true"/"1"/"on"/"yes" correctly regardless of
            // what's validated here, so this rule only needs to confirm
            // it's a plain scalar, not police its exact spelling.
            'include_history' => ['nullable', 'string', 'in:0,1,true,false'],
            'q' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
