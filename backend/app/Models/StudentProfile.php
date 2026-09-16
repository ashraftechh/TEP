<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'user_id',
    'student_number',
    'major_id',
    'university_name',
    'level_year',
    'gpa',
    'bio',
    'phone',
    'address',
    'expected_graduation',
    'cv_file_id',
    'avatar_file_id',
    'interests',
    'languages',
    'achievements',
])]
class StudentProfile extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'level_year' => 'integer',
            'gpa' => 'decimal:2',
            'interests' => 'array',
            'languages' => 'array',
            'achievements' => 'array',
        ];
    }

    /**
     * The user account associated with this student profile.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The academic major for this student.
     *
     * @return BelongsTo<Major, $this>
     */
    public function major(): BelongsTo
    {
        return $this->belongsTo(Major::class);
    }

    /**
     * The avatar file for this student.
     *
     * @return BelongsTo<File, $this>
     */
    public function avatarFile(): BelongsTo
    {
        return $this->belongsTo(File::class, 'avatar_file_id');
    }

    /**
     * The CV document file for this student.
     *
     * @return BelongsTo<File, $this>
     */
    public function cvFile(): BelongsTo
    {
        return $this->belongsTo(File::class, 'cv_file_id');
    }

    /**
     * The skills acquired by this student.
     *
     * @return BelongsToMany<Skill, $this>
     */
    public function skills(): BelongsToMany
    {
        return $this->belongsToMany(Skill::class, 'student_skills')
            ->withPivot('proficiency')
            ->withTimestamps();
    }

    /**
     * Applications submitted by this student.
     *
     * @return HasMany<Application, $this>
     */
    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }

    /**
     * Training assignments for this student.
     *
     * @return HasMany<TrainingAssignment, $this>
     */
    public function trainingAssignments(): HasMany
    {
        return $this->hasMany(TrainingAssignment::class);
    }
}
