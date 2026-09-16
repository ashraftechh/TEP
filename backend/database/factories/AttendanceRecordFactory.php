<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\AttendanceRecord;
use App\Models\TrainingAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AttendanceRecord>
 */
class AttendanceRecordFactory extends Factory
{
    protected $model = AttendanceRecord::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'training_assignment_id' => TrainingAssignment::factory(),
            'attendance_date' => fake()->date(),
            'status' => AttendanceRecord::STATUS_PRESENT,
            'reason' => null,
            'recorded_by' => User::factory(),
            'approval_status' => AttendanceRecord::APPROVAL_PENDING,
            'approved_by' => null,
            'approved_at' => null,
            'version' => 1,
        ];
    }

    public function present(): static
    {
        return $this->state(fn () => [
            'status' => AttendanceRecord::STATUS_PRESENT,
            'reason' => null,
        ]);
    }

    public function absent(?string $reason = 'Sick leave'): static
    {
        return $this->state(fn () => [
            'status' => AttendanceRecord::STATUS_ABSENT,
            'reason' => $reason,
        ]);
    }

    public function late(?string $reason = 'Traffic delay'): static
    {
        return $this->state(fn () => [
            'status' => AttendanceRecord::STATUS_LATE,
            'reason' => $reason,
        ]);
    }

    public function excused(?string $reason = 'University appointment'): static
    {
        return $this->state(fn () => [
            'status' => AttendanceRecord::STATUS_EXCUSED,
            'reason' => $reason,
        ]);
    }

    public function approved(?User $approver = null): static
    {
        return $this->state(fn () => [
            'approval_status' => AttendanceRecord::APPROVAL_APPROVED,
            'approved_by' => $approver?->id ?? User::factory(),
            'approved_at' => now(),
        ]);
    }

    public function rejected(?string $reason = 'Invalid excuse', ?User $rejector = null): static
    {
        return $this->state(fn () => [
            'approval_status' => AttendanceRecord::APPROVAL_REJECTED,
            'reason' => $reason,
            'approved_by' => $rejector?->id ?? User::factory(),
            'approved_at' => now(),
        ]);
    }

    public function pending(): static
    {
        return $this->state(fn () => [
            'approval_status' => AttendanceRecord::APPROVAL_PENDING,
            'approved_by' => null,
            'approved_at' => null,
        ]);
    }
}
