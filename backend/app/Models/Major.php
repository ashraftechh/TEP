<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'department_id',
    'name',
    'code',
    'is_active',
])]
class Major extends Model
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
     * Student profiles associated with this major.
     *
     * @return HasMany<StudentProfile, $this>
     */
    public function studentProfiles(): HasMany
    {
        return $this->hasMany(StudentProfile::class);
    }
}
