<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a student attempts to create or submit a report but their
 * training assignment already has an approved final report — the training
 * is considered complete and no further report activity is permitted.
 */
class TrainingCompletedException extends RuntimeException
{
    public static function forAssignment(int $assignmentId): self
    {
        return new self(
            sprintf(
                'Assignment #%d has an approved final report; no further reports may be created or submitted.',
                $assignmentId
            )
        );
    }
}
