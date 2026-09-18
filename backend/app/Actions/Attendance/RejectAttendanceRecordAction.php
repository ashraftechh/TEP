<?php

declare(strict_types=1);

namespace App\Actions\Attendance;

use App\Exceptions\AttendanceRecordNotReviewableException;
use App\Models\AttendanceRecord;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * TEP-694 — Reject an attendance record with a required reason.
 * Sets approval_status to 'rejected', records rejection reason, approver, and timestamp.
 *
 * Only allowed while the record's approval_status is still 'pending' —
 * see ApproveAttendanceRecordAction for why this guard exists.
 */
class RejectAttendanceRecordAction
{
    public function execute(AttendanceRecord $record, string $reason, User $actor): AttendanceRecord
    {
        return DB::transaction(function () use ($record, $reason, $actor) {
            /** @var AttendanceRecord $locked */
            $locked = AttendanceRecord::query()->whereKey($record->id)->lockForUpdate()->firstOrFail();

            if ($locked->approval_status !== AttendanceRecord::APPROVAL_PENDING) {
                throw AttendanceRecordNotReviewableException::forStatus($locked->approval_status);
            }

            $locked->approval_status = AttendanceRecord::APPROVAL_REJECTED;
            $locked->reason = $reason;
            $locked->approved_by = $actor->id;
            $locked->approved_at = now();
            $locked->version = (int) $locked->version + 1;
            $locked->save();

            return $locked;
        });
    }
}
