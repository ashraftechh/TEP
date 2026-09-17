<?php

declare(strict_types=1);

namespace App\Actions\Reports;

use App\Exceptions\DuplicateReportException;
use App\Exceptions\NoActiveTrainingAssignmentException;
use App\Exceptions\ReportQuotaExceededException;
use App\Exceptions\ReportTypeNotAllowedException;
use App\Exceptions\TrainingCompletedException;
use App\Models\File;
use App\Models\Report;
use App\Models\ReportType;
use App\Models\TrainingAssignment;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * TEP-674 — Create a report draft for the authenticated student's active
 * training assignment.
 *
 * Mirrors RecordAttendanceAction's shape: resolve the owning assignment,
 * then run the duplicate check + insert inside a single DB transaction
 * with `lockForUpdate()` to prevent a race between two concurrent
 * requests creating the same (assignment, type, number) report twice.
 * No DB-level unique constraint backs this (the `reports` migration only
 * indexes the pair for lookup speed) — same reliance on the
 * transaction-level check alone as the existing attendance-records flow,
 * kept consistent rather than introducing a new pattern for this ticket.
 */
class CreateReportAction
{
    /**
     * @param array{
     *     report_type_id: int,
     *     title: string,
     *     report_number: int,
     *     content: string,
     *     due_at?: string|null,
     *     file_ids?: list<int>|null,
     * } $data
     */
    public function execute(User $actor, array $data): Report
    {
        $studentProfile = $actor->studentProfile;

        if ($studentProfile === null) {
            throw NoActiveTrainingAssignmentException::forStudent($actor->id);
        }

        $assignment = TrainingAssignment::query()
            ->where('student_profile_id', $studentProfile->id)
            ->where('status', 'active')
            ->first();

        if ($assignment === null) {
            throw NoActiveTrainingAssignmentException::forStudent($actor->id);
        }

        return DB::transaction(function () use ($assignment, $data) {
            // Block all report creation once the final report has been approved
            // (training is considered complete at that point).
            $hasApprovedFinal = Report::query()
                ->where('training_assignment_id', $assignment->id)
                ->where('status', 'approved')
                ->whereHas('reportType', fn ($q) => $q->where('code', 'final'))
                ->lockForUpdate()
                ->exists();

            if ($hasApprovedFinal) {
                throw TrainingCompletedException::forAssignment($assignment->id);
            }

            $reportType = ReportType::find($data['report_type_id']);

            if ($reportType !== null) {
                // For the final report type, check for an existing entry FIRST so
                // we surface the semantic 409 duplicate_final_report rather than
                // the 422 quota_exceeded (both would fire because max_count=1).
                if ($reportType->code === 'final') {
                    $finalExists = Report::query()
                        ->where('training_assignment_id', $assignment->id)
                        ->where('report_type_id', $reportType->id)
                        ->where('status', '!=', 'rejected')
                        ->lockForUpdate()
                        ->exists();

                    if ($finalExists) {
                        throw DuplicateReportException::forFinalReport($assignment->id);
                    }

                    // Normalise report_number for final reports — always 1.
                    $data['report_number'] = 1;
                }

                // Check if this report type is enabled for this assignment
                if (! $assignment->isReportTypeEnabled($reportType->code)) {
                    throw ReportTypeNotAllowedException::forType($reportType->code, $assignment->id);
                }

                // Check maximum allowed count for this specific report type
                $maxTypeCount = $assignment->getReportTypeMaxCount($reportType->code);
                if ($maxTypeCount !== null) {
                    $existingTypeCount = Report::query()
                        ->where('training_assignment_id', $assignment->id)
                        ->where('report_type_id', $reportType->id)
                        ->where('status', '!=', 'rejected')
                        ->lockForUpdate()
                        ->count();

                    if ($existingTypeCount >= $maxTypeCount) {
                        throw ReportQuotaExceededException::forType($reportType->code, $maxTypeCount, $assignment->id);
                    }

                    if ((int) $data['report_number'] > $maxTypeCount) {
                        throw ReportQuotaExceededException::forType($reportType->code, $maxTypeCount, $assignment->id);
                    }
                }
            }

            // Check overall required_reports_count ceiling if configured
            if ($assignment->required_reports_count !== null && $assignment->required_reports_count > 0) {
                $existingTotalCount = Report::query()
                    ->where('training_assignment_id', $assignment->id)
                    ->where('status', '!=', 'rejected')
                    ->lockForUpdate()
                    ->count();

                if ($existingTotalCount >= $assignment->required_reports_count) {
                    throw ReportQuotaExceededException::forTotal($assignment->required_reports_count, $assignment->id);
                }
            }

            $duplicateExists = Report::query()
                ->where('training_assignment_id', $assignment->id)
                ->where('report_type_id', $data['report_type_id'])
                ->where('report_number', $data['report_number'])
                ->where('status', '!=', 'rejected')
                ->lockForUpdate()
                ->exists();

            if ($duplicateExists) {
                throw DuplicateReportException::forAssignmentTypeAndNumber(
                    $assignment->id,
                    (int) $data['report_type_id'],
                    (int) $data['report_number']
                );
            }

            $report = Report::create([
                'training_assignment_id' => $assignment->id,
                'title' => $data['title'],
                'report_type_id' => $data['report_type_id'],
                'report_number' => $data['report_number'],
                'content' => $data['content'],
                'status' => 'draft',
                'grade' => null,
                // TEP-674 explicitly specifies version = 0 at creation for
                // reports — a deliberate divergence from the version = 1
                // convention used at creation by other Sprint-3/4 entities
                // (Application, TrainingAssignment, AttendanceRecord).
                // Kept exactly as specified rather than "corrected" to
                // match those, per the ticket's own wording.
                'version' => 0,
                'submitted_at' => null,
                'due_at' => $data['due_at'] ?? null,
            ]);

            // Attach any pre-uploaded files by pointing their polymorphic
            // fileable columns at the newly created report.
            if (! empty($data['file_ids'])) {
                File::query()
                    ->whereIn('id', $data['file_ids'])
                    ->update([
                        'fileable_type' => Report::class,
                        'fileable_id' => $report->id,
                        'purpose' => 'report_attachment',
                    ]);
            }

            return $report;
        });
    }
}
