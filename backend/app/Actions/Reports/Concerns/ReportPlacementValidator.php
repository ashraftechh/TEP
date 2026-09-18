<?php

declare(strict_types=1);

namespace App\Actions\Reports\Concerns;

use App\Exceptions\DuplicateReportException;
use App\Exceptions\ReportQuotaExceededException;
use App\Exceptions\ReportSequenceNotMetException;
use App\Exceptions\ReportTypeNotAllowedException;
use App\Exceptions\TrainingCompletedException;
use App\Models\Report;
use App\Models\ReportType;
use App\Models\TrainingAssignment;

/**
 * Shared "is it valid to place a report at (report_type_id, report_number)
 * on this assignment" check, extracted from CreateReportAction so that
 * UpdateReportAction can re-run the exact same rules whenever a PATCH
 * changes either field — previously UpdateReportAction let a report's
 * type/number be changed post-creation with none of these checks re-run,
 * which bypassed the duplicate/type-enabled/sequence/quota guarantees
 * CreateReportAction otherwise enforces.
 *
 * Callers are expected to already be inside the caller's own
 * DB::transaction() + lockForUpdate() on the assignment/report row being
 * mutated — this class only issues the supporting lockForUpdate() reads
 * needed for its own checks, it does not open a transaction itself.
 */
class ReportPlacementValidator
{
    /**
     * @param  int  $reportTypeId  The report_type_id being placed (candidate value).
     * @param  int  $reportNumber  The report_number being placed (candidate value,
     *                             already normalised to 1 for `final` by the caller).
     * @param  int|null  $ignoreReportId  Exclude this report's own row from the
     *                                    duplicate check — set when re-validating an
     *                                    existing report during an update, so it
     *                                    doesn't collide with itself.
     *
     * @throws TrainingCompletedException
     * @throws ReportTypeNotAllowedException
     * @throws ReportSequenceNotMetException
     * @throws ReportQuotaExceededException
     * @throws DuplicateReportException
     */
    public function validate(
        TrainingAssignment $assignment,
        int $reportTypeId,
        int $reportNumber,
        ?int $ignoreReportId = null,
    ): void {
        $hasApprovedFinal = Report::query()
            ->where('training_assignment_id', $assignment->id)
            ->where('status', 'approved')
            ->whereHas('reportType', fn ($q) => $q->where('code', 'final'))
            ->when($ignoreReportId !== null, fn ($q) => $q->where('id', '!=', $ignoreReportId))
            ->lockForUpdate()
            ->exists();

        if ($hasApprovedFinal) {
            throw TrainingCompletedException::forAssignment($assignment->id);
        }

        $reportType = ReportType::find($reportTypeId);

        if ($reportType === null) {
            // Foreign-key/exists validation on the request already guards
            // against this in practice — nothing further to enforce here.
            return;
        }

        if ($reportType->code === 'final') {
            $finalExists = Report::query()
                ->where('training_assignment_id', $assignment->id)
                ->where('report_type_id', $reportType->id)
                ->when($ignoreReportId !== null, fn ($q) => $q->where('id', '!=', $ignoreReportId))
                ->lockForUpdate()
                ->exists();

            if ($finalExists) {
                throw DuplicateReportException::forFinalReport($assignment->id);
            }
        }

        if (! $assignment->isReportTypeEnabled($reportType->code)) {
            throw ReportTypeNotAllowedException::forType($reportType->code, $assignment->id);
        }

        $prereqType = $assignment->getPrerequisiteReportType($reportType->code);
        if ($prereqType !== null) {
            $threshold = $assignment->getSequentialThreshold($reportType->code, $reportNumber);

            if ($threshold !== null) {
                $approvedPrereqCount = Report::query()
                    ->where('training_assignment_id', $assignment->id)
                    ->whereHas('reportType', fn ($q) => $q->where('code', $prereqType))
                    ->where('status', 'approved')
                    ->lockForUpdate()
                    ->count();

                if ($approvedPrereqCount < $threshold) {
                    throw ReportSequenceNotMetException::forType(
                        $reportType->code,
                        $prereqType,
                        $threshold,
                        $approvedPrereqCount,
                        $assignment->id
                    );
                }
            }
        }

        $maxTypeCount = $assignment->getReportTypeMaxCount($reportType->code);
        if ($maxTypeCount !== null) {
            $existingTypeCount = Report::query()
                ->where('training_assignment_id', $assignment->id)
                ->where('report_type_id', $reportType->id)
                ->when($ignoreReportId !== null, fn ($q) => $q->where('id', '!=', $ignoreReportId))
                ->lockForUpdate()
                ->count();

            if ($existingTypeCount >= $maxTypeCount) {
                throw ReportQuotaExceededException::forType($reportType->code, $maxTypeCount, $assignment->id);
            }

            if ($reportNumber > $maxTypeCount) {
                throw ReportQuotaExceededException::forType($reportType->code, $maxTypeCount, $assignment->id);
            }
        }

        if ($assignment->required_reports_count !== null && $assignment->required_reports_count > 0) {
            $existingTotalCount = Report::query()
                ->where('training_assignment_id', $assignment->id)
                ->when($ignoreReportId !== null, fn ($q) => $q->where('id', '!=', $ignoreReportId))
                ->lockForUpdate()
                ->count();

            if ($existingTotalCount >= $assignment->required_reports_count) {
                throw ReportQuotaExceededException::forTotal($assignment->required_reports_count, $assignment->id);
            }
        }

        $duplicateExists = Report::query()
            ->where('training_assignment_id', $assignment->id)
            ->where('report_type_id', $reportTypeId)
            ->where('report_number', $reportNumber)
            ->when($ignoreReportId !== null, fn ($q) => $q->where('id', '!=', $ignoreReportId))
            ->lockForUpdate()
            ->exists();

        if ($duplicateExists) {
            throw DuplicateReportException::forAssignmentTypeAndNumber($assignment->id, $reportTypeId, $reportNumber);
        }
    }
}
