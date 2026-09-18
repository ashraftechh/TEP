<?php

declare(strict_types=1);

namespace App\Actions\Attendance;

use App\Exceptions\AttendanceRecordNotReviewableException;
use App\Models\AttendanceRecord;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * TEP-694 — Approve an attendance record.
 * Sets approval_status to 'approved', records approver and timestamp.
 *
 * Only allowed while the record's approval_status is still 'pending' —
 * without this guard, an already-approved or already-rejected record
 * could be silently re-decided any number of times, with no audit trail
 * distinguishing the flip from the original decision.
 */
class ApproveAttendanceRecordAction
{
    public function execute(AttendanceRecord $record, User $actor): AttendanceRecord
    {
        return DB::transaction(function () use ($record, $actor) {
            /** @var AttendanceRecord $locked */
            $locked = AttendanceRecord::query()->whereKey($record->id)->lockForUpdate()->firstOrFail();

            if ($locked->approval_status !== AttendanceRecord::APPROVAL_PENDING) {
                throw AttendanceRecordNotReviewableException::forStatus($locked->approval_status);
            }

            $locked->approval_status = AttendanceRecord::APPROVAL_APPROVED;
            $locked->approved_by = $actor->id;
            $locked->approved_at = now();
            $locked->version = (int) $locked->version + 1;
            $locked->save();

            return $locked;
        });
    }
}
