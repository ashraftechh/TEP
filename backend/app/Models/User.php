<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\HasScopedRoles;
use App\Notifications\Auth\ResetPasswordNotification;
use App\Notifications\Auth\VerifyEmailNotification;
use Database\Factories\UserFactory;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Contracts\Translation\HasLocalePreference;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'name',
    'email',
    'phone',
    'password',
    'status',
    'email_verified_at',
    'phone_verified_at',
    'last_login_at',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements FilamentUser, HasLocalePreference, MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasScopedRoles, Notifiable, SoftDeletes;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Determine if the user can access the given Filament admin panel.
     */
    public function canAccessPanel(Panel $panel): bool
    {
        return $this->hasRole('training_coordinator') || $this->hasRole('super_admin');
    }

    /**
     * Get the user's preferred locale for notifications and emails.
     */
    public function preferredLocale(): ?string
    {
        return app()->getLocale() ?: 'ar';
    }

    /**
     * Send the email verification notification with a frontend-URL-based signed link.
     */
    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new VerifyEmailNotification);
    }

    /**
     * Send the password reset notification with a frontend-URL-based link.
     *
     * @param  string  $token
     */
    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification((string) $token));
    }

    /**
     * The student profile associated with this user, if they are a student.
     *
     * @return HasOne<StudentProfile, $this>
     */
    public function studentProfile(): HasOne
    {
        return $this->hasOne(StudentProfile::class);
    }

    /**
     * The academic supervisor profile associated with this user, if they are an academic supervisor.
     *
     * @return HasOne<AcademicSupervisorProfile, $this>
     */
    public function academicSupervisorProfile(): HasOne
    {
        return $this->hasOne(AcademicSupervisorProfile::class);
    }

    /**
     * The training coordinator profile associated with this user, if they are a training coordinator.
     *
     * @return HasOne<TrainingCoordinatorProfile, $this>
     */
    public function trainingCoordinatorProfile(): HasOne
    {
        return $this->hasOne(TrainingCoordinatorProfile::class);
    }

    /**
     * The company representative profile associated with this user, if they represent a company.
     *
     * @return HasOne<CompanyRepresentative, $this>
     */
    public function companyRepresentative(): HasOne
    {
        return $this->hasOne(CompanyRepresentative::class);
    }

    /**
     * The companies this user is a representative for.
     *
     * @return BelongsToMany<Company, $this>
     */
    public function companies(): BelongsToMany
    {
        return $this->belongsToMany(Company::class, 'company_representatives')
            ->withPivot(['job_title', 'is_primary'])
            ->withTimestamps();
    }

    /**
     * The SSO identities linked to this user (one per provider).
     *
     * @return HasMany<SsoIdentity, $this>
     */
    public function ssoIdentities(): HasMany
    {
        return $this->hasMany(SsoIdentity::class);
    }
}
