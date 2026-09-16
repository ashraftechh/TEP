<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a student attempts to create a report of a type that is not
 * enabled for their training assignment.
 */
class ReportTypeNotAllowedException extends RuntimeException
{
    public static function forType(string $typeCode, int $assignmentId): self
    {
        return new self(
            sprintf(
                'Report type "%s" is not enabled for training assignment #%d.',
                $typeCode,
                $assignmentId
            )
        );
    }
}
