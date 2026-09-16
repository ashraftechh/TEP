<?php

declare(strict_types=1);

namespace App\Actions\Attendance;

use App\Exceptions\DuplicateAttendanceRecordException;
use App\Exceptions\InvalidAttendanceAssignmentStatusException;
use App\Models\AttendanceRecord;
use App\Models\TrainingAssignment;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * TEP-693 — Record attendance for a training assignment.
 *
 * Checks assignment status (must be active) and ensures only one record
 * exists per (training_assignment_id, attendance_date) pair inside a
 * database transaction to prevent concurrent duplicate records.
 */
class RecordAttendanceAction
{
    /**
     * @param array{
     *     attendance_date: string,
     *     status: string,
     *     reason?: string|null,
     * } $data
     */
    public function execute(TrainingAssignment $assignment, array $data, User $actor): AttendanceRecord
    {
        if ($assignment->status !== 'active') {
            throw InvalidAttendanceAssignmentStatusException::forStatus($assignment->status);
        }

        return DB::transaction(function () use ($assignment, $data, $actor) {
            $alreadyExists = AttendanceRecord::query()
                ->where('training_assignment_id', $assignment->id)
                ->where('attendance_date', $data['attendance_date'])
                ->lockForUpdate()
                ->exists();

            if ($alreadyExists) {
                throw DuplicateAttendanceRecordException::forAssignmentAndDate(
                    $assignment->id,
                    $data['attendance_date']
                );
            }

            return AttendanceRecord::create([
                'training_assignment_id' => $assignment->id,
                'attendance_date' => $data['attendance_date'],
                'status' => $data['status'],
                'reason' => $data['reason'] ?? null,
                'recorded_by' => $actor->id,
                'approval_status' => AttendanceRecord::APPROVAL_PENDING,
                'approved_by' => null,
                'approved_at' => null,
                'version' => 1,
            ]);
        });
    }
}
