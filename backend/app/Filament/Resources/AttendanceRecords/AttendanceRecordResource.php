<?php

declare(strict_types=1);

namespace App\Filament\Resources\AttendanceRecords;

use App\Filament\Resources\AttendanceRecords\Pages\ListAttendanceRecords;
use App\Filament\Resources\AttendanceRecords\Tables\AttendanceRecordsTable;
use App\Models\AttendanceRecord;
use Filament\Resources\Resource;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Facades\Auth;

/**
 * TEP-694 — Filament Resource for listing and approving attendance records.
 *
 * Training coordinators (and super admins) can review all student attendance
 * records and approve or reject pending submissions using row actions.
 */
class AttendanceRecordResource extends Resource
{
    protected static ?string $model = AttendanceRecord::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-calendar-days';

    protected static ?int $navigationSort = 2;

    public static function getNavigationLabel(): string
    {
        return __('attendance.filament.resource.title');
    }

    public static function getPluralModelLabel(): string
    {
        return __('attendance.filament.resource.title');
    }

    public static function getModelLabel(): string
    {
        return __('attendance.filament.resource.singular');
    }

    public static function getNavigationGroup(): ?string
    {
        return __('attendance.filament.resource.navigation_group');
    }

    public static function canViewAny(): bool
    {
        $user = Auth::user();

        if (! $user) {
            return false;
        }

        return $user->hasPermission('attendance_records.view_any')
            || $user->hasRole('training_coordinator')
            || $user->hasRole('super_admin');
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->withoutGlobalScopes([
                SoftDeletingScope::class,
            ])
            ->with([
                'trainingAssignment.studentProfile.user',
                'trainingAssignment.company',
                'recordedBy',
                'approvedBy',
            ])
            ->latest('attendance_date');
    }

    public static function table(Table $table): Table
    {
        return AttendanceRecordsTable::configure($table);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListAttendanceRecords::route('/'),
        ];
    }
}
