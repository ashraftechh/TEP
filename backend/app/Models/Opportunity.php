<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\OpportunityFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Spatie\Translatable\HasTranslations;

#[Fillable([
    'company_id',
    'opportunity_type_id',
    'training_cycle_id',
    'created_by',
    'title',
    'department',
    'description',
    'work_mode',
    'location',
    'duration',
    'capacity',
    'accepted_count',
    'salary',
    'start_date',
    'end_date',
    'application_deadline',
    'status',
    'version',
    'published_at',
])]
class Opportunity extends Model
{
    /** @use HasFactory<OpportunityFactory> */
    use HasFactory, HasTranslations, SoftDeletes;

    /**
     * The attributes that are translatable.
     *
     * @var list<string>
     */
    public array $translatable = [
        'title',
        'department',
        'description',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'capacity' => 'integer',
            'accepted_count' => 'integer',
            'salary' => 'decimal:2',
            'start_date' => 'date',
            'end_date' => 'date',
            'application_deadline' => 'date',
            'version' => 'integer',
            'published_at' => 'datetime',
        ];
    }

    /**
     * The effective application cutoff: the stored deadline minus the
     * configured buffer hours, or null when no deadline is set. This is
     * the single source of truth for "has the application window closed"
     * — used by the eligibility service, the student-facing listing and
     * the API resource.
     */
    public function applicationCutoff(): ?Carbon
    {
        if ($this->application_deadline === null) {
            return null;
        }

        // getRawOriginal() keeps the full timestamp from the DB; the 'date'
        // cast on application_deadline strips the time component and would
        // break buffer-hour calculations.
        $rawDeadline = $this->getRawOriginal('application_deadline') ?? $this->application_deadline;

        return Carbon::parse($rawDeadline)
            ->subHours((int) config('applications.deadline_buffer_hours', 0));
    }

    /**
     * Whether the application window for this opportunity has closed.
     */
    public function deadlinePassed(): bool
    {
        $cutoff = $this->applicationCutoff();

        return $cutoff !== null && Carbon::now()->gte($cutoff);
    }

    /**
     * The company that owns this opportunity.
     *
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    /**
     * The opportunity type category.
     *
     * @return BelongsTo<OpportunityType, $this>
     */
    public function opportunityType(): BelongsTo
    {
        return $this->belongsTo(OpportunityType::class);
    }

    /**
     * The training cycle this opportunity belongs to.
     *
     * @return BelongsTo<TrainingCycle, $this>
     */
    public function trainingCycle(): BelongsTo
    {
        return $this->belongsTo(TrainingCycle::class);
    }

    /**
     * The user who created this opportunity.
     *
     * @return BelongsTo<User, $this>
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Academic majors relevant to this opportunity.
     *
     * @return BelongsToMany<Major, $this>
     */
    public function majors(): BelongsToMany
    {
        return $this->belongsToMany(Major::class, 'opportunity_majors')
            ->withTimestamps();
    }

    /**
     * Skills required or taught by this opportunity.
     *
     * @return BelongsToMany<Skill, $this>
     */
    public function skills(): BelongsToMany
    {
        return $this->belongsToMany(Skill::class, 'opportunity_skills')
            ->withTimestamps();
    }

    /**
     * Requirements associated with this opportunity.
     *
     * @return HasMany<OpportunityRequirement, $this>
     */
    public function requirements(): HasMany
    {
        return $this->hasMany(OpportunityRequirement::class)->orderBy('sort_order');
    }

    /**
     * Benefits associated with this opportunity.
     *
     * @return HasMany<OpportunityBenefit, $this>
     */
    public function benefits(): HasMany
    {
        return $this->hasMany(OpportunityBenefit::class)->orderBy('sort_order');
    }

    /**
     * Applications submitted for this opportunity.
     *
     * @return HasMany<Application, $this>
     */
    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }
}
