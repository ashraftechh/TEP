<?php

declare(strict_types=1);

namespace App\Filament\Resources\Companies\Schemas;

use App\Models\Company;
use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Components\Callout;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Illuminate\Support\HtmlString;

class CompanyInfolist
{
    public static function configure(Schema $schema): Schema
    {
        return $schema
            ->components([
                Callout::make('unverified_email_notice')
                    ->warning()
                    ->icon('heroicon-o-exclamation-triangle')
                    ->heading(__('companies.columns.email_unverified'))
                    ->description(__('companies.actions.view_details.unverified_email_alert'))
                    ->visible(fn (Company $record): bool => ! $record->representatives()->exists()),

                Section::make(__('companies.actions.view_details.modal_heading'))
                    ->components([
                        Grid::make(2)->schema([
                            TextEntry::make('name')
                                ->label(__('companies.columns.name'))
                                ->state(fn (Company $record): string => (string) $record->name)
                                ->weight('bold'),

                            TextEntry::make('status')
                                ->label(__('companies.columns.status'))
                                ->badge()
                                ->formatStateUsing(fn ($state) => __('companies.statuses.'.$state))
                                ->color(fn ($state) => match ($state) {
                                    'pending_verification' => 'warning',
                                    'under_review' => 'info',
                                    'approved' => 'success',
                                    'rejected' => 'danger',
                                    'changes_requested' => 'warning',
                                    'suspended' => 'gray',
                                    default => 'gray',
                                })
                                ->icon(fn ($state) => match ($state) {
                                    'pending_verification' => 'heroicon-m-clock',
                                    'under_review' => 'heroicon-m-magnifying-glass',
                                    'approved' => 'heroicon-m-check-circle',
                                    'rejected' => 'heroicon-m-x-circle',
                                    'changes_requested' => 'heroicon-m-pencil-square',
                                    'suspended' => 'heroicon-m-pause-circle',
                                    default => null,
                                }),

                            TextEntry::make('contact_email')
                                ->label(__('companies.columns.contact_email'))
                                ->state(fn (Company $record): string => (string) ($record->contact_email ?? $record->email ?? ''))
                                ->formatStateUsing(function ($state, Company $record) {
                                    if (! $state) {
                                        return '—';
                                    }

                                    $email = e((string) $state);
                                    $isVerified = $record->representatives()->exists();
                                    $badge = $isVerified
                                        ? '<span style="font-size: 11px; font-weight: 600; color: #15803d; background: rgba(34, 197, 94, 0.15); padding: 1px 8px; border-radius: 6px; white-space: nowrap;">✓ '.__('companies.statuses.approved').'</span>'
                                        : '<span style="font-size: 11px; font-weight: 600; color: #b45309; background: rgba(245, 158, 11, 0.15); padding: 1px 8px; border-radius: 6px; white-space: nowrap;">'.__('companies.columns.email_unverified').'</span>';

                                    return new HtmlString(
                                        '<div style="display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;">'.
                                            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; color: #94a3b8;"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>'.
                                            '<span style="font-weight: 500;">'.$email.'</span>'.
                                            $badge.
                                        '</div>'
                                    );
                                }),

                            TextEntry::make('phone')
                                ->label(__('companies.columns.phone'))
                                ->formatStateUsing(function ($state) {
                                    if (! $state) {
                                        return '—';
                                    }

                                    $phone = e((string) $state);

                                    return new HtmlString(
                                        '<div style="display: inline-flex; align-items: center; gap: 8px;">'.
                                            '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; color: #94a3b8;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>'.
                                            '<span dir="ltr" style="unicode-bidi: isolate; font-weight: 500;">'.$phone.'</span>'.
                                        '</div>'
                                    );
                                }),

                            TextEntry::make('industry.name')
                                ->label(__('companies.columns.industry'))
                                ->state(fn (Company $record): string => (string) ($record->industry?->name ?? ''))
                                ->placeholder('—'),

                            TextEntry::make('registration_number')
                                ->label(__('companies.columns.registration_number'))
                                ->placeholder('—'),

                            TextEntry::make('website')
                                ->label(__('companies.columns.website'))
                                ->url(fn ($state) => $state)
                                ->openUrlInNewTab()
                                ->placeholder('—'),

                            TextEntry::make('created_at')
                                ->label(__('companies.columns.submitted_at'))
                                ->dateTime(),
                        ]),

                        TextEntry::make('description')
                            ->label(__('companies.columns.description'))
                            ->state(fn (Company $record): string => (string) ($record->description ?? ''))
                            ->placeholder('—')
                            ->columnSpanFull(),
                    ]),

                Section::make(__('companies.columns.representatives'))
                    ->components([
                        TextEntry::make('representatives_list')
                            ->hiddenLabel()
                            ->formatStateUsing(function (mixed $state, Company $record): HtmlString {
                                $representatives = $record->representatives()->with('user')->get();

                                if ($representatives->isEmpty()) {
                                    return new HtmlString('<p style="color: #94a3b8; font-size: 13px; margin: 0;">'.e(__('companies.columns.no_representatives')).'</p>');
                                }

                                $html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
                                foreach ($representatives as $rep) {
                                    $user = $rep->user;
                                    if (! $user) {
                                        continue;
                                    }

                                    $name = e($user->name);
                                    $email = e($user->email);
                                    $phone = e($user->phone ?? '—');
                                    $primaryTag = $rep->is_primary
                                        ? '<span style="font-size: 11px; font-weight: 700; color: #15803d; background: rgba(34, 197, 94, 0.15); padding: 1px 8px; border-radius: 6px;">'.e(__('companies.columns.primary_representative')).'</span>'
                                        : '';

                                    $html .= '<div style="padding: 10px 14px; background: rgba(241, 245, 249, 0.6); border: 1px solid rgba(226, 232, 240, 0.8); border-radius: 8px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">';
                                    $html .= '  <div>';
                                    $html .= '    <strong style="font-size: 14px; color: #0f172a;">'.$name.'</strong> '.$primaryTag;
                                    $html .= '    <div style="font-size: 12px; color: #64748b; margin-top: 2px;">'.$email.' &bull; <span dir="ltr">'.$phone.'</span></div>';
                                    $html .= '  </div>';
                                    $html .= '</div>';
                                }
                                $html .= '</div>';

                                return new HtmlString($html);
                            }),
                    ])
                    ->visible(fn (Company $record): bool => in_array($record->status, ['approved', 'suspended'], true)),
            ]);
    }
}
