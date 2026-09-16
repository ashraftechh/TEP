<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * TEP-693 — thrown when an attendance record already exists for the given
 * (training_assignment_id, attendance_date) pair, caught by
 * AttendanceRecordController::storeForAssignment() and turned into a 409.
 */
class DuplicateAttendanceRecordException extends RuntimeException
{
    public static function forAssignmentAndDate(int $assignmentId, string $date): self
    {
        return new self(
            sprintf('Attendance has already been recorded for assignment #%d on %s.', $assignmentId, $date)
        );
    }
}
