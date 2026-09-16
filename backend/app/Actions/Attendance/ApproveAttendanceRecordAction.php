<?php

declare(strict_types=1);

namespace App\Actions\Attendance;

use App\Models\AttendanceRecord;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * TEP-694 — Approve an attendance record.
 * Sets approval_status to 'approved', records approver and timestamp.
 */
class ApproveAttendanceRecordAction
{
    public function execute(AttendanceRecord $record, User $actor): AttendanceRecord
    {
        return DB::transaction(function () use ($record, $actor) {
            $record->approval_status = AttendanceRecord::APPROVAL_APPROVED;
            $record->approved_by = $actor->id;
            $record->approved_at = now();
            $record->version = (int) $record->version + 1;
            $record->save();

            return $record;
        });
    }
}
