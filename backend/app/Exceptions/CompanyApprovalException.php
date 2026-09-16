<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

class CompanyApprovalException extends RuntimeException
{
    /**
     * Create an exception for when a company has an invalid status for approval.
     */
    public static function invalidStatus(string $currentStatus): self
    {
        return new self(
            sprintf(
                'Cannot approve company with status "%s". Only companies in "pending_verification" or "under_review" status can be approved.',
                $currentStatus
            )
        );
    }

    /**
     * Create an exception for when a company has no contact email.
     */
    public static function missingEmail(): self
    {
        return new self('Cannot approve a company with no contact email — request changes instead.');
    }
}
