<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * TEP-693 — thrown when attempting to record attendance on a training assignment
 * whose status is not 'active'.
 */
class InvalidAttendanceAssignmentStatusException extends RuntimeException
{
    public static function forStatus(string $status): self
    {
        return new self(
            sprintf('Cannot record attendance for an assignment with status "%s". Placement must be active.', $status)
        );
    }
}
