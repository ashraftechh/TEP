<?php

declare(strict_types=1);

namespace App\Filament\Resources\AttendanceRecords\Tables;

use App\Actions\Attendance\ApproveAttendanceRecordAction;
use App\Actions\Attendance\RejectAttendanceRecordAction;
use App\Models\AttendanceRecord;
use App\Models\Company;
use App\Models\StudentProfile;
use Filament\Actions\Action;
use Filament\Forms\Components\Textarea;
use Filament\Notifications\Notification;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\HtmlString;

class AttendanceRecordsTable
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

    protected static function userCanApprove(): bool
    {
        $user = Auth::user();

        return $user !== null && (
            $user->hasPermission('attendance_records.approve')
            || $user->hasRole('training_coordinator')
            || $user->hasRole('super_admin')
        );
    }

    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('trainingAssignment.studentProfile.user.name')
                    ->label(__('attendance.filament.columns.student'))
                    ->formatStateUsing(fn (mixed $state, AttendanceRecord $record, Table $table): HtmlString => static::highlight($record->trainingAssignment?->studentProfile?->user?->name, $table))
                    ->searchable()
                    ->sortable(),

                TextColumn::make('trainingAssignment.studentProfile.student_number')
                    ->label(__('attendance.filament.columns.student_number'))
                    ->formatStateUsing(fn (mixed $state, AttendanceRecord $record, Table $table): HtmlString => static::highlight($record->trainingAssignment?->studentProfile?->student_number, $table))
                    ->searchable()
                    ->copyable()
                    ->fontFamily('mono'),

                TextColumn::make('trainingAssignment.company.name')
                    ->label(__('attendance.filament.columns.company'))
                    ->formatStateUsing(fn (mixed $state, AttendanceRecord $record, Table $table): HtmlString => static::highlight($record->trainingAssignment?->company?->name, $table))
                    ->searchable(query: function ($query, string $search): void {
                        $query->whereHas('trainingAssignment.company', function ($q) use ($search): void {
                            $q->where('name->ar', 'like', "%{$search}%")
                                ->orWhere('name->en', 'like', "%{$search}%");
                        });
                    })
                    ->sortable(),

                TextColumn::make('attendance_date')
                    ->label(__('attendance.filament.columns.date'))
                    ->date()
                    ->sortable(),

                TextColumn::make('status')
                    ->label(__('attendance.filament.columns.status'))
                    ->badge()
                    ->formatStateUsing(fn (string $state): string => __('attendance.status.'.$state))
                    ->color(fn (string $state): string => match ($state) {
                        'present' => 'success',
                        'late' => 'warning',
                        'absent' => 'danger',
                        'excused' => 'info',
                        default => 'gray',
                    }),

                TextColumn::make('approval_status')
                    ->label(__('attendance.filament.columns.approval_status'))
                    ->badge()
                    ->formatStateUsing(fn (string $state): string => __('attendance.approval_status.'.$state))
                    ->color(fn (string $state): string => match ($state) {
                        'approved' => 'success',
                        'pending' => 'warning',
                        'rejected' => 'danger',
                        default => 'gray',
                    }),

                TextColumn::make('reason')
                    ->label(__('attendance.filament.columns.reason'))
                    ->limit(30)
                    ->formatStateUsing(fn (mixed $state, AttendanceRecord $record, Table $table): HtmlString => static::highlight($record->reason, $table))
                    ->tooltip(fn (AttendanceRecord $record): ?string => $record->reason),

                TextColumn::make('recordedBy.name')
                    ->label(__('attendance.filament.columns.recorded_by'))
                    ->formatStateUsing(fn (mixed $state, AttendanceRecord $record, Table $table): HtmlString => static::highlight($record->recordedBy?->name, $table))
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('approvedBy.name')
                    ->label(__('attendance.filament.columns.approved_by'))
                    ->formatStateUsing(fn (mixed $state, AttendanceRecord $record, Table $table): HtmlString => static::highlight($record->approvedBy?->name, $table))
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('approved_at')
                    ->label(__('attendance.filament.columns.approved_at'))
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('company')
                    ->label(__('attendance.filament.columns.company'))
                    ->options(fn (): array => Company::query()
                        ->orderBy('name')
                        ->get()
                        ->mapWithKeys(fn (Company $company): array => [
                            (string) $company->id => $company->getTranslation('name', app()->getLocale()) ?: (string) $company->name,
                        ])
                        ->toArray()
                    )
                    ->query(function (Builder $query, array $data): Builder {
                        if (! empty($data['value'])) {
                            $query->whereHas('trainingAssignment', fn (Builder $q) => $q->where('company_id', $data['value']));
                        }

                        return $query;
                    })
                    ->searchable()
                    ->preload(),

                SelectFilter::make('student')
                    ->label(__('attendance.filament.columns.student'))
                    ->options(fn (): array => StudentProfile::query()
                        ->with('user')
                        ->get()
                        ->mapWithKeys(fn (StudentProfile $student): array => [
                            (string) $student->id => ($student->user?->name ?? __('attendance.filament.columns.student')).' ('.$student->student_number.')',
                        ])
                        ->toArray()
                    )
                    ->query(function (Builder $query, array $data): Builder {
                        if (! empty($data['value'])) {
                            $query->whereHas('trainingAssignment', fn (Builder $q) => $q->where('student_profile_id', $data['value']));
                        }

                        return $query;
                    })
                    ->searchable()
                    ->preload(),

                SelectFilter::make('status')
                    ->label(__('attendance.filament.columns.status'))
                    ->options([
                        AttendanceRecord::STATUS_PRESENT => __('attendance.status.present'),
                        AttendanceRecord::STATUS_ABSENT => __('attendance.status.absent'),
                        AttendanceRecord::STATUS_LATE => __('attendance.status.late'),
                        AttendanceRecord::STATUS_EXCUSED => __('attendance.status.excused'),
                    ]),
            ])
            ->actions([
                Action::make('approve')
                    ->label(__('attendance.filament.actions.approve.label'))
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->requiresConfirmation()
                    ->modalHeading(__('attendance.filament.actions.approve.modal_heading'))
                    ->modalDescription(__('attendance.filament.actions.approve.modal_description'))
                    ->visible(fn (AttendanceRecord $record): bool => static::userCanApprove() && $record->isPending())
                    ->action(function (AttendanceRecord $record) {
                        app(ApproveAttendanceRecordAction::class)->execute($record, Auth::user());

                        Notification::make()
                            ->title(__('attendance.filament.actions.approve.success_notification'))
                            ->success()
                            ->send();
                    }),

                Action::make('reject')
                    ->label(__('attendance.filament.actions.reject.label'))
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->modalHeading(__('attendance.filament.actions.reject.modal_heading'))
                    ->modalDescription(__('attendance.filament.actions.reject.modal_description'))
                    ->schema([
                        Textarea::make('reason')
                            ->label(__('attendance.filament.actions.reject.reason_label'))
                            ->placeholder(__('attendance.filament.actions.reject.reason_placeholder'))
                            ->required()
                            ->minLength(3)
                            ->maxLength(1000)
                            ->rows(3),
                    ])
                    ->visible(fn (AttendanceRecord $record): bool => static::userCanApprove() && $record->isPending())
                    ->action(function (AttendanceRecord $record, array $data) {
                        app(RejectAttendanceRecordAction::class)->execute($record, (string) $data['reason'], Auth::user());

                        Notification::make()
                            ->title(__('attendance.filament.actions.reject.success_notification'))
                            ->success()
                            ->send();
                    }),
            ])
            ->defaultSort('attendance_date', 'desc');
    }
}
