<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable([
    'name',
    'category_id',
    'is_active',
])]
class Skill extends Model
{
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'name' => 'array',
            'is_active' => 'boolean',
        ];
    }

    /**
     * Student profiles associated with this skill.
     *
     * @return BelongsToMany<StudentProfile, $this>
     */
    public function studentProfiles(): BelongsToMany
    {
        return $this->belongsToMany(StudentProfile::class, 'student_skills')
            ->withPivot('proficiency')
            ->withTimestamps();
    }
}
