<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a student attempts to create a report of a given type before
 * enough reports of its prerequisite type (the nearest enabled tier below
 * it in TrainingAssignment::REPORT_TYPE_HIERARCHY, or — for `final` — the
 * nearest enabled recurring tier of any kind) have been approved.
 *
 * See TrainingAssignment::getPrerequisiteReportType() and
 * ::getSequentialThreshold() for how the required count is derived.
 */
class ReportSequenceNotMetException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $typeCode,
        public readonly string $prerequisiteType,
        public readonly int $required,
        public readonly int $approved,
    ) {
        parent::__construct($message);
    }

    public static function forType(
        string $typeCode,
        string $prerequisiteType,
        int $required,
        int $approved,
        int $assignmentId
    ): self {
        return new self(
            sprintf(
                'Report type "%s" requires %d approved "%s" report(s) (only %d approved) on assignment #%d.',
                $typeCode,
                $required,
                $prerequisiteType,
                $approved,
                $assignmentId
            ),
            $typeCode,
            $prerequisiteType,
            $required,
            $approved,
        );
    }
}