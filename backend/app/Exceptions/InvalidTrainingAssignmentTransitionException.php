<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * TEP-670 — thrown by TransitionTrainingAssignmentAction when the
 * requested `to` status is not reachable from the assignment's current
 * status per TrainingAssignment::TRANSITIONS. Caught by
 * TrainingAssignmentController::transition() and turned into a 422,
 * same division of responsibility as DuplicateTrainingAssignmentException
 * (TEP-661) being caught in TrainingAssignmentController::store().
 */
class InvalidTrainingAssignmentTransitionException extends RuntimeException
{
    public static function forTransition(string $from, string $to): self
    {
        return new self(
            sprintf('Cannot transition a training assignment from "%s" to "%s".', $from, $to)
        );
    }
}
