<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * TEP-674 — thrown when attempting to update a report whose status is no
 * longer 'draft'. Editing (`reports.own.update`) is only allowed while a
 * report is still a draft; once submitted, only the (later, TEP-678+)
 * review workflow may change it. Caught by ReportController::update()
 * and turned into a 422.
 */
class ReportNotEditableException extends RuntimeException
{
    public static function forStatus(string $status): self
    {
        return new self(
            sprintf('Cannot edit a report with status "%s". Only draft or revision requested reports may be edited.', $status)
        );
    }
}
