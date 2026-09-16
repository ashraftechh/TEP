<?php

declare(strict_types=1);

namespace App\Http\Requests\Attendance;

use App\Models\TrainingAssignment;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class RecordAttendanceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        /** @var User|null $user */
        $user = $this->user();

        if (! $user || ! $user->hasPermission('attendance_records.record')) {
            return false;
        }

        /** @var TrainingAssignment|null $assignment */
        $assignment = $this->route('trainingAssignment');

        if (! $assignment) {
            return false;
        }

        return $assignment->company_id === $user->companyRepresentative?->company_id
            || $assignment->field_supervisor_id === $user->id;
    }

    /**
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'attendance_date' => ['required', 'date', 'before_or_equal:today'],
            'status' => ['required', 'string', 'in:present,absent,excused,late'],
            'reason' => ['required_unless:status,present', 'nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required_unless' => __('attendance.validation.reason_required_for_non_present'),
            'attendance_date.before_or_equal' => __('attendance.validation.date_cannot_be_future'),
        ];
    }
}
