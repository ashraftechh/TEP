<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\ApplicationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'opportunity_id',
    'student_profile_id',
    'cv_file_id',
    'cover_note',
    'status',
    'interview_at',
    'decision_reason',
    'withdrawn_reason',
    'version',
])]
class Application extends Model
{
    /** @use HasFactory<ApplicationFactory> */
    use HasFactory, SoftDeletes;

    /**
     * Statuses that are considered non-terminal for cap / duplicate checks.
     * A student holding an application in one of these statuses is "active".
     *
     * @var list<string>
     */
    public const ACTIVE_STATUSES = ['submitted', 'under_review', 'interview_scheduled'];

    /**
     * Statuses in which re-application is permitted
     * (the DB unique constraint cannot express this; enforced in service).
     *
     * @var list<string>
     */
    public const REAPPLYABLE_STATUSES = ['withdrawn', 'rejected'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'interview_at' => 'datetime',
            'version' => 'integer',
        ];
    }

    /**
     * The opportunity this application is for.
     *
     * @return BelongsTo<Opportunity, $this>
     */
    public function opportunity(): BelongsTo
    {
        return $this->belongsTo(Opportunity::class);
    }

    /**
     * The student who submitted this application.
     *
     * @return BelongsTo<StudentProfile, $this>
     */
    public function studentProfile(): BelongsTo
    {
        return $this->belongsTo(StudentProfile::class);
    }

    /**
     * The CV file attached to this application.
     *
     * @return BelongsTo<File, $this>
     */
    public function cvFile(): BelongsTo
    {
        return $this->belongsTo(File::class, 'cv_file_id');
    }

    /**
     * The status transition history for this application.
     *
     * @return HasMany<ApplicationTransition, $this>
     */
    public function transitions(): HasMany
    {
        return $this->hasMany(ApplicationTransition::class)->orderBy('created_at');
    }

    /**
     * The single most-recent status transition for this application.
     *
     * Used by the list endpoint to display a one-line "last updated" summary
     * without fetching the full transition history. Backed by latestOfMany()
     * which issues a single subquery rather than N rows.
     *
     * @return HasOne<ApplicationTransition, $this>
     */
    public function latestTransition(): HasOne
    {
        return $this->hasOne(ApplicationTransition::class)->latestOfMany('created_at');
    }

    /**
     * The training assignment formalising this application, if one has been
     * created (TEP-661) — an accepted application has at most one.
     *
     * @return HasOne<TrainingAssignment, $this>
     */
    public function trainingAssignment(): HasOne
    {
        return $this->hasOne(TrainingAssignment::class);
    }
}
