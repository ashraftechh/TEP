<?php

declare(strict_types=1);

namespace App\Actions\Reports;

use App\Exceptions\AssignmentNotActiveException;
use App\Exceptions\ReportNotSubmittableException;
use App\Exceptions\ReportSequenceNotMetException;
use App\Exceptions\TrainingCompletedException;
use App\Models\Report;
use Illuminate\Support\Facades\DB;

/**
 * TEP-678 — Submit Report (POST /api/v1/reports/{report}/submit).
 *
 * Transitions a report from 'draft', 'revision_requested', or 'rejected'
 * to 'submitted', recording submitted_at = now() and incrementing the
 * optimistic version counter.
 *
 * FLAGGED / scope note: Resubmission after 'revision_requested' or
 * 'rejected' intentionally reuses this same action and endpoint rather
 * than introducing a separate duplicate "resubmit" endpoint, as flagged
 * in the TEP-678 specification. A rejected report is resubmittable for
 * the same reason it's editable (see UpdateReportAction) — the decision
 * between "rejected" and "revision_requested" is a signal to the student
 * about severity, not a difference in what they're allowed to do next.
 *
 * Same-type sequencing: report_number N of a given type cannot be
 * submitted until report_number N-1 of that SAME type is 'approved'.
 * This is distinct from (and independent of) the cross-tier prerequisite
 * check enforced at creation time in ReportPlacementValidator (e.g.
 * weekly reports requiring N approved dailies) — that check gates
 * *creating* a report of a higher tier; this one gates *submitting* the
 * next report within the same tier, so report_number stays a genuine
 * chronological sequence rather than just a label. Report #1 of any type
 * has no predecessor and is never blocked by this rule.
 */
class SubmitReportAction
{
    /**
     * Allowed statuses from which a report can be submitted.
     *
     * @var list<string>
     */
    public const SUBMITTABLE_STATUSES = ['draft', 'revision_requested', 'rejected'];

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

            $assignment = $locked->trainingAssignment;

            if ($assignment === null || $assignment->status !== 'active') {
                throw AssignmentNotActiveException::forAssignment(
                    $assignment?->id,
                    $assignment?->status ?? 'unknown',
                );
            }

            // Block submission once the assignment's final report is approved —
            // training is considered complete at that point.
            $hasApprovedFinal = Report::query()
                ->where('training_assignment_id', $locked->training_assignment_id)
                ->where('status', 'approved')
                ->whereHas('reportType', fn ($q) => $q->where('code', 'final'))
                ->where('id', '!=', $locked->id)
                ->lockForUpdate()
                ->exists();

            if ($hasApprovedFinal) {
                throw TrainingCompletedException::forAssignment((int) $locked->training_assignment_id);
            }

            if ((int) $locked->report_number > 1) {
                $predecessorApproved = Report::query()
                    ->where('training_assignment_id', $locked->training_assignment_id)
                    ->where('report_type_id', $locked->report_type_id)
                    ->where('report_number', (int) $locked->report_number - 1)
                    ->where('status', 'approved')
                    ->lockForUpdate()
                    ->exists();

                if (! $predecessorApproved) {
                    throw ReportSequenceNotMetException::forSameTypePredecessor(
                        (int) $locked->report_type_id,
                        (int) $locked->report_number,
                        $locked->reportType?->code ?? 'unknown',
                    );
                }
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
