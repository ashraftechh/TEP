<?php

declare(strict_types=1);

namespace App\Filament\Pages;

use Filament\Pages\Dashboard as BaseDashboard;
use Illuminate\Contracts\Support\Htmlable;

class Dashboard extends BaseDashboard
{
    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-chart-bar';

    public function getTitle(): string|Htmlable
    {
        return __('companies.dashboard.title');
    }

    public static function getNavigationLabel(): string
    {
        return __('companies.dashboard.navigation');
    }
}
