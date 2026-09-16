<?php

declare(strict_types=1);

namespace App\Http\Requests\TrainingAssignments;

use Illuminate\Foundation\Http\FormRequest;

/**
 * TEP-665 — GET /api/v1/my/training-assignment
 *
 * Student's own single placement — the list endpoint (index()) still
 * technically works for a student too (returns at most one row), but this
 * dedicated fetch is what the "my training placement" dashboard card /
 * detail page actually calls. Ownership is implicit from the authenticated
 * user's own student_profile_id — never a request/route param, same
 * pattern as MyApplicationsRequest.
 */
class MyTrainingAssignmentRequest extends FormRequest
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
            && $user->studentProfile !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [];
    }
}
