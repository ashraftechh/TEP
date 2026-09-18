<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Attendance\ApproveAttendanceRecordAction;
use App\Actions\Attendance\RecordAttendanceAction;
use App\Actions\Attendance\RejectAttendanceRecordAction;
use App\Exceptions\AttendanceRecordNotReviewableException;
use App\Exceptions\DuplicateAttendanceRecordException;
use App\Exceptions\InvalidAttendanceAssignmentStatusException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Attendance\ApproveAttendanceRecordRequest;
use App\Http\Requests\Attendance\GetAssignmentAttendanceRequest;
use App\Http\Requests\Attendance\RecordAttendanceRequest;
use App\Http\Requests\Attendance\RejectAttendanceRecordRequest;
use App\Http\Resources\AttendanceRecordResource;
use App\Models\AttendanceRecord;
use App\Models\TrainingAssignment;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AttendanceRecordController extends Controller
{
    public function __construct(
        private readonly RecordAttendanceAction $recordAttendanceAction,
        private readonly ApproveAttendanceRecordAction $approveAttendanceRecordAction,
        private readonly RejectAttendanceRecordAction $rejectAttendanceRecordAction,
    ) {}

    /**
     * List all attendance records and summary stats for a training assignment.
     *
     * TEP-692 — GET /api/v1/training-assignments/{trainingAssignment}/attendance
     */
    public function indexForAssignment(
        GetAssignmentAttendanceRequest $request,
        TrainingAssignment $trainingAssignment
    ): JsonResponse {
        $baseQuery = AttendanceRecord::query()
            ->where('training_assignment_id', $trainingAssignment->id);

        $validQuery = (clone $baseQuery)->where('approval_status', '!=', AttendanceRecord::APPROVAL_REJECTED);

        // Calculate summary stats across records for this assignment.
        // Rejected records are excluded from active status counts (absent, present, etc.)
        $summary = [
            'total_days' => (clone $baseQuery)->count(),
            'valid_days' => (clone $validQuery)->count(),
            'present_days' => (clone $validQuery)->where('status', AttendanceRecord::STATUS_PRESENT)->count(),
            'absent_days' => (clone $validQuery)->where('status', AttendanceRecord::STATUS_ABSENT)->count(),
            'late_days' => (clone $validQuery)->where('status', AttendanceRecord::STATUS_LATE)->count(),
            'excused_days' => (clone $validQuery)->where('status', AttendanceRecord::STATUS_EXCUSED)->count(),
            'pending_count' => (clone $baseQuery)->where('approval_status', AttendanceRecord::APPROVAL_PENDING)->count(),
            'approved_count' => (clone $baseQuery)->where('approval_status', AttendanceRecord::APPROVAL_APPROVED)->count(),
            'rejected_count' => (clone $baseQuery)->where('approval_status', AttendanceRecord::APPROVAL_REJECTED)->count(),
        ];

        // Apply filters to records query if provided
        $query = clone $baseQuery;

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('approval_status')) {
            $query->where('approval_status', $request->input('approval_status'));
        }

        if ($request->filled('from')) {
            $query->whereDate('attendance_date', '>=', $request->input('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('attendance_date', '<=', $request->input('to'));
        }

        if ($request->filled('month')) {
            $month = (string) $request->input('month');
            $query->where('attendance_date', 'like', $month.'%');
        }

        $records = $query
            ->with(['recordedBy', 'approvedBy'])
            ->orderByDesc('attendance_date')
            ->get();

        return response()->json([
            'data' => AttendanceRecordResource::collection($records),
            'summary' => $summary,
            'message' => __('attendance.fetched_successfully'),
        ]);
    }

    /**
     * Record attendance for a student's training assignment.
     *
     * TEP-693 — POST /api/v1/training-assignments/{trainingAssignment}/attendance
     */
    public function storeForAssignment(
        RecordAttendanceRequest $request,
        TrainingAssignment $trainingAssignment
    ): JsonResponse {
        /** @var User $user */
        $user = $request->user();

        try {
            $record = $this->recordAttendanceAction->execute(
                assignment: $trainingAssignment,
                data: $request->validated(),
                actor: $user
            );
        } catch (DuplicateAttendanceRecordException) {
            return response()->json([
                'message' => __('attendance.already_recorded'),
                'error_code' => 'attendance_already_recorded',
            ], 409);
        } catch (InvalidAttendanceAssignmentStatusException) {
            return response()->json([
                'message' => __('attendance.assignment_not_active'),
                'error_code' => 'assignment_not_active',
            ], 422);
        }

        $record->load(['recordedBy']);

        return (new AttendanceRecordResource($record))
            ->additional([
                'message' => __('attendance.recorded_successfully'),
            ])
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Approve a pending attendance record.
     *
     * TEP-694 — PATCH /api/v1/attendance-records/{attendanceRecord}/approve
     */
    public function approve(
        ApproveAttendanceRecordRequest $request,
        AttendanceRecord $attendanceRecord
    ): JsonResponse {
        /** @var User $user */
        $user = $request->user();

        try {
            $record = $this->approveAttendanceRecordAction->execute(
                record: $attendanceRecord,
                actor: $user
            );
        } catch (AttendanceRecordNotReviewableException) {
            return response()->json([
                'message' => __('attendance.not_reviewable'),
                'error_code' => 'attendance_record_not_reviewable',
            ], 422);
        }

        $record->load(['recordedBy', 'approvedBy']);

        return (new AttendanceRecordResource($record))
            ->additional([
                'message' => __('attendance.approved_successfully'),
            ])
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Reject a pending attendance record with reason.
     *
     * TEP-694 — PATCH /api/v1/attendance-records/{attendanceRecord}/reject
     */
    public function reject(
        RejectAttendanceRecordRequest $request,
        AttendanceRecord $attendanceRecord
    ): JsonResponse {
        /** @var User $user */
        $user = $request->user();

        try {
            $record = $this->rejectAttendanceRecordAction->execute(
                record: $attendanceRecord,
                reason: (string) $request->validated('reason'),
                actor: $user
            );
        } catch (AttendanceRecordNotReviewableException) {
            return response()->json([
                'message' => __('attendance.not_reviewable'),
                'error_code' => 'attendance_record_not_reviewable',
            ], 422);
        }

        $record->load(['recordedBy', 'approvedBy']);

        return (new AttendanceRecordResource($record))
            ->additional([
                'message' => __('attendance.rejected_successfully'),
            ])
            ->response()
            ->setStatusCode(200);
    }
}
