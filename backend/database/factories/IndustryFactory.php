<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Industry;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Industry>
 */
class IndustryFactory extends Factory
{
    protected $model = Industry::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->word();

        return [
            'code' => strtoupper(fake()->unique()->lexify('???')),
            'name' => [
                'en' => ucfirst($name),
                'ar' => $name,
            ],
            'is_active' => true,
        ];
    }
}
