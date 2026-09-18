<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Application;
use App\Models\Company;
use App\Models\Opportunity;
use App\Models\StudentProfile;
use App\Models\TrainingAssignment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TrainingAssignment>
 */
class TrainingAssignmentFactory extends Factory
{
    protected $model = TrainingAssignment::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'application_id' => Application::factory(),
            'student_profile_id' => StudentProfile::factory(),
            'company_id' => Company::factory(),
            'opportunity_id' => Opportunity::factory(),
            'academic_supervisor_id' => User::factory(),
            'field_supervisor_id' => User::factory(),
            'training_coordinator_id' => User::factory(),
            'status' => 'active',
            'is_current' => true,
            'start_date' => now()->subMonth()->toDateString(),
            'end_date' => now()->addMonths(2)->toDateString(),
            'progress_percentage' => 25,
            'required_reports_count' => 12,
            'suspension_reason' => null,
            'termination_reason' => null,
            'version' => 1,
        ];
    }

    public function active(): static
    {
        return $this->state(fn () => ['status' => 'active']);
    }

    public function suspended(?string $reason = 'Administrative hold'): static
    {
        return $this->state(fn () => [
            'status' => 'suspended',
            'suspension_reason' => $reason,
        ]);
    }

    public function completed(): static
    {
        return $this->state(fn () => [
            'status' => 'completed',
            'progress_percentage' => 100,
        ]);
    }

    public function terminated(?string $reason = 'Student withdrawal'): static
    {
        return $this->state(fn () => [
            'status' => 'terminated',
            'termination_reason' => $reason,
        ]);
    }

    /**
     * Marks this assignment as NOT the student's current one — for tests
     * building a "student has an old placement plus a new current one"
     * scenario.
     */
    public function notCurrent(): static
    {
        return $this->state(fn () => ['is_current' => false]);
    }
}
