<?php

declare(strict_types=1);

namespace App\Filament\Resources\Companies\Pages;

use App\Filament\Resources\Companies\CompanyResource;
use App\Models\Company;
use Filament\Resources\Pages\ListRecords;
use Filament\Schemas\Components\Tabs\Tab;
use Illuminate\Database\Eloquent\Builder;

class ListCompanies extends ListRecords
{
    protected static string $resource = CompanyResource::class;

    public function getTitle(): string
    {
        return __('companies.resource.title');
    }

    /**
     * Get the header actions available on the list page.
     *
     * @return array<int, mixed>
     */
    protected function getHeaderActions(): array
    {
        return [];
    }

    public function getDefaultActiveTab(): string|int|null
    {
        return 'all';
    }

    /**
     * Filter tabs for browsing and reviewing company records by status.
     *
     * @return array<string, Tab>
     */
    public function getTabs(): array
    {
        return [
            'all' => Tab::make(__('companies.statuses.all'))
                ->modifyQueryUsing(fn (Builder $query) => $query->withoutTrashed())
                ->badge(fn (): int => Company::count()),
            'pending_verification' => Tab::make(__('companies.statuses.pending_verification'))
                ->modifyQueryUsing(fn (Builder $query) => $query->withoutTrashed()->whereIn('status', ['pending_verification', 'under_review']))
                ->badge(fn (): int => Company::whereIn('status', ['pending_verification', 'under_review'])->count()),
            'changes_requested' => Tab::make(__('companies.statuses.changes_requested'))
                ->modifyQueryUsing(fn (Builder $query) => $query->withoutTrashed()->where('status', 'changes_requested'))
                ->badge(fn (): int => Company::where('status', 'changes_requested')->count()),
            'approved' => Tab::make(__('companies.statuses.approved'))
                ->modifyQueryUsing(fn (Builder $query) => $query->withoutTrashed()->where('status', 'approved'))
                ->badge(fn (): int => Company::where('status', 'approved')->count()),
            'suspended' => Tab::make(__('companies.statuses.suspended'))
                ->modifyQueryUsing(fn (Builder $query) => $query->withoutTrashed()->where('status', 'suspended'))
                ->badge(fn (): int => Company::where('status', 'suspended')->count()),
            'rejected' => Tab::make(__('companies.statuses.rejected'))
                ->modifyQueryUsing(fn (Builder $query) => $query->withoutTrashed()->where('status', 'rejected'))
                ->badge(fn (): int => Company::where('status', 'rejected')->count()),
            'deleted' => Tab::make(__('companies.statuses.deleted'))
                ->modifyQueryUsing(fn (Builder $query) => $query->onlyTrashed())
                ->badge(fn (): int => Company::onlyTrashed()->count()),
        ];
    }
}
