<?php

declare(strict_types=1);

namespace App\Filament\Resources\TrainingAssignments\Schemas;

use App\Models\TrainingAssignment;
use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Components\Callout;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Illuminate\Support\HtmlString;

class TrainingAssignmentInfolist
{
    public static function formatTranslatable(mixed $value): string
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                $value = $decoded;
            }
        }

        if (is_array($value)) {
            return (string) ($value[app()->getLocale()] ?? $value['ar'] ?? $value['en'] ?? reset($value) ?: '—');
        }

        return filled($value) ? (string) $value : '—';
    }

    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Callout::make('status_reason_callout')
                    ->warning()
                    ->icon('heroicon-o-exclamation-triangle')
                    ->heading(fn (TrainingAssignment $record): string => match ($record->status) {
                        'suspended' => __('training_assignments.actions.suspend.reason_label'),
                        'terminated' => __('training_assignments.actions.terminate.reason_label'),
                        default => '',
                    })
                    ->description(fn (TrainingAssignment $record): string => (string) ($record->suspension_reason ?? $record->termination_reason ?? ''))
                    ->visible(fn (TrainingAssignment $record): bool => in_array($record->status, ['suspended', 'terminated'], true) && filled($record->suspension_reason ?? $record->termination_reason)),

                Section::make(__('training_assignments.infolist.student_section'))
                    ->icon('heroicon-o-academic-cap')
                    ->components([
                        Grid::make(2)->schema([
                            TextEntry::make('studentProfile.user.name')
                                ->label(__('training_assignments.columns.student'))
                                ->state(fn (TrainingAssignment $record): string => (string) ($record->studentProfile?->user?->name ?? '—'))
                                ->weight('bold'),

                            TextEntry::make('studentProfile.student_number')
                                ->label(__('training_assignments.infolist.student_number'))
                                ->state(fn (TrainingAssignment $record): string => (string) ($record->studentProfile?->student_number ?? '—')),

                            TextEntry::make('studentProfile.user.email')
                                ->label(__('companies.columns.contact_email'))
                                ->state(fn (TrainingAssignment $record): string => (string) ($record->studentProfile?->user?->email ?? '—')),

                            TextEntry::make('studentProfile.user.phone')
                                ->label(__('companies.columns.phone'))
                                ->state(fn (TrainingAssignment $record): string => (string) ($record->studentProfile?->user?->phone ?? '—')),

                            TextEntry::make('studentProfile.major.name')
                                ->label(__('training_assignments.infolist.major'))
                                ->state(fn (TrainingAssignment $record): string => static::formatTranslatable($record->studentProfile?->major?->name)),

                            TextEntry::make('studentProfile.university_name')
                                ->label(__('training_assignments.infolist.university'))
                                ->state(fn (TrainingAssignment $record): string => (string) ($record->studentProfile?->university_name ?? '—')),
                        ]),
                    ]),

                Section::make(__('training_assignments.infolist.placement_section'))
                    ->icon('heroicon-o-building-office-2')
                    ->components([
                        Grid::make(2)->schema([
                            TextEntry::make('company.name')
                                ->label(__('training_assignments.columns.company'))
                                ->state(fn (TrainingAssignment $record): string => static::formatTranslatable($record->company?->name))
                                ->weight('bold'),

                            TextEntry::make('opportunity.title')
                                ->label(__('training_assignments.infolist.opportunity'))
                                ->state(fn (TrainingAssignment $record): string => static::formatTranslatable($record->opportunity?->title)),

                            TextEntry::make('status')
                                ->label(__('training_assignments.columns.status'))
                                ->badge()
                                ->formatStateUsing(fn (string $state): string => __('training_assignments.statuses.'.$state))
                                ->color(fn (string $state): string => match ($state) {
                                    'active' => 'success',
                                    'suspended' => 'warning',
                                    'completed' => 'info',
                                    'terminated' => 'danger',
                                    default => 'gray',
                                })
                                ->icon(fn (string $state): ?string => match ($state) {
                                    'active' => 'heroicon-m-check-circle',
                                    'suspended' => 'heroicon-m-pause-circle',
                                    'completed' => 'heroicon-m-check-badge',
                                    'terminated' => 'heroicon-m-x-circle',
                                    default => null,
                                }),

                            TextEntry::make('progress_percentage')
                                ->label(__('training_assignments.columns.progress'))
                                ->suffix('%')
                                ->badge()
                                ->color(fn (int $state): string => match (true) {
                                    $state >= 100 => 'success',
                                    $state >= 50 => 'info',
                                    $state > 0 => 'warning',
                                    default => 'gray',
                                }),

                            TextEntry::make('start_date')
                                ->label(__('training_assignments.columns.start_date'))
                                ->date(),

                            TextEntry::make('end_date')
                                ->label(__('training_assignments.columns.end_date'))
                                ->date(),
                        ]),
                    ]),

                Section::make(__('training_assignments.infolist.supervisors_section'))
                    ->icon('heroicon-o-user-group')
                    ->components([
                        Grid::make(2)->schema([
                            TextEntry::make('academicSupervisor.name')
                                ->label(__('training_assignments.columns.academic_supervisor'))
                                ->state(fn (TrainingAssignment $record): string => (string) ($record->academicSupervisor?->name ?? '—'))
                                ->formatStateUsing(function (mixed $state, TrainingAssignment $record): HtmlString {
                                    $name = e((string) $state);
                                    $email = $record->academicSupervisor?->email ? '<div style="font-size: 12px; color: #64748b; margin-top: 2px;">'.e($record->academicSupervisor->email).'</div>' : '';

                                    return new HtmlString('<div><strong style="font-weight: 600;">'.$name.'</strong>'.$email.'</div>');
                                }),

                            TextEntry::make('fieldSupervisor.name')
                                ->label(__('training_assignments.columns.field_supervisor'))
                                ->state(fn (TrainingAssignment $record): string => (string) ($record->fieldSupervisor?->name ?? '—'))
                                ->formatStateUsing(function (mixed $state, TrainingAssignment $record): HtmlString {
                                    $name = e((string) $state);
                                    $email = $record->fieldSupervisor?->email ? '<div style="font-size: 12px; color: #64748b; margin-top: 2px;">'.e($record->fieldSupervisor->email).'</div>' : '';

                                    return new HtmlString('<div><strong style="font-weight: 600;">'.$name.'</strong>'.$email.'</div>');
                                }),

                            TextEntry::make('trainingCoordinator.name')
                                ->label(__('training_assignments.infolist.coordinator'))
                                ->state(fn (TrainingAssignment $record): string => (string) ($record->trainingCoordinator?->name ?? '—'))
                                ->formatStateUsing(function (mixed $state, TrainingAssignment $record): HtmlString {
                                    $name = e((string) $state);
                                    $email = $record->trainingCoordinator?->email ? '<div style="font-size: 12px; color: #64748b; margin-top: 2px;">'.e($record->trainingCoordinator->email).'</div>' : '';

                                    return new HtmlString('<div><strong style="font-weight: 600;">'.$name.'</strong>'.$email.'</div>');
                                }),
                        ]),
                    ]),

                Section::make(__('training_assignments.infolist.report_config_section'))
                    ->icon('heroicon-o-clipboard-document-check')
                    ->components([
                        Grid::make(2)->schema([
                            TextEntry::make('required_reports_count')
                                ->label(__('training_assignments.form.required_reports_count'))
                                ->state(fn (TrainingAssignment $record): int => (int) ($record->required_reports_count ?? 0))
                                ->weight('bold'),

                            TextEntry::make('report_breakdown')
                                ->label(__('training_assignments.infolist.reports_summary'))
                                ->formatStateUsing(function (mixed $state, TrainingAssignment $record): HtmlString {
                                    $config = $record->report_configuration ?? [];
                                    $types = [
                                        'daily' => [
                                            'label' => __('training_assignments.infolist.daily_reports'),
                                            'enabled' => (bool) ($config['daily']['enabled'] ?? false),
                                            'count' => (int) ($config['daily']['max_count'] ?? 0),
                                        ],
                                        'weekly' => [
                                            'label' => __('training_assignments.infolist.weekly_reports'),
                                            'enabled' => (bool) ($config['weekly']['enabled'] ?? false),
                                            'count' => (int) ($config['weekly']['max_count'] ?? 0),
                                        ],
                                        'monthly' => [
                                            'label' => __('training_assignments.infolist.monthly_reports'),
                                            'enabled' => (bool) ($config['monthly']['enabled'] ?? false),
                                            'count' => (int) ($config['monthly']['max_count'] ?? 0),
                                        ],
                                        'final' => [
                                            'label' => __('training_assignments.infolist.final_report'),
                                            'enabled' => (bool) ($config['final']['enabled'] ?? true),
                                            'count' => (bool) ($config['final']['enabled'] ?? true) ? 1 : 0,
                                        ],
                                    ];

                                    $itemsHtml = '';
                                    foreach ($types as $item) {
                                        $badge = $item['enabled']
                                            ? '<span style="font-size: 11px; font-weight: 600; color: #15803d; background: rgba(34, 197, 94, 0.15); padding: 2px 8px; border-radius: 6px;">'.e(__('training_assignments.infolist.enabled')).' ('.$item['count'].')</span>'
                                            : '<span style="font-size: 11px; font-weight: 600; color: #64748b; background: rgba(148, 163, 184, 0.15); padding: 2px 8px; border-radius: 6px;">'.e(__('training_assignments.infolist.disabled')).'</span>';

                                        $itemsHtml .= '<div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed rgba(226, 232, 240, 0.8);">';
                                        $itemsHtml .= '  <span style="font-size: 13px; font-weight: 500;">'.e($item['label']).'</span>';
                                        $itemsHtml .= '  '.$badge;
                                        $itemsHtml .= '</div>';
                                    }

                                    return new HtmlString('<div style="width: 100%;">'.$itemsHtml.'</div>');
                                })
                                ->columnSpanFull(),
                        ]),
                    ]),
            ]);
    }
}
