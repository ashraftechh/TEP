<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Minimal model for the `attendance_records` table (migration
 * 2026_09_08_160327_create_attendance_records_table.php, Sprint 4).
 *
 * FLAGGED / scope note: only what TEP-665 needs to surface
 * `latest_attendance_status` on a training assignment is implemented here —
 * the record/approve workflow itself (attendance_records.record/.approve in
 * the Sprint 4 permission catalog) belongs to its own, later ticket and is
 * intentionally NOT built as part of this subtask.
 */
#[Fillable([
    'training_assignment_id',
    'attendance_date',
    'status',
    'reason',
    'recorded_by',
    'approval_status',
    'approved_by',
    'approved_at',
    'version',
])]
class AttendanceRecord extends Model
{
    use HasFactory, SoftDeletes;

    public const STATUS_PRESENT = 'present';

    public const STATUS_ABSENT = 'absent';

    public const STATUS_LATE = 'late';

    public const STATUS_EXCUSED = 'excused';

    public const STATUSES = [
        self::STATUS_PRESENT,
        self::STATUS_ABSENT,
        self::STATUS_LATE,
        self::STATUS_EXCUSED,
    ];

    public const APPROVAL_PENDING = 'pending';

    public const APPROVAL_APPROVED = 'approved';

    public const APPROVAL_REJECTED = 'rejected';

    public const APPROVAL_STATUSES = [
        self::APPROVAL_PENDING,
        self::APPROVAL_APPROVED,
        self::APPROVAL_REJECTED,
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'attendance_date' => 'date',
            'approved_at' => 'datetime',
            'version' => 'integer',
        ];
    }

    /**
     * The training assignment this attendance record belongs to.
     *
     * @return BelongsTo<TrainingAssignment, $this>
     */
    public function trainingAssignment(): BelongsTo
    {
        return $this->belongsTo(TrainingAssignment::class);
    }

    /**
     * The user who recorded this attendance record.
     *
     * @return BelongsTo<User, $this>
     */
    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    /**
     * The user who approved or rejected this attendance record.
     *
     * @return BelongsTo<User, $this>
     */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function isPending(): bool
    {
        return $this->approval_status === self::APPROVAL_PENDING;
    }

    public function isApproved(): bool
    {
        return $this->approval_status === self::APPROVAL_APPROVED;
    }

    public function isRejected(): bool
    {
        return $this->approval_status === self::APPROVAL_REJECTED;
    }
}
