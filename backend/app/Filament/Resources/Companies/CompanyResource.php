<?php

declare(strict_types=1);

namespace App\Filament\Resources\Companies;

use App\Filament\Resources\Companies\Pages\ListCompanies;
use App\Filament\Resources\Companies\Schemas\CompanyForm;
use App\Filament\Resources\Companies\Schemas\CompanyInfolist;
use App\Filament\Resources\Companies\Tables\CompaniesTable;
use App\Models\Company;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Facades\Auth;

class CompanyResource extends Resource
{
    protected static ?string $model = Company::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-building-office-2';

    protected static ?int $navigationSort = 1;

    public static function getNavigationLabel(): string
    {
        return __('companies.resource.title');
    }

    public static function getPluralModelLabel(): string
    {
        return __('companies.resource.title');
    }

    public static function getModelLabel(): string
    {
        return __('companies.resource.singular');
    }

    public static function getNavigationGroup(): ?string
    {
        return __('companies.resource.navigation_group');
    }

    public static function getNavigationBadge(): ?string
    {
        $count = Company::whereIn('status', ['pending_verification', 'under_review'])->count();

        return $count > 0 ? (string) $count : null;
    }

    public static function getNavigationBadgeColor(): ?string
    {
        return 'warning';
    }

    public static function canViewAny(): bool
    {
        $user = Auth::user();

        if (! $user) {
            return false;
        }

        return $user->hasPermission('companies.view_any')
            || $user->hasRole('training_coordinator')
            || $user->hasRole('super_admin');
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->withoutGlobalScopes([
                SoftDeletingScope::class,
            ])
            ->latest('created_at');
    }

    public static function form(Schema $schema): Schema
    {
        return CompanyForm::configure($schema);
    }

    public static function infolist(Schema $schema): Schema
    {
        return CompanyInfolist::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return CompaniesTable::configure($table);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListCompanies::route('/'),
        ];
    }
}
