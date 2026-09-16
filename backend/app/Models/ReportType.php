<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Translatable\HasTranslations;

/**
 * TEP-674 — minimal model for the `report_types` table (migration
 * 2026_09_08_155200_create_report_types_table.php, Sprint 4, seeded by
 * ReportTypeSeeder with the 'weekly' / 'monthly' / 'final' codes).
 *
 * Built as part of TEP-674/675 to back the `GET /api/v1/report-types`
 * lookup endpoint (permission `report_types.view_any`) that TEP-675's
 * frontend form needs to populate the report-type select — no other
 * ticket in this sprint's board provides this model. Management
 * (create/update/delete, permissions `report_types.create` /
 * `.update` / `.delete`) is a Filament-side concern for a later ticket
 * and is intentionally NOT built here.
 *
 * Shape matches Industry (code + translatable JSON name + is_active),
 * the closest existing lookup model — same spatie/laravel-translatable
 * convention rather than the plain-array cast some older lookups
 * (e.g. Major) use.
 */
#[Fillable([
    'code',
    'name',
    'is_active',
])]
class ReportType extends Model
{
    use HasFactory, HasTranslations;

    /**
     * The attributes that are translatable.
     *
     * @var list<string>
     */
    public array $translatable = [
        'name',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * Reports filed against this report type.
     *
     * @return HasMany<Report, $this>
     */
    public function reports(): HasMany
    {
        return $this->hasMany(Report::class);
    }
}
