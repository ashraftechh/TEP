<?php

declare(strict_types=1);

namespace App\Http\Requests\Attendance;

use App\Models\TrainingAssignment;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class GetAssignmentAttendanceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        /** @var User|null $user */
        $user = $this->user();

        if (! $user) {
            return false;
        }

        $hasAnyPermission = $user->hasPermission('attendance_records.own.view')
            || $user->hasPermission('attendance_records.record')
            || $user->hasPermission('attendance_records.approve')
            || $user->hasPermission('attendance_records.view_any');

        if (! $hasAnyPermission) {
            return false;
        }

        /** @var TrainingAssignment|null $assignment */
        $assignment = $this->route('trainingAssignment');

        if (! $assignment) {
            return false;
        }

        // Coordinator / Super admin with view_any
        if ($user->hasPermission('attendance_records.view_any') || $user->hasRole('training_coordinator') || $user->hasRole('super_admin')) {
            return true;
        }

        // Student viewing their own assignment
        if ($user->hasRole('student')) {
            return $user->studentProfile !== null
                && $assignment->student_profile_id === $user->studentProfile->id;
        }

        // Company representative or designated field supervisor can view this assignment's attendance.
        if ($user->hasRole('company_representative')) {
            return $assignment->company_id === $user->companyRepresentative?->company_id
                || $assignment->field_supervisor_id === $user->id;
        }

        // Academic supervisor viewing an assigned student's attendance
        if ($user->hasRole('academic_supervisor')) {
            return $assignment->academic_supervisor_id === $user->id;
        }

        return false;
    }

    /**
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'status' => ['nullable', 'string', 'in:present,absent,late,excused'],
            'approval_status' => ['nullable', 'string', 'in:pending,approved,rejected'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'month' => ['nullable', 'date_format:Y-m'],
        ];
    }
}
