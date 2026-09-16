<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'college_id',
    'code',
    'name',
    'is_active',
])]
class Department extends Model
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
     * Majors in this department.
     *
     * @return HasMany<Major, $this>
     */
    public function majors(): HasMany
    {
        return $this->hasMany(Major::class);
    }

    /**
     * Academic supervisor profiles in this department.
     *
     * @return HasMany<AcademicSupervisorProfile, $this>
     */
    public function academicSupervisorProfiles(): HasMany
    {
        return $this->hasMany(AcademicSupervisorProfile::class);
    }

    /**
     * Training coordinator profiles in this department.
     *
     * @return HasMany<TrainingCoordinatorProfile, $this>
     */
    public function trainingCoordinatorProfiles(): HasMany
    {
        return $this->hasMany(TrainingCoordinatorProfile::class);
    }
}
