<?php

declare(strict_types=1);

namespace App\Http\Requests\Reports;

use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

/**
 * TEP-674 — PATCH /api/v1/reports/{report}
 *
 * Permission `reports.own.update` (student), plus an explicit ownership
 * check that the report's training assignment belongs to the
 * authenticated student — same shape as RecordAttendanceRequest's
 * company-ownership check. The draft-only guard (422 once the report has
 * moved past 'draft') is enforced in UpdateReportAction, not here, since
 * that is a business-state rule rather than an authorization rule.
 */
class UpdateReportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        /** @var User|null $user */
        $user = $this->user();

        if (! $user || ! $user->hasPermission('reports.own.update')) {
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
        return [
            'report_type_id' => ['sometimes', 'required', 'integer', 'exists:report_types,id'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'report_number' => ['sometimes', 'required', 'integer', 'min:1'],
            'content' => ['sometimes', 'required', 'string'],
            'due_at' => ['sometimes', 'required', 'date'],
            'file_ids' => ['sometimes', 'nullable', 'array'],
            'file_ids.*' => ['integer', 'exists:files,id'],
        ];
    }
}
