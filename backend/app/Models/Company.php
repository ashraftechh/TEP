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
use Spatie\Translatable\HasTranslations;

#[Fillable([
    'name',
    'registration_number',
    'industry_id',
    'description',
    'contact_email',
    'phone',
    'website',
    'address',
    'city',
    'established_year',
    'employees_count',
    'logo_file_id',
    'status',
    'status_reason',
    'approved_by',
    'approved_at',
])]
class Company extends Model
{
    use HasFactory, HasTranslations, SoftDeletes;

    /**
     * The attributes that are translatable.
     *
     * @var list<string>
     */
    public array $translatable = [
        'name',
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
            'established_year' => 'integer',
            'approved_at' => 'datetime',
        ];
    }

    /**
     * The industry category of the company.
     *
     * @return BelongsTo<Industry, $this>
     */
    public function industry(): BelongsTo
    {
        return $this->belongsTo(Industry::class);
    }

    /**
     * The admin user who approved this company registration.
     *
     * @return BelongsTo<User, $this>
     */
    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * The logo file associated with this company.
     *
     * @return BelongsTo<File, $this>
     */
    public function logoFile(): BelongsTo
    {
        return $this->belongsTo(File::class, 'logo_file_id');
    }

    /**
     * The company representatives.
     *
     * @return HasMany<CompanyRepresentative, $this>
     */
    public function representatives(): HasMany
    {
        return $this->hasMany(CompanyRepresentative::class);
    }

    /**
     * The users associated with this company.
     *
     * @return BelongsToMany<User, $this>
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'company_representatives')
            ->withPivot(['job_title', 'is_primary'])
            ->withTimestamps();
    }

    /**
     * The training opportunities owned by this company.
     *
     * @return HasMany<Opportunity, $this>
     */
    public function opportunities(): HasMany
    {
        return $this->hasMany(Opportunity::class);
    }
}
