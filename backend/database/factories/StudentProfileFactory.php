<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StudentProfile>
 *
 * Note: major_id must be supplied explicitly or via a seeded major when
 * used in tests, since Major requires department_id (which in turn requires
 * a college). The factory defaults major_id to null and lets callers
 * override it via ->create(['major_id' => $major->id]).
 */
class StudentProfileFactory extends Factory
{
    protected $model = StudentProfile::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'student_number' => fake()->unique()->numerify('STU######'),
            'major_id' => null,
            'university_name' => 'Saba Region University',
            'level_year' => fake()->numberBetween(1, 5),
            'gpa' => fake()->randomFloat(2, 2.0, 4.0),
            'bio' => null,
            'phone' => null,
            'address' => null,
            'expected_graduation' => null,
            'cv_file_id' => null,
            'avatar_file_id' => null,
            'interests' => null,
            'languages' => null,
            'achievements' => null,
        ];
    }
}
