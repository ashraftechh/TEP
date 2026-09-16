<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Company;
use App\Models\Industry;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Company>
 */
class CompanyFactory extends Factory
{
    protected $model = Company::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->company();

        return [
            'name' => [
                'en' => $name,
                'ar' => $name,
            ],
            'registration_number' => fake()->unique()->numerify('CR-######'),
            'industry_id' => Industry::factory(),
            'description' => [
                'en' => fake()->paragraph(),
                'ar' => fake()->paragraph(),
            ],
            'contact_email' => fake()->unique()->companyEmail(),
            'phone' => fake()->phoneNumber(),
            'website' => fake()->url(),
            'address' => fake()->address(),
            'city' => fake()->city(),
            'established_year' => fake()->numberBetween(1990, 2024),
            'employees_count' => '50-100',
            'status' => 'pending_verification',
        ];
    }

    /**
     * Indicate that the company is approved.
     */
    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'approved',
            'approved_at' => now(),
        ]);
    }

    /**
     * Indicate that the company is rejected.
     */
    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'rejected',
            'status_reason' => 'Application did not meet requirements.',
        ]);
    }
}
