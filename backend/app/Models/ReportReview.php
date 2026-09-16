<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Model for the `report_reviews` table (migration
 * 2026_09_08_160754_create_report_reviews_table.php, Sprint 4).
 *
 * Captures an academic supervisor's review decision and feedback for a report.
 */
#[Fillable([
    'report_id',
    'reviewer_id',
    'decision',
    'feedback',
    'from_status',
    'to_status',
    'created_at',
])]
class ReportReview extends Model
{
    use HasFactory;

    public $timestamps = false;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    /**
     * The report this review belongs to.
     *
     * @return BelongsTo<Report, $this>
     */
    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class);
    }

    /**
     * The supervisor who conducted the review.
     *
     * @return BelongsTo<User, $this>
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }
}
