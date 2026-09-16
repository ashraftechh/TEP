<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Application;
use App\Models\Opportunity;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Application>
 *
 * Note: student_profile_id must be supplied explicitly in tests via
 * ->create(['student_profile_id' => $studentProfile->id]), since
 * StudentProfile requires major_id -> department_id -> college_id chain.
 * opportunity_id defaults to a fresh published Opportunity (via factory).
 */
class ApplicationFactory extends Factory
{
    protected $model = Application::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'opportunity_id' => Opportunity::factory()->published(),
            'student_profile_id' => null, // Must be provided by the caller
            'cv_file_id' => null,
            'cover_note' => fake()->optional()->paragraph(),
            'status' => 'submitted',
            'interview_at' => null,
            'decision_reason' => null,
            'withdrawn_reason' => null,
            'version' => 1,
        ];
    }

    /**
     * Application is under review.
     */
    public function underReview(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'under_review',
        ]);
    }

    /**
     * Application has an interview scheduled.
     */
    public function interviewScheduled(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'interview_scheduled',
            'interview_at' => now()->addDays(7),
        ]);
    }

    /**
     * Application was accepted.
     */
    public function accepted(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'accepted',
        ]);
    }

    /**
     * Application was rejected.
     */
    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'rejected',
            'decision_reason' => fake()->sentence(),
        ]);
    }

    /**
     * Application was withdrawn by the student.
     */
    public function withdrawn(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'withdrawn',
            'withdrawn_reason' => fake()->optional()->sentence(),
        ]);
    }
}
