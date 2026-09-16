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
            'q' => ['nullable', 'string', 'max:255'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
