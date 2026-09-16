<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * TEP-674 — thrown when a student attempts to create a report draft but
 * has no `training_assignments` row with status 'active'. Caught by
 * ReportController::store() and turned into a 422.
 */
class NoActiveTrainingAssignmentException extends RuntimeException
{
    public static function forStudent(int $userId): self
    {
        return new self(
            sprintf('User #%d has no active training assignment to file a report against.', $userId)
        );
    }
}
