<?php

declare(strict_types=1);

namespace App\Actions\Reports;

use App\Exceptions\ReportNotReviewableException;
use App\Models\Report;
use App\Models\ReportReview;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * TEP-682 — Review Report (POST /api/v1/reports/{report}/review).
 *
 * Transitions a submitted report to approved, rejected, or revision_requested.
 * Creates an append-only audit row in report_reviews.
 *
 * FLAGGED / scope note per TEP-682: When a report is approved, this action
 * recalculates the parent training_assignments.progress_percentage as:
 * (count of approved reports / required_reports_count) * 100, capped at 100.
 * This is the single designated source of truth for modifying progress_percentage.
 */
class ReviewReportAction
{
    /**
     * @param array{
     *     decision: 'approved'|'rejected'|'revision_requested',
     *     feedback: string,
     *     grade?: float|int|null,
     * } $data
     */
    public function execute(Report $report, User $reviewer, array $data): Report
    {
        if ($report->status !== 'submitted') {
            throw ReportNotReviewableException::forStatus($report->status);
        }

        return DB::transaction(function () use ($report, $reviewer, $data) {
            /** @var Report $locked */
            $locked = Report::query()->whereKey($report->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== 'submitted') {
                throw ReportNotReviewableException::forStatus($locked->status);
            }

            $fromStatus = $locked->status;
            $toStatus = $data['decision'];

            $locked->status = $toStatus;
            if ($toStatus === 'approved') {
                $locked->grade = isset($data['grade']) ? (float) $data['grade'] : null;
            } else {
                $locked->grade = null;
            }

            $locked->version = (int) $locked->version + 1;
            $locked->save();

            // Create append-only report review record
            ReportReview::create([
                'report_id' => $locked->id,
                'reviewer_id' => $reviewer->id,
                'decision' => $data['decision'],
                'feedback' => $data['feedback'],
                'from_status' => $fromStatus,
                'to_status' => $toStatus,
                'created_at' => now(),
            ]);

            // Recalculate parent training assignment progress on approval
            if ($toStatus === 'approved') {
                $assignment = $locked->trainingAssignment;
                if ($assignment && $assignment->required_reports_count && $assignment->required_reports_count > 0) {
                    $approvedCount = Report::query()
                        ->where('training_assignment_id', $assignment->id)
                        ->where('status', 'approved')
                        ->count();

                    $progress = (int) min(100, (int) round(($approvedCount / (int) $assignment->required_reports_count) * 100));
                    $assignment->update(['progress_percentage' => $progress]);
                }
            }

            return $locked->refresh();
        });
    }
}
