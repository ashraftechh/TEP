<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * TEP-661 — thrown by CreateTrainingAssignmentAction when a
 * `training_assignments` row already exists for the given application,
 * caught by TrainingAssignmentController::store() and turned into a 409.
 */
class DuplicateTrainingAssignmentException extends RuntimeException
{
    public static function forApplication(int $applicationId): self
    {
        return new self(
            sprintf('A training assignment already exists for application #%d.', $applicationId)
        );
    }
}
