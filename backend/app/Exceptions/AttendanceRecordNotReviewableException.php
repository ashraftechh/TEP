<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown when attempting to approve or reject an attendance record whose
 * approval_status is not 'pending' — i.e. it has already been decided
 * once. Approve/reject are one-shot decisions; re-deciding an
 * already-approved or already-rejected record (in either direction) is
 * not permitted through this endpoint. Caught by
 * AttendanceRecordController::approve()/reject() and turned into a 422.
 */
class AttendanceRecordNotReviewableException extends RuntimeException
{
    public static function forStatus(string $approvalStatus): self
    {
        return new self(
            sprintf(
                'Cannot approve or reject an attendance record with approval_status "%s". Only pending records may be reviewed.',
                $approvalStatus
            )
        );
    }
}
