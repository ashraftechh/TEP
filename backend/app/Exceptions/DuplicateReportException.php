<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * TEP-674 — thrown when a report already exists for the same
 * (training_assignment_id, report_type_id, report_number) triple — e.g.
 * a second "week 3" weekly report for the same placement. Caught by
 * ReportController::store() and turned into a 409.
 */
class DuplicateReportException extends RuntimeException
{
    public function __construct(string $message, public readonly string $errorCode = 'duplicate_report')
    {
        parent::__construct($message);
    }

    public static function forAssignmentTypeAndNumber(int $assignmentId, int $reportTypeId, int $reportNumber): self
    {
        return new self(
            sprintf(
                'A report of type #%d, number %d already exists for assignment #%d.',
                $reportTypeId,
                $reportNumber,
                $assignmentId
            ),
            'duplicate_report'
        );
    }

    public static function forFinalReport(int $assignmentId): self
    {
        return new self(
            sprintf(
                'A final report already exists for assignment #%d.',
                $assignmentId
            ),
            'duplicate_final_report'
        );
    }
}
