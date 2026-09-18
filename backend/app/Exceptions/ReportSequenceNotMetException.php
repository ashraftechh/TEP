<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown in two distinct sequencing scenarios, distinguished by
 * `$isSameTypePredecessor`:
 *
 *  - Cross-tier (forType()): a student attempts to create a report of a
 *    given type before enough reports of its prerequisite type (the
 *    nearest enabled tier below it in
 *    TrainingAssignment::REPORT_TYPE_HIERARCHY, or — for `final` — the
 *    nearest enabled recurring tier of any kind) have been approved. See
 *    TrainingAssignment::getPrerequisiteReportType() and
 *    ::getSequentialThreshold() for how the required count is derived.
 *
 *  - Same-type (forSameTypePredecessor()): a student attempts to SUBMIT
 *    report_number N of a type before report_number N-1 of that SAME
 *    type is approved — enforced in SubmitReportAction, independent of
 *    the cross-tier check above.
 */
class ReportSequenceNotMetException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly bool $isSameTypePredecessor,
        public readonly ?string $typeCode = null,
        public readonly ?string $prerequisiteType = null,
        public readonly ?int $required = null,
        public readonly ?int $approved = null,
        public readonly ?int $reportTypeId = null,
        public readonly ?int $reportNumber = null,
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
            isSameTypePredecessor: false,
            typeCode: $typeCode,
            prerequisiteType: $prerequisiteType,
            required: $required,
            approved: $approved,
        );
    }

    public static function forSameTypePredecessor(
        int $reportTypeId,
        int $reportNumber,
        string $typeCode,
    ): self {
        return new self(
            sprintf(
                'Report #%d of type "%s" (report_type_id #%d) cannot be submitted until report #%d of the same type is approved.',
                $reportNumber,
                $typeCode,
                $reportTypeId,
                $reportNumber - 1,
            ),
            isSameTypePredecessor: true,
            typeCode: $typeCode,
            reportTypeId: $reportTypeId,
            reportNumber: $reportNumber,
        );
    }
}
