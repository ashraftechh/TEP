<?php

declare(strict_types=1);

namespace App\Filament\Resources\TrainingAssignments\Tables;

use App\Actions\TrainingAssignments\TransitionTrainingAssignmentAction;
use App\Exceptions\InvalidTrainingAssignmentTransitionException;
use App\Models\TrainingAssignment;
use Filament\Actions\Action;
use Filament\Actions\EditAction;
use Filament\Actions\ViewAction;
use Filament\Forms\Components\Textarea;
use Filament\Notifications\Notification;
use Filament\Support\Enums\SlideOverPosition;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\HtmlString;

/**
 * TEP-662 — lists existing training assignments with student/company/
 * supervisors/status/date-range columns, filterable by status, same shape as
 * Companies/Tables/CompaniesTable.php.
 *
 * TEP-671 adds the status-transition row actions below, same shape as
 * CompaniesTable's approve/reject/suspend/reactivate actions: one Action
 * per meaningful transition, each calling the SHARED
 * TransitionTrainingAssignmentAction (TEP-670) rather than writing to the
 * model directly, and each `->visible()` gated on BOTH the
 * `training_assignments.transition` permission AND
 * TrainingAssignment::TRANSITIONS (TEP-669) — the map is reused here
 * exactly as instructed, never re-listed as a second hardcoded set of
 * valid statuses.
 */
class TrainingAssignmentsTable
{
    public static function highlight(mixed $value, Table $table): HtmlString
    {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                $value = $decoded;
            }
        }

        $text = is_array($value)
            ? ($value[app()->getLocale()] ?? $value['ar'] ?? $value['en'] ?? '')
            : (string) ($value ?? '');

        if ($text === '') {
            return new HtmlString('—');
        }

        $search = $table->getLivewire()->getTableSearch();

        if (empty($search) || trim($search) === '') {
            return new HtmlString(e($text));
        }

        $escapedSearch = preg_quote(trim($search), '/');
        $highlighted = preg_replace(
            '/('.$escapedSearch.')/iu',
            '<mark style="background-color: rgba(253, 224, 71, 0.55); color: inherit; font-weight: 700; padding: 1px 3px; border-radius: 4px;">$1</mark>',
            e($text)
        );

        return new HtmlString($highlighted ?? e($text));
    }

    /**
     * Whether the acting user may transition training assignments at all.
     * Row-level reachability (TEP-669's map) is checked separately per
     * action below.
     */
    protected static function userCanTransition(): bool
    {
        $user = Auth::user();

        return $user !== null && (
            $user->hasPermission('training_assignments.transition')
            || $user->hasRole('training_coordinator')
            || $user->hasRole('super_admin')
        );
    }

    /**
     * Shared action handler: calls TransitionTrainingAssignmentAction and
     * turns its one possible failure mode (an invalid pair — should be
     * unreachable in practice since ->visible() already filters the
     * options, but this is the same defense-in-depth re-check the API
     * controller applies) into a Filament notification instead of a
     * fatal exception.
     */
    protected static function transition(TrainingAssignment $record, string $to, ?string $reason, string $successNotificationKey): void
    {
        try {
            app(TransitionTrainingAssignmentAction::class)->execute(
                assignment: $record,
                to: $to,
                reason: $reason,
                actor: Auth::user(),
            );
        } catch (InvalidTrainingAssignmentTransitionException) {
            Notification::make()
                ->title(__('training_assignments.invalid_transition', ['from' => $record->status, 'to' => $to]))
                ->danger()
                ->send();

            return;
        }

        Notification::make()
            ->title(__($successNotificationKey))
            ->success()
            ->send();
    }

    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('studentProfile.user.name')
                    ->label(__('training_assignments.columns.student'))
                    ->formatStateUsing(fn (mixed $state, TrainingAssignment $record, Table $table): HtmlString => static::highlight($record->studentProfile?->user?->name, $table))
                    ->searchable()
                    ->sortable(),

                TextColumn::make('company.name')
                    ->label(__('training_assignments.columns.company'))
                    ->formatStateUsing(fn (mixed $state, TrainingAssignment $record, Table $table): HtmlString => static::highlight($record->company?->name, $table))
                    ->searchable(query: function ($query, string $search): void {
                        $query->whereHas('company', function ($q) use ($search): void {
                            $q->where('name->ar', 'like', "%{$search}%")
                                ->orWhere('name->en', 'like', "%{$search}%");
                        });
                    })
                    ->sortable(),

                TextColumn::make('academicSupervisor.name')
                    ->label(__('training_assignments.columns.academic_supervisor'))
                    ->formatStateUsing(fn (mixed $state, TrainingAssignment $record, Table $table): HtmlString => static::highlight($record->academicSupervisor?->name, $table))
                    ->searchable(),

                TextColumn::make('fieldSupervisor.name')
                    ->label(__('training_assignments.columns.field_supervisor'))
                    ->formatStateUsing(fn (mixed $state, TrainingAssignment $record, Table $table): HtmlString => static::highlight($record->fieldSupervisor?->name, $table))
                    ->searchable(),

                TextColumn::make('status')
                    ->label(__('training_assignments.columns.status'))
                    ->badge()
                    ->formatStateUsing(fn (string $state): string => __('training_assignments.statuses.'.$state))
                    ->color(fn (string $state): string => match ($state) {
                        'active' => 'success',
                        'suspended' => 'warning',
                        'completed' => 'info',
                        'terminated' => 'danger',
                        default => 'gray',
                    }),

                TextColumn::make('start_date')
                    ->label(__('training_assignments.columns.start_date'))
                    ->date()
                    ->sortable(),

                TextColumn::make('end_date')
                    ->label(__('training_assignments.columns.end_date'))
                    ->date()
                    ->sortable(),

                TextColumn::make('progress_percentage')
                    ->label(__('training_assignments.columns.progress'))
                    ->suffix('%')
                    ->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label(__('training_assignments.columns.status'))
                    ->options([
                        'active' => __('training_assignments.statuses.active'),
                        'suspended' => __('training_assignments.statuses.suspended'),
                        'completed' => __('training_assignments.statuses.completed'),
                        'terminated' => __('training_assignments.statuses.terminated'),
                    ]),
            ])
            ->actions([
                ViewAction::make()
                    ->label(__('training_assignments.actions.view_details.label'))
                    ->modalHeading(__('training_assignments.actions.view_details.modal_heading'))
                    ->slideOver()
                    ->slideOverPosition(fn () => app()->getLocale() === 'ar' ? SlideOverPosition::Start : SlideOverPosition::Start),

                EditAction::make()
                    ->label(__('training_assignments.actions.edit.label')),

                Action::make('suspend')
                    ->label(__('training_assignments.actions.suspend.label'))
                    ->icon('heroicon-o-pause-circle')
                    ->color('warning')
                    ->modalHeading(__('training_assignments.actions.suspend.modal_heading'))
                    ->modalDescription(__('training_assignments.actions.suspend.modal_description'))
                    ->schema([
                        Textarea::make('reason')
                            ->label(__('training_assignments.actions.suspend.reason_label'))
                            ->placeholder(__('training_assignments.actions.suspend.reason_placeholder'))
                            ->required()
                            ->maxLength(2000)
                            ->rows(3),
                    ])
                    ->visible(fn (TrainingAssignment $record): bool => static::userCanTransition() && $record->canTransitionTo('suspended'))
                    ->action(fn (TrainingAssignment $record, array $data) => static::transition(
                        $record,
                        'suspended',
                        (string) $data['reason'],
                        'training_assignments.actions.suspend.success_notification',
                    )),

                Action::make('terminate')
                    ->label(__('training_assignments.actions.terminate.label'))
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->modalHeading(__('training_assignments.actions.terminate.modal_heading'))
                    ->modalDescription(__('training_assignments.actions.terminate.modal_description'))
                    ->schema([
                        Textarea::make('reason')
                            ->label(__('training_assignments.actions.terminate.reason_label'))
                            ->placeholder(__('training_assignments.actions.terminate.reason_placeholder'))
                            ->required()
                            ->maxLength(2000)
                            ->rows(3),
                    ])
                    ->visible(fn (TrainingAssignment $record): bool => static::userCanTransition() && $record->canTransitionTo('terminated'))
                    ->action(fn (TrainingAssignment $record, array $data) => static::transition(
                        $record,
                        'terminated',
                        (string) $data['reason'],
                        'training_assignments.actions.terminate.success_notification',
                    )),

                Action::make('reactivate')
                    ->label(__('training_assignments.actions.reactivate.label'))
                    ->icon('heroicon-o-arrow-path')
                    ->color('success')
                    ->requiresConfirmation()
                    ->modalHeading(__('training_assignments.actions.reactivate.modal_heading'))
                    ->modalDescription(__('training_assignments.actions.reactivate.modal_description'))
                    ->visible(fn (TrainingAssignment $record): bool => static::userCanTransition() && $record->canTransitionTo('active'))
                    ->action(fn (TrainingAssignment $record) => static::transition(
                        $record,
                        'active',
                        null,
                        'training_assignments.actions.reactivate.success_notification',
                    )),

                Action::make('mark_completed')
                    ->label(__('training_assignments.actions.mark_completed.label'))
                    ->icon('heroicon-o-check-circle')
                    ->color('info')
                    ->requiresConfirmation()
                    ->modalHeading(__('training_assignments.actions.mark_completed.modal_heading'))
                    ->modalDescription(__('training_assignments.actions.mark_completed.modal_description'))
                    ->visible(fn (TrainingAssignment $record): bool => static::userCanTransition() && $record->canTransitionTo('completed'))
                    ->action(fn (TrainingAssignment $record) => static::transition(
                        $record,
                        'completed',
                        null,
                        'training_assignments.actions.mark_completed.success_notification',
                    )),
            ])
            ->defaultSort('created_at', 'desc');
    }
}
