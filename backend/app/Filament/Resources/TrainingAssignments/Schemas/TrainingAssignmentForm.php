<?php

declare(strict_types=1);

namespace App\Filament\Resources\TrainingAssignments\Schemas;

use App\Models\Application;
use App\Models\Company;
use App\Models\CompanyRepresentative;
use App\Models\Opportunity;
use App\Models\StudentProfile;
use App\Models\TrainingAssignment;
use App\Models\User;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Illuminate\Support\Carbon;

/**
 * TEP-662 — create/edit-training-assignment form. Same shape as
 * Companies/Schemas/CompanyForm.php: a plain static ::configure() building a
 * Grid of fields.
 */
class TrainingAssignmentForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Grid::make(2)->schema([
                    // ── Filter helpers (not saved, just narrow the application list) ─────
                    Section::make(__('training_assignments.form.filter_section'))
                        ->description(__('training_assignments.form.filter_section_hint'))
                        ->collapsed(false)
                        ->columnSpanFull()
                        ->visible(fn(string $operation): bool => $operation === 'create')
                        ->schema([
                            Grid::make(3)->schema([
                                Select::make('_filter_company_id')
                                    ->label(__('training_assignments.form.filter_by_company'))
                                    ->options(fn(): array => static::companyFilterOptions())
                                    ->searchable()
                                    ->preload()
                                    ->live()
                                    ->dehydrated(false)
                                    ->placeholder(__('training_assignments.form.all_companies'))
                                    ->afterStateUpdated(function (callable $set): void {
                                        $set('_filter_opportunity_id', null);
                                        $set('application_id', null);
                                    }),

                                Select::make('_filter_opportunity_id')
                                    ->label(__('training_assignments.form.filter_by_opportunity'))
                                    ->options(fn(callable $get): array => static::opportunityFilterOptions((int) $get('_filter_company_id') ?: null))
                                    ->searchable()
                                    ->preload()
                                    ->live()
                                    ->dehydrated(false)
                                    ->placeholder(__('training_assignments.form.all_opportunities'))
                                    ->afterStateUpdated(fn(callable $set) => $set('application_id', null)),

                                Select::make('_filter_student_id')
                                    ->label(__('training_assignments.form.filter_by_student'))
                                    ->options(fn(callable $get): array => static::studentFilterOptions(
                                        (int) $get('_filter_company_id') ?: null,
                                        (int) $get('_filter_opportunity_id') ?: null,
                                    ))
                                    ->searchable()
                                    ->preload()
                                    ->live()
                                    ->dehydrated(false)
                                    ->placeholder(__('training_assignments.form.all_students'))
                                    ->afterStateUpdated(fn(callable $set) => $set('application_id', null)),
                            ]),
                        ]),

                    // ── Application select (filtered by the helpers above) ────────────
                    Select::make('application_id')
                        ->label(__('training_assignments.form.application'))
                        ->options(fn(callable $get, ?TrainingAssignment $record): array => static::applicationOptions(
                            $record,
                            (int) $get('_filter_company_id') ?: null,
                            (int) $get('_filter_opportunity_id') ?: null,
                            (int) $get('_filter_student_id') ?: null,
                        ))
                        ->searchable()
                        ->preload()
                        ->live()
                        ->required()
                        ->disabled(fn(string $operation): bool => $operation === 'edit')
                        ->columnSpanFull()
                        ->afterStateUpdated(fn($state, callable $set) => $set('field_supervisor_id', null)),

                    Select::make('academic_supervisor_id')
                        ->label(__('training_assignments.form.academic_supervisor'))
                        ->options(fn() => static::academicSupervisorOptions())
                        ->searchable()
                        ->preload()
                        ->required(),

                    Select::make('field_supervisor_id')
                        ->label(__('training_assignments.form.field_supervisor'))
                        ->options(fn(callable $get, ?TrainingAssignment $record) => static::fieldSupervisorOptions($get('application_id') ?? $record?->application_id))
                        ->searchable()
                        ->preload()
                        ->required()
                        ->helperText(__('training_assignments.form.field_supervisor_hint')),

                    DatePicker::make('start_date')
                        ->label(__('training_assignments.form.start_date'))
                        ->required()
                        ->minDate(fn(string $operation) => $operation === 'create' ? today() : null)
                        ->live()
                        ->afterStateUpdated(fn($state, callable $get, callable $set) => static::recalculateReportConfig($get, $set)),

                    DatePicker::make('end_date')
                        ->label(__('training_assignments.form.end_date'))
                        ->required()
                        ->minDate(fn(string $operation) => $operation === 'create' ? today() : null)
                        ->afterOrEqual('start_date')
                        ->live()
                        ->afterStateUpdated(fn($state, callable $get, callable $set) => static::recalculateReportConfig($get, $set)),
                ]),

                Section::make(__('training_assignments.form.report_configuration_section'))
                    ->description(fn(callable $get) => static::getDurationDescription($get))
                    ->schema([
                        Grid::make(2)->schema([
                            Toggle::make('daily_enabled')
                                ->label(__('training_assignments.form.enable_daily_reports'))
                                ->default(false)
                                ->live()
                                ->visible(fn(callable $get) => static::getDurationDetails($get)['days'] >= 1)
                                ->afterStateUpdated(fn($state, callable $get, callable $set) => static::onDailyToggleUpdated((bool) $state, $get, $set)),

                            TextInput::make('daily_count')
                                ->label(__('training_assignments.form.daily_reports_count'))
                                ->numeric()
                                ->minValue(1)
                                ->default(0)
                                ->live()
                                ->visible(fn(callable $get) => (bool) $get('daily_enabled'))
                                ->afterStateUpdated(fn($state, callable $get, callable $set) => static::updateTotalReportsCount($get, $set)),

                            Toggle::make('weekly_enabled')
                                ->label(__('training_assignments.form.enable_weekly_reports'))
                                ->default(true)
                                ->live()
                                ->visible(fn(callable $get) => static::getDurationDetails($get)['weeks'] >= 1)
                                ->afterStateUpdated(fn($state, callable $get, callable $set) => static::onWeeklyToggleUpdated((bool) $state, $get, $set)),

                            TextInput::make('weekly_count')
                                ->label(__('training_assignments.form.weekly_reports_count'))
                                ->numeric()
                                ->minValue(1)
                                ->default(0)
                                ->live()
                                ->visible(fn(callable $get) => (bool) $get('weekly_enabled'))
                                ->afterStateUpdated(fn($state, callable $get, callable $set) => static::updateTotalReportsCount($get, $set)),

                            Toggle::make('monthly_enabled')
                                ->label(__('training_assignments.form.enable_monthly_reports'))
                                ->default(false)
                                ->live()
                                ->visible(fn(callable $get) => static::getDurationDetails($get)['months'] >= 1)
                                ->afterStateUpdated(fn($state, callable $get, callable $set) => static::onMonthlyToggleUpdated((bool) $state, $get, $set)),

                            TextInput::make('monthly_count')
                                ->label(__('training_assignments.form.monthly_reports_count'))
                                ->numeric()
                                ->minValue(1)
                                ->default(0)
                                ->live()
                                ->visible(fn(callable $get) => (bool) $get('monthly_enabled'))
                                ->afterStateUpdated(fn($state, callable $get, callable $set) => static::updateTotalReportsCount($get, $set)),

                            Toggle::make('final_enabled')
                                ->label(__('training_assignments.form.require_final_report'))
                                ->default(true)
                                ->live()
                                ->visible(fn(callable $get) => static::getDurationDetails($get)['days'] >= 1)
                                ->afterStateUpdated(fn($state, callable $get, callable $set) => static::updateTotalReportsCount($get, $set)),

                            TextInput::make('required_reports_count')
                                ->label(__('training_assignments.form.required_reports_count'))
                                ->numeric()
                                ->readOnly()
                                ->default(1)
                                ->helperText(__('training_assignments.form.required_reports_calculated_hint'))
                                ->columnSpanFull(),
                        ]),
                    ]),
            ]);
    }

    /**
     * Helper to compute duration breakdown from start and end dates.
     *
     * @return array{days: int, weeks: int, months: int, valid: bool}
     */
    public static function getDurationDetails(callable $get): array
    {
        $start = $get('start_date');
        $end = $get('end_date');

        if (! $start || ! $end) {
            return ['days' => 0, 'weeks' => 0, 'months' => 0, 'valid' => false];
        }

        try {
            $startDate = Carbon::parse($start);
            $endDate = Carbon::parse($end);
        } catch (\Throwable) {
            return ['days' => 0, 'weeks' => 0, 'months' => 0, 'valid' => false];
        }

        if ($endDate->lt($startDate)) {
            return ['days' => 0, 'weeks' => 0, 'months' => 0, 'valid' => false];
        }

        $days = (int) ($startDate->diffInDays($endDate) + 1);
        $weeks = (int) intdiv($days, 7);
        $months = (int) intdiv($days, 30);

        return [
            'days' => $days,
            'weeks' => $weeks,
            'months' => $months,
            'valid' => true,
        ];
    }

    public static function getDurationDescription(callable $get): string
    {
        $duration = static::getDurationDetails($get);
        if (! $duration['valid']) {
            return '';
        }

        return __('training_assignments.form.duration_summary', [
            'days' => $duration['days'],
            'weeks' => $duration['weeks'],
            'months' => $duration['months'],
        ]);
    }

    public static function recalculateReportConfig(callable $get, callable $set): void
    {
        $duration = static::getDurationDetails($get);
        if (! $duration['valid']) {
            return;
        }

        // The suggested counts must track EVERY start/end date change, not
        // only the first one: guarding the writes with empty() meant that,
        // once the inputs held a value, later period edits left stale counts
        // (and a stale total) behind.
        $set('daily_count', static::suggestedDailyCount($duration['days']));

        if ($duration['weeks'] >= 1 && ($get('weekly_enabled') === null || $get('weekly_enabled') === true)) {
            $set('weekly_enabled', true);
        }

        $set('weekly_count', max(1, $duration['weeks']));
        $set('monthly_count', max(1, $duration['months']));

        if ($get('final_enabled') === null) {
            $set('final_enabled', true);
        }

        static::updateTotalReportsCount($get, $set);
    }

    /**
     * Suggested daily report count: working days (5-day week) over the
     * training duration, never below 1.
     */
    public static function suggestedDailyCount(int $days): int
    {
        return max(1, (int) round($days * (5 / 7)));
    }

    public static function onDailyToggleUpdated(bool $enabled, callable $get, callable $set): void
    {
        if ($enabled && empty($get('daily_count'))) {
            $duration = static::getDurationDetails($get);
            $set('daily_count', static::suggestedDailyCount($duration['days']));
        }
        static::updateTotalReportsCount($get, $set);
    }

    public static function onWeeklyToggleUpdated(bool $enabled, callable $get, callable $set): void
    {
        if ($enabled && empty($get('weekly_count'))) {
            $duration = static::getDurationDetails($get);
            $set('weekly_count', max(1, $duration['weeks']));
        }
        static::updateTotalReportsCount($get, $set);
    }

    public static function onMonthlyToggleUpdated(bool $enabled, callable $get, callable $set): void
    {
        if ($enabled && empty($get('monthly_count'))) {
            $duration = static::getDurationDetails($get);
            $set('monthly_count', max(1, $duration['months']));
        }
        static::updateTotalReportsCount($get, $set);
    }

    public static function updateTotalReportsCount(callable $get, callable $set): void
    {
        $total = 0;
        if ($get('daily_enabled')) {
            $total += (int) ($get('daily_count') ?: 0);
        }
        if ($get('weekly_enabled')) {
            $total += (int) ($get('weekly_count') ?: 0);
        }
        if ($get('monthly_enabled')) {
            $total += (int) ($get('monthly_count') ?: 0);
        }
        if ($get('final_enabled')) {
            $total += 1;
        }

        $set('required_reports_count', max(1, $total));
    }

    /**
     * Build a single localised label for an Application option.
     */
    public static function applicationLabel(?Application $application): ?string
    {
        if ($application === null) {
            return null;
        }

        $locale = app()->getLocale();
        $isAr = $locale === 'ar';

        $studentName = $application->studentProfile?->user?->name ?? '—';

        $oppTitle = $application->opportunity?->getTranslation('title', $locale)
            ?? $application->opportunity?->getTranslation('title', 'en')
            ?? '—';

        $companyName = $application->opportunity?->company?->getTranslation('name', $locale)
            ?? $application->opportunity?->company?->getTranslation('name', 'en')
            ?? '—';

        $lCompany = $isAr ? 'الشركة' : 'Company';
        $lOpportunity = $isAr ? 'الفرصة' : 'Opportunity';
        $lStudent = $isAr ? 'الطالب' : 'Student';

        return "{$lCompany}: {$companyName} | {$lOpportunity}: {$oppTitle} | {$lStudent}: {$studentName}";
    }

    /**
     * Filter options: Companies that have eligible accepted applications.
     *
     * @return array<int, string>
     */
    public static function companyFilterOptions(): array
    {
        $locale = app()->getLocale();

        return Company::query()
            ->whereHas('opportunities.applications', function ($q): void {
                $q->where('status', 'accepted')
                    ->whereDoesntHave('trainingAssignment')
                    ->whereDoesntHave('studentProfile.trainingAssignments', function ($sq): void {
                        $sq->whereIn('status', ['active', 'suspended']);
                    });
            })
            ->get()
            ->mapWithKeys(function (Company $company) use ($locale): array {
                $name = $company->getTranslation('name', $locale)
                    ?? $company->getTranslation('name', 'en')
                    ?? '—';

                return [$company->id => $name];
            })
            ->sort(SORT_NATURAL | SORT_FLAG_CASE)
            ->all();
    }

    /**
     * Filter options: Opportunities that have eligible accepted applications.
     * Optionally narrowed by selected company.
     *
     * @return array<int, string>
     */
    public static function opportunityFilterOptions(?int $companyId = null): array
    {
        $locale = app()->getLocale();

        return Opportunity::query()
            ->when($companyId !== null, fn($q) => $q->where('company_id', $companyId))
            ->whereHas('applications', function ($q): void {
                $q->where('status', 'accepted')
                    ->whereDoesntHave('trainingAssignment')
                    ->whereDoesntHave('studentProfile.trainingAssignments', function ($sq): void {
                        $sq->whereIn('status', ['active', 'suspended']);
                    });
            })
            ->get()
            ->mapWithKeys(function (Opportunity $opportunity) use ($locale): array {
                $title = $opportunity->getTranslation('title', $locale)
                    ?? $opportunity->getTranslation('title', 'en')
                    ?? '—';

                return [$opportunity->id => $title];
            })
            ->sort(SORT_NATURAL | SORT_FLAG_CASE)
            ->all();
    }

    /**
     * Filter options: Students that have eligible accepted applications.
     * Optionally narrowed by selected company and/or opportunity.
     *
     * @return array<int, string>
     */
    public static function studentFilterOptions(?int $companyId = null, ?int $opportunityId = null): array
    {
        return StudentProfile::query()
            ->whereHas('applications', function ($q) use ($companyId, $opportunityId): void {
                $q->where('status', 'accepted')
                    ->whereDoesntHave('trainingAssignment')
                    ->when($opportunityId !== null, fn($oq) => $oq->where('opportunity_id', $opportunityId))
                    ->when($companyId !== null, fn($oq) => $oq->whereHas('opportunity', fn($coq) => $coq->where('company_id', $companyId)));
            })
            ->whereDoesntHave('trainingAssignments', function ($q): void {
                $q->whereIn('status', ['active', 'suspended']);
            })
            ->with('user')
            ->get()
            ->mapWithKeys(function (StudentProfile $profile): array {
                $name = $profile->user?->name ?? '—';
                if ($profile->student_number) {
                    $name .= " ({$profile->student_number})";
                }

                return [$profile->id => $name];
            })
            ->sort(SORT_NATURAL | SORT_FLAG_CASE)
            ->all();
    }

    /**
     * Server-side search: returns up to 50 matching accepted applications.
     * Searches across student name, opportunity title (ar/en), and company name (ar/en).
     *
     * @return array<int, string>
     */
    public static function searchApplicationOptions(
        string $search = '',
        ?TrainingAssignment $record = null,
        ?int $companyId = null,
        ?int $opportunityId = null,
        ?int $studentProfileId = null,
    ): array {
        $term = mb_strtolower(trim($search));

        return Application::query()
            ->where(function ($query) use ($record): void {
                $query->where('status', 'accepted')
                    ->whereDoesntHave('trainingAssignment');

                if ($record === null) {
                    $query->whereDoesntHave('studentProfile.trainingAssignments', function ($q): void {
                        $q->whereIn('status', ['active', 'suspended']);
                    });
                }

                if ($record?->application_id) {
                    $query->orWhere('id', $record->application_id);
                }
            })
            ->when($companyId !== null, fn($query) => $query->whereHas('opportunity', fn($q) => $q->where('company_id', $companyId)))
            ->when($opportunityId !== null, fn($query) => $query->where('opportunity_id', $opportunityId))
            ->when($studentProfileId !== null, fn($query) => $query->where('student_profile_id', $studentProfileId))
            ->when($term !== '', function ($query) use ($term): void {
                $query->where(function ($q) use ($term): void {
                    // Student name
                    $q->whereHas('studentProfile.user', fn($u) => $u->whereRaw('LOWER(name) LIKE ?', ["%{$term}%"]))
                        // Opportunity title (ar or en)
                        ->orWhereHas(
                            'opportunity',
                            fn($o) => $o
                                ->whereRaw("LOWER(JSON_UNQUOTE(JSON_EXTRACT(title, '$.ar'))) LIKE ?", ["%{$term}%"])
                                ->orWhereRaw("LOWER(JSON_UNQUOTE(JSON_EXTRACT(title, '$.en'))) LIKE ?", ["%{$term}%"])
                        )
                        // Company name (ar or en)
                        ->orWhereHas(
                            'opportunity.company',
                            fn($c) => $c
                                ->whereRaw("LOWER(JSON_UNQUOTE(JSON_EXTRACT(name, '$.ar'))) LIKE ?", ["%{$term}%"])
                                ->orWhereRaw("LOWER(JSON_UNQUOTE(JSON_EXTRACT(name, '$.en'))) LIKE ?", ["%{$term}%"])
                        );
                });
            })
            ->with(['studentProfile.user', 'opportunity.company'])
            ->limit(50)
            ->get()
            ->mapWithKeys(fn(Application $application): array => [
                $application->id => static::applicationLabel($application),
            ])
            ->all();
    }

    /**
     * Accepted applications that do not already have a training assignment
     * (or the assignment currently being edited) — used by tests / backwards-compat callers.
     *
     * @return array<int, string>
     */
    public static function applicationOptions(
        ?TrainingAssignment $record = null,
        ?int $companyId = null,
        ?int $opportunityId = null,
        ?int $studentProfileId = null,
    ): array {
        return static::searchApplicationOptions('', $record, $companyId, $opportunityId, $studentProfileId);
    }

    /**
     * Preserved for backwards compatibility with tests and callers.
     *
     * @return array<int, string>
     */
    protected static function unassignedAcceptedApplicationOptions(): array
    {
        return static::applicationOptions();
    }

    /**
     * Users holding the academic_supervisor role (TEP-661's
     * `academic_supervisor_id` validation rule).
     *
     * @return array<int, string>
     */
    protected static function academicSupervisorOptions(): array
    {
        return User::query()
            ->whereHas('userRoles.role', fn($query) => $query->where('name', 'academic_supervisor'))
            ->orderBy('name')
            ->pluck('name', 'id')
            ->all();
    }

    /**
     * Company representatives of the SAME company as the selected
     * application's opportunity (TEP-661's `field_supervisor_id` validation
     * rule) — empty until an application is chosen.
     *
     * @return array<int, string>
     */
    protected static function fieldSupervisorOptions(mixed $applicationId): array
    {
        if (! is_numeric($applicationId)) {
            return [];
        }

        $application = Application::with('opportunity')->find((int) $applicationId);

        if ($application === null || $application->opportunity === null) {
            return [];
        }

        return CompanyRepresentative::query()
            ->where('company_id', $application->opportunity->company_id)
            ->with('user')
            ->get()
            ->mapWithKeys(fn(CompanyRepresentative $representative) => [
                $representative->user_id => $representative->user?->name ?? '—',
            ])
            ->all();
    }
}
