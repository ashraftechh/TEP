<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * TEP-682 — thrown when attempting to review a report whose status is not 'submitted'.
 * Only submitted reports may be reviewed by the assigned academic supervisor.
 * Caught by ReportController::review() and converted to a 422 JSON response.
 */
class ReportNotReviewableException extends RuntimeException
{
    public static function forStatus(string $status): self
    {
        return new self(
            sprintf('Cannot review a report with status "%s". Only submitted reports may be reviewed.', $status)
        );
    }
}
