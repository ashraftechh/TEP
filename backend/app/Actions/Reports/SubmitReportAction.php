<?php

declare(strict_types=1);

namespace App\Actions\Reports;

use App\Exceptions\ReportNotSubmittableException;
use App\Exceptions\TrainingCompletedException;
use App\Models\Report;
use Illuminate\Support\Facades\DB;

/**
 * TEP-678 — Submit Report (POST /api/v1/reports/{report}/submit).
 *
 * Transitions a report from 'draft' (or 'revision_requested') to 'submitted',
 * recording submitted_at = now() and incrementing the optimistic version counter.
 *
 * FLAGGED / scope note: Resubmission after 'revision_requested' intentionally
 * reuses this same action and endpoint rather than introducing a separate
 * duplicate "resubmit" endpoint, as flagged in the TEP-678 specification.
 */
class SubmitReportAction
{
    /**
     * Allowed statuses from which a report can be submitted.
     *
     * @var list<string>
     */
    public const SUBMITTABLE_STATUSES = ['draft', 'revision_requested'];

    public function execute(Report $report): Report
    {
        if (! in_array($report->status, self::SUBMITTABLE_STATUSES, true)) {
            throw ReportNotSubmittableException::forStatus($report->status);
        }

        return DB::transaction(function () use ($report) {
            /** @var Report $locked */
            $locked = Report::query()->whereKey($report->id)->lockForUpdate()->firstOrFail();

            // Reasonable inference: allow submit on draft and revision_requested
            if (! in_array($locked->status, self::SUBMITTABLE_STATUSES, true)) {
                throw ReportNotSubmittableException::forStatus($locked->status);
            }

            // Block submission once the assignment's final report is approved —
            // training is considered complete at that point.
            $hasApprovedFinal = Report::query()
                ->where('training_assignment_id', $locked->training_assignment_id)
                ->where('status', 'approved')
                ->whereHas('reportType', fn ($q) => $q->where('code', 'final'))
                ->where('id', '!=', $locked->id)
                ->exists();

            if ($hasApprovedFinal) {
                throw TrainingCompletedException::forAssignment((int) $locked->training_assignment_id);
            }

            $locked->status = 'submitted';
            $locked->submitted_at = now();

            // Optimistic-concurrency counter, incremented on every write —
            // same convention as TrainingAssignment/AttendanceRecord actions.
            $locked->version = (int) $locked->version + 1;
            $locked->save();

            return $locked->refresh();
        });
    }
}
