<?php

declare(strict_types=1);

namespace App\Actions\Attendance;

use App\Models\AttendanceRecord;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * TEP-694 — Reject an attendance record with a required reason.
 * Sets approval_status to 'rejected', records rejection reason, approver, and timestamp.
 */
class RejectAttendanceRecordAction
{
    public function execute(AttendanceRecord $record, string $reason, User $actor): AttendanceRecord
    {
        return DB::transaction(function () use ($record, $reason, $actor) {
            $record->approval_status = AttendanceRecord::APPROVAL_REJECTED;
            $record->reason = $reason;
            $record->approved_by = $actor->id;
            $record->approved_at = now();
            $record->version = (int) $record->version + 1;
            $record->save();

            return $record;
        });
    }
}
