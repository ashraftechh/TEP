<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Model for the `reports` table (migration
 * 2026_09_08_160525_create_reports_table.php, Sprint 4; `submitted_at`
 * made nullable by the follow-up 2026_09_12_090000 migration — see that
 * file's docblock).
 *
 * FLAGGED / scope note: TEP-665's `reports_submitted_count` aggregation
 * and TEP-674's create/update-draft workflow are now both implemented.
 * The review workflow (`reports.review`, ReportReview) and the distinct
 * "submit" action (`reports.own.submit`, TEP-678) remain later tickets
 * and are intentionally NOT built as part of this subtask.
 */
#[Fillable([
    'training_assignment_id',
    'title',
    'report_type_id',
    'report_number',
    'content',
    'status',
    'grade',
    'version',
    'submitted_at',
    'due_at',
])]
class Report extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * Statuses that count as "submitted" for reporting-progress purposes
     * (i.e. anything past the student's own draft) — everything except
     * 'draft'.
     *
     * @var list<string>
     */
    public const SUBMITTED_STATUSES = [
        'submitted', 'under_review', 'approved', 'revision_requested', 'rejected',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'report_number' => 'integer',
            'grade' => 'decimal:2',
            'version' => 'integer',
            'submitted_at' => 'datetime',
            'due_at' => 'datetime',
        ];
    }

    /**
     * The training assignment this report belongs to.
     *
     * @return BelongsTo<TrainingAssignment, $this>
     */
    public function trainingAssignment(): BelongsTo
    {
        return $this->belongsTo(TrainingAssignment::class);
    }

    /**
     * The report type (weekly/monthly/final — see ReportTypeSeeder) this
     * report was filed against.
     *
     * TEP-674 — added alongside the create/update endpoints; not needed
     * by TEP-665's earlier read-only aggregation.
     *
     * @return BelongsTo<ReportType, $this>
     */
    public function reportType(): BelongsTo
    {
        return $this->belongsTo(ReportType::class);
    }

    /**
     * The files (attachments) that have been linked to this report via
     * the polymorphic fileable columns on the `files` table.
     *
     * @return MorphMany<File, $this>
     */
    public function files(): MorphMany
    {
        return $this->morphMany(File::class, 'fileable');
    }

    /**
     * The supervisor reviews associated with this report.
     *
     * @return HasMany<ReportReview, $this>
     */
    public function reviews(): HasMany
    {
        return $this->hasMany(ReportReview::class);
    }

    /**
     * The latest supervisor review for this report.
     *
     * @return HasOne<ReportReview, $this>
     */
    public function latestReview(): HasOne
    {
        return $this->hasOne(ReportReview::class)->latestOfMany();
    }
}
