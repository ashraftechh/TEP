<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

class CompanyRejectionException extends RuntimeException
{
    /**
     * Create an exception for when a company has an invalid status for rejection/request changes.
     */
    public static function invalidStatus(string $currentStatus): self
    {
        return new self(
            sprintf(
                'Cannot reject or request changes on company with status "%s". Only companies in "pending_verification" or "under_review" status can be modified.',
                $currentStatus
            )
        );
    }

    /**
     * Create an exception for an invalid target status.
     */
    public static function invalidTargetStatus(string $targetStatus): self
    {
        return new self(
            sprintf(
                'Invalid target status "%s". Target status must be either "rejected" or "changes_requested".',
                $targetStatus
            )
        );
    }

    /**
     * Create an exception for an empty reason.
     */
    public static function missingReason(): self
    {
        return new self('A reason must be provided when rejecting a company or requesting changes.');
    }
}
