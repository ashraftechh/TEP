<?php

declare(strict_types=1);

namespace App\Http\Requests\Reports;

use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

/**
 * TEP-678 — POST /api/v1/reports/{report}/submit
 *
 * Permission `reports.own.submit` (student), plus an explicit ownership
 * check that the report's training assignment belongs to the
 * authenticated student. The status guard (422 if not draft or revision_requested)
 * is enforced in SubmitReportAction, not here, since that is a business-state
 * rule rather than an authorization rule.
 */
class SubmitReportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        /** @var User|null $user */
        $user = $this->user();

        if (! $user || ! $user->hasPermission('reports.own.submit')) {
            return false;
        }

        $studentProfile = $user->studentProfile;

        if ($studentProfile === null) {
            return false;
        }

        /** @var Report|null $report */
        $report = $this->route('report');

        if (! $report) {
            return false;
        }

        return (int) $report->trainingAssignment->student_profile_id === (int) $studentProfile->id;
    }

    /**
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [];
    }
}
