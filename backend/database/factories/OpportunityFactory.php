<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Company;
use App\Models\Opportunity;
use App\Models\OpportunityType;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Opportunity>
 */
class OpportunityFactory extends Factory
{
    protected $model = Opportunity::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $titleEn = fake()->jobTitle();
        $titleAr = 'فرصة '.$titleEn;

        return [
            'company_id' => Company::factory()->approved(),
            'opportunity_type_id' => OpportunityType::firstOrCreate(
                ['code' => 'cooperative'],
                ['name' => ['en' => 'Cooperative', 'ar' => 'تعاوني'], 'is_active' => true]
            )->id,
            'training_cycle_id' => null,
            'created_by' => User::factory(),
            'title' => [
                'en' => $titleEn,
                'ar' => $titleAr,
            ],
            'department' => [
                'en' => fake()->word().' Department',
                'ar' => 'قسم '.fake()->word(),
            ],
            'description' => [
                'en' => fake()->paragraph(),
                'ar' => fake()->paragraph(),
            ],
            'work_mode' => 'full_time',
            'location' => fake()->randomElement(['مأرب', 'صنعاء', 'عدن', 'تعز', 'المكلا', 'سيئون', 'الحديدة', 'إب', 'ذمار']),
            'duration' => '3 months',
            'capacity' => fake()->numberBetween(1, 10),
            'salary' => fake()->numberBetween(1000, 5000),
            'start_date' => now()->addMonth()->format('Y-m-d'),
            'end_date' => now()->addMonths(4)->format('Y-m-d'),
            'application_deadline' => now()->addWeeks(2)->format('Y-m-d'),
            'status' => 'draft',
            'version' => 1,
        ];
    }

    /**
     * Indicate that the opportunity is published.
     */
    public function published(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'published',
        ]);
    }
}
