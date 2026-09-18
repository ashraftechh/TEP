<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when a student attempts to update or submit a report whose
 * training assignment is no longer 'active' (suspended, terminated, or
 * completed). Transitioning an assignment away from 'active'
 * (TransitionTrainingAssignmentAction) never cascades to its reports —
 * this exception is what stops a draft left over from before the
 * assignment ended from still being edited or submitted afterward.
 *
 * Distinct from TrainingCompletedException, which fires specifically
 * when an *approved final report* already exists — an assignment can be
 * 'completed'/'suspended'/'terminated' by a coordinator without that
 * necessarily being true, so both checks are kept independent.
 */
class AssignmentNotActiveException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly ?int $assignmentId,
        public readonly string $status,
    ) {
        parent::__construct($message);
    }

    public static function forAssignment(?int $assignmentId, string $status): self
    {
        return new self(
            sprintf(
                'Training assignment #%s is "%s", not active; no further reports may be created, edited, or submitted.',
                $assignmentId !== null ? (string) $assignmentId : 'unknown',
                $status
            ),
            $assignmentId,
            $status,
        );
    }
}
