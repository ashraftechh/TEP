<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * TEP-678 — thrown when attempting to submit a report whose status is neither
 * 'draft' nor 'revision_requested'. Submitting (`reports.own.submit`) is only
 * allowed for draft reports or when revisions have been requested. Caught by
 * ReportController::submit() and returned as an HTTP 422 JSON response.
 */
class ReportNotSubmittableException extends RuntimeException
{
    public static function forStatus(string $status): self
    {
        return new self(
            sprintf('Cannot submit a report with status "%s". Only draft or revision requested reports may be submitted.', $status)
        );
    }
}
