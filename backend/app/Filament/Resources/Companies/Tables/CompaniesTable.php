<?php

declare(strict_types=1);

namespace App\Filament\Resources\Companies\Tables;

use App\Actions\Companies\ApproveCompanyAction;
use App\Actions\Companies\RejectCompanyAction;
use App\Mail\CompanyStatusUpdateMail;
use App\Models\AuditLog;
use App\Models\Company;
use Filament\Actions\Action;
use Filament\Actions\DeleteAction;
use Filament\Actions\ForceDeleteAction;
use Filament\Actions\RestoreAction;
use Filament\Actions\ViewAction;
use Filament\Forms\Components\Radio;
use Filament\Forms\Components\Textarea;
use Filament\Notifications\Notification;
use Filament\Support\Enums\SlideOverPosition;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\HtmlString;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;

class CompaniesTable
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
     * Send a company status update email and return whether it succeeded.
     * Always logs a warning on failure instead of throwing.
     *
     * @param  array<string, mixed>  $mailArgs
     */
    protected static function trySendStatusMail(Company $company, string $status, string $reason = '', ?string $registrationUrl = null): bool
    {
        $contactEmail = $company->contact_email ?? $company->email;
        if (empty($contactEmail)) {
            return false;
        }

        try {
            Mail::to($contactEmail)->send(
                new CompanyStatusUpdateMail(
                    company: $company,
                    status: $status,
                    reason: $reason,
                    recipientName: null,
                    locale: 'ar',
                    registrationUrl: $registrationUrl,
                )
            );

            return true;
        } catch (TransportExceptionInterface $e) {
            Log::warning('CompaniesTable: SMTP transport failure sending status mail', [
                'company_id' => $company->id,
                'status' => $status,
                'error' => $e->getMessage(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('CompaniesTable: unexpected error sending status mail', [
                'company_id' => $company->id,
                'status' => $status,
                'error' => $e->getMessage(),
            ]);
        }

        return false;
    }

    /**
     * Show a bilingual SMTP-failure warning notification in Filament.
     */
    protected static function notifySmtpFailure(): void
    {
        Notification::make()
            ->title(__('companies.actions.mail_failure.title'))
            ->body(__('companies.actions.mail_failure.body'))
            ->warning()
            ->persistent()
            ->send();
    }

    public static function configure(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')
                    ->label(__('companies.columns.name'))
                    ->formatStateUsing(fn (mixed $state, Company $record, Table $table): HtmlString => static::highlight($record->name, $table))
                    ->searchable(query: function ($query, string $search): void {
                        $query->where('name->ar', 'like', "%{$search}%")
                            ->orWhere('name->en', 'like', "%{$search}%");
                    })
                    ->sortable()
                    ->weight('bold'),

                TextColumn::make('contact_email')
                    ->label(__('companies.columns.contact_email'))
                    ->state(fn (Company $record): string => (string) ($record->contact_email ?? $record->email ?? ''))
                    ->formatStateUsing(fn (mixed $state, Company $record, Table $table): HtmlString => static::highlight($record->contact_email ?? $record->email, $table))
                    ->searchable(query: function ($query, string $search): void {
                        $query->where('contact_email', 'like', "%{$search}%");
                    })
                    ->sortable()
                    ->copyable()
                    ->description(function (Company $record): ?string {
                        $primaryRep = $record->representatives()->with('user')->where('is_primary', true)->first()
                            ?? $record->representatives()->with('user')->first();

                        if ($primaryRep && $primaryRep->user) {
                            return __('companies.columns.representative_active', ['name' => $primaryRep->user->name]);
                        }

                        if ($record->status === 'approved') {
                            return __('companies.columns.representative_pending');
                        }

                        return __('companies.columns.email_unverified');
                    }),

                TextColumn::make('industry.name')
                    ->label(__('companies.columns.industry'))
                    ->formatStateUsing(fn (mixed $state, Company $record, Table $table): HtmlString => static::highlight($record->industry?->name, $table))
                    ->sortable()
                    ->toggleable(),

                TextColumn::make('phone')
                    ->label(__('companies.columns.phone'))
                    ->formatStateUsing(fn (mixed $state, Company $record, Table $table): HtmlString => static::highlight($record->phone, $table))
                    ->searchable()
                    ->toggleable(),

                TextColumn::make('registration_number')
                    ->label(__('companies.columns.registration_number'))
                    ->formatStateUsing(fn (mixed $state, Company $record, Table $table): HtmlString => static::highlight($record->registration_number, $table))
                    ->searchable()
                    ->toggleable(isToggledHiddenByDefault: true),

                TextColumn::make('status')
                    ->label(__('companies.columns.status'))
                    ->badge()
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'pending_verification' => __('companies.statuses.pending_verification'),
                        'under_review' => __('companies.statuses.under_review'),
                        'approved' => __('companies.statuses.approved'),
                        'rejected' => __('companies.statuses.rejected'),
                        'changes_requested' => __('companies.statuses.changes_requested'),
                        'suspended' => __('companies.statuses.suspended'),
                        default => $state,
                    })
                    ->color(fn (string $state): string => match ($state) {
                        'pending_verification' => 'warning',
                        'under_review' => 'info',
                        'approved' => 'success',
                        'rejected' => 'danger',
                        'changes_requested' => 'warning',
                        'suspended' => 'gray',
                        default => 'gray',
                    }),

                TextColumn::make('created_at')
                    ->label(__('companies.columns.submitted_at'))
                    ->dateTime()
                    ->sortable()
                    ->toggleable(),
            ])
            ->filters([
                //
            ])
            ->actions([
                ViewAction::make()
                    ->label(__('companies.actions.view_details.label'))
                    ->modalHeading(__('companies.actions.view_details.modal_heading'))
                    ->slideOver()
                    ->slideOverPosition(fn () => app()->getLocale() === 'ar' ? SlideOverPosition::Start : SlideOverPosition::Start),

                Action::make('approve')
                    ->label(__('companies.actions.approve.label'))
                    ->icon('heroicon-o-check-circle')
                    ->color('success')
                    ->requiresConfirmation()
                    ->modalHeading(__('companies.actions.approve.modal_heading'))
                    ->modalDescription(__('companies.actions.approve.modal_description'))
                    ->visible(function (Company $record): bool {
                        $user = Auth::user();
                        $hasPermission = $user && (
                            $user->hasPermission('companies.approve') ||
                            $user->hasRole('training_coordinator') ||
                            $user->hasRole('super_admin')
                        );

                        return $hasPermission && in_array($record->status, ['pending_verification', 'under_review'], true);
                    })
                    ->action(function (Company $record, ApproveCompanyAction $approveCompanyAction): void {
                        try {
                            $result = $approveCompanyAction->execute($record);
                        } catch (TransportExceptionInterface $e) {
                            static::notifySmtpFailure();

                            return;
                        }

                        if ($result['mail_sent']) {
                            Notification::make()
                                ->title(__('companies.actions.approve.success_notification'))
                                ->success()
                                ->send();
                        } else {
                            Notification::make()
                                ->title(__('companies.actions.approve.success_no_mail_notification'))
                                ->body(__('companies.actions.mail_failure.body'))
                                ->warning()
                                ->persistent()
                                ->send();
                        }
                    }),

                Action::make('reject')
                    ->label(__('companies.actions.reject.label'))
                    ->icon('heroicon-o-x-circle')
                    ->color('danger')
                    ->modalHeading(__('companies.actions.reject.modal_heading'))
                    ->schema([
                        Radio::make('status')
                            ->label(__('companies.actions.reject.status_label'))
                            ->options([
                                'rejected' => __('companies.actions.reject.status_options.rejected'),
                                'changes_requested' => __('companies.actions.reject.status_options.changes_requested'),
                            ])
                            ->default('rejected')
                            ->required(),

                        Textarea::make('reason')
                            ->label(__('companies.actions.reject.reason_label'))
                            ->placeholder(__('companies.actions.reject.reason_placeholder'))
                            ->required()
                            ->maxLength(2000)
                            ->rows(4),
                    ])
                    ->visible(function (Company $record): bool {
                        $user = Auth::user();
                        $hasPermission = $user && (
                            $user->hasPermission('companies.reject') ||
                            $user->hasRole('training_coordinator') ||
                            $user->hasRole('super_admin')
                        );

                        return $hasPermission && in_array($record->status, ['pending_verification', 'under_review'], true);
                    })
                    ->action(function (Company $record, array $data, RejectCompanyAction $rejectCompanyAction): void {
                        try {
                            $result = $rejectCompanyAction->execute($record, (string) $data['status'], (string) $data['reason']);
                        } catch (TransportExceptionInterface $e) {
                            static::notifySmtpFailure();

                            return;
                        }

                        if ($result['mail_sent']) {
                            Notification::make()
                                ->title(__('companies.actions.reject.success_notification'))
                                ->success()
                                ->send();
                        } else {
                            Notification::make()
                                ->title(__('companies.actions.reject.success_no_mail_notification'))
                                ->body(__('companies.actions.mail_failure.body'))
                                ->warning()
                                ->persistent()
                                ->send();
                        }
                    }),

                Action::make('suspend')
                    ->label(__('companies.actions.suspend.label'))
                    ->icon('heroicon-o-pause-circle')
                    ->color('warning')
                    ->modalHeading(__('companies.actions.suspend.modal_heading'))
                    ->schema([
                        Textarea::make('reason')
                            ->label(__('companies.actions.suspend.reason_label'))
                            ->placeholder(__('companies.actions.suspend.reason_placeholder'))
                            ->required()
                            ->maxLength(2000)
                            ->rows(3),
                    ])
                    ->visible(function (Company $record): bool {
                        $user = Auth::user();
                        $hasPermission = $user && (
                            $user->hasPermission('companies.update') ||
                            $user->hasRole('training_coordinator') ||
                            $user->hasRole('super_admin')
                        );

                        return $hasPermission && $record->status === 'approved' && ! $record->trashed();
                    })
                    ->action(function (Company $record, array $data): void {
                        $beforeStatus = $record->status;
                        $reason = trim((string) ($data['reason'] ?? ''));

                        if (! static::trySendStatusMail($record, 'suspended', $reason)) {
                            static::notifySmtpFailure();

                            return;
                        }

                        $record->update([
                            'status' => 'suspended',
                            'status_reason' => $reason,
                        ]);

                        AuditLog::create([
                            'actor_id' => Auth::id(),
                            'action' => 'companies.suspend',
                            'entity_type' => 'companies',
                            'entity_id' => $record->id,
                            'before_state' => ['status' => $beforeStatus],
                            'after_state' => ['status' => 'suspended', 'reason' => $reason ?: null],
                        ]);

                        Notification::make()
                            ->title(__('companies.actions.suspend.success_notification'))
                            ->warning()
                            ->send();
                    }),

                Action::make('reactivate')
                    ->label(__('companies.actions.reactivate.label'))
                    ->icon('heroicon-o-arrow-path')
                    ->color('success')
                    ->requiresConfirmation()
                    ->modalHeading(__('companies.actions.reactivate.modal_heading'))
                    ->modalDescription(__('companies.actions.reactivate.modal_description'))
                    ->visible(function (Company $record): bool {
                        $user = Auth::user();
                        $hasPermission = $user && (
                            $user->hasPermission('companies.update') ||
                            $user->hasRole('training_coordinator') ||
                            $user->hasRole('super_admin')
                        );

                        return $hasPermission && $record->status === 'suspended' && ! $record->trashed();
                    })
                    ->action(function (Company $record): void {
                        if (! static::trySendStatusMail($record, 'reactivated')) {
                            static::notifySmtpFailure();

                            return;
                        }

                        $record->update([
                            'status' => 'approved',
                            'status_reason' => null,
                        ]);

                        AuditLog::create([
                            'actor_id' => Auth::id(),
                            'action' => 'companies.reactivate',
                            'entity_type' => 'companies',
                            'entity_id' => $record->id,
                            'before_state' => ['status' => 'suspended'],
                            'after_state' => ['status' => 'approved'],
                        ]);

                        Notification::make()
                            ->title(__('companies.actions.reactivate.success_notification'))
                            ->success()
                            ->send();
                    }),

                DeleteAction::make()
                    ->visible(function (Company $record): bool {
                        $user = Auth::user();

                        return $user && ! $record->trashed() && (
                            $user->hasRole('training_coordinator') ||
                            $user->hasRole('super_admin')
                        );
                    }),

                RestoreAction::make()
                    ->visible(function (Company $record): bool {
                        $user = Auth::user();

                        return $user && $record->trashed() && (
                            $user->hasRole('training_coordinator') ||
                            $user->hasRole('super_admin')
                        );
                    }),

                ForceDeleteAction::make()
                    ->visible(function (Company $record): bool {
                        $user = Auth::user();

                        return $user && $record->trashed() && (
                            $user->hasRole('training_coordinator') ||
                            $user->hasRole('super_admin')
                        );
                    }),
            ])
            ->actionsColumnLabel(__('companies.columns.actions'));
    }
}
