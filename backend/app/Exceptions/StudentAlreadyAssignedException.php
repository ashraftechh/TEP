<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by CreateTrainingAssignmentAction when the student already has an active
 * or suspended training assignment.
 */
class StudentAlreadyAssignedException extends RuntimeException
{
    public static function forStudent(int $studentProfileId): self
    {
        return new self(
            sprintf('Student profile #%d already has an active or suspended training assignment.', $studentProfileId)
        );
    }
}
