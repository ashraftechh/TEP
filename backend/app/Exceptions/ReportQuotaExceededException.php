<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a student attempts to create a report exceeding the configured
 * maximum quota for that report type or the overall required reports count.
 */
class ReportQuotaExceededException extends RuntimeException
{
    public static function forType(string $typeCode, int $maxCount, int $assignmentId): self
    {
        return new self(
            sprintf(
                'Quota of %d reports reached for report type "%s" on assignment #%d.',
                $maxCount,
                $typeCode,
                $assignmentId
            )
        );
    }

    public static function forTotal(int $maxTotal, int $assignmentId): self
    {
        return new self(
            sprintf(
                'Total reports quota of %d reached on assignment #%d.',
                $maxTotal,
                $assignmentId
            )
        );
    }
}
