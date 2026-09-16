<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\AttendanceRecord;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AttendanceRecord
 */
class AttendanceRecordResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var AttendanceRecord $record */
        $record = $this->resource;

        return [
            'id' => $record->id,
            'training_assignment_id' => $record->training_assignment_id,
            'attendance_date' => $record->attendance_date?->toDateString(),
            'status' => $record->status,
            'reason' => $record->reason,
            'recorded_by' => $record->recorded_by,
            'approval_status' => $record->approval_status,
            'approved_by' => $record->approved_by,
            'approved_at' => $record->approved_at?->toISOString(),
            'version' => $record->version,
            'created_at' => $record->created_at?->toISOString(),
            'updated_at' => $record->updated_at?->toISOString(),

            'recorder' => $this->when(
                $record->relationLoaded('recordedBy') && $record->recordedBy,
                fn () => [
                    'id' => $record->recordedBy->id,
                    'name' => $record->recordedBy->name,
                    'email' => $record->recordedBy->email,
                ]
            ),

            'approver' => $this->when(
                $record->relationLoaded('approvedBy') && $record->approvedBy,
                fn () => [
                    'id' => $record->approvedBy->id,
                    'name' => $record->approvedBy->name,
                    'email' => $record->approvedBy->email,
                ]
            ),

            'training_assignment' => $this->when(
                $record->relationLoaded('trainingAssignment') && $record->trainingAssignment,
                fn () => new TrainingAssignmentResource($record->trainingAssignment)
            ),
        ];
    }
}
