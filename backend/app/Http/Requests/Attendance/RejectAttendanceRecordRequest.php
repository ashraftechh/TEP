<?php

declare(strict_types=1);

namespace App\Http\Requests\Attendance;

use App\Models\AttendanceRecord;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class RejectAttendanceRecordRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        /** @var User|null $user */
        $user = $this->user();

        if (! $user || ! $user->hasPermission('attendance_records.approve')) {
            return false;
        }

        /** @var AttendanceRecord|null $record */
        $record = $this->route('attendanceRecord');

        if (! $record) {
            return false;
        }

        if ($user->hasRole('training_coordinator') || $user->hasRole('super_admin')) {
            return true;
        }

        if ($user->hasRole('academic_supervisor')) {
            $assignment = $record->trainingAssignment;

            return $assignment !== null && (int) $assignment->academic_supervisor_id === (int) $user->id;
        }

        return false;
    }

    /**
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'min:3', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required' => __('attendance.validation.rejection_reason_required'),
        ];
    }
}
