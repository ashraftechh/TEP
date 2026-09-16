<?php

declare(strict_types=1);

namespace App\Http\Requests\Reports;

use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

/**
 * TEP-682 — GET /api/v1/reports/{report}/reviews
 *
 * Viewable by:
 * 1. The student who owns the report (student_profile_id matches), OR
 * 2. The academic supervisor assigned to the report (academic_supervisor_id matches), OR
 * 3. A training coordinator / super admin with training_assignments.view_any.
 */
class ViewReportReviewsRequest extends FormRequest
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

        /** @var Report|null $report */
        $report = $this->route('report');

        if (! $report || ! $report->trainingAssignment) {
            return false;
        }

        $assignment = $report->trainingAssignment;

        // 1. Check student ownership
        $studentProfile = $user->studentProfile;
        if ($studentProfile && (int) $assignment->student_profile_id === (int) $studentProfile->id) {
            return true;
        }

        // 2. Check assigned academic supervisor
        if ((int) $assignment->academic_supervisor_id === (int) $user->id) {
            return true;
        }

        // 3. Coordinator / Super admin oversight
        return $user->hasPermission('training_assignments.view_any');
    }

    /**
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [];
    }
}
