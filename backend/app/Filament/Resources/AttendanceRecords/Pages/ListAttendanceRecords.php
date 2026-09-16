<?php

declare(strict_types=1);

namespace App\Filament\Resources\AttendanceRecords\Pages;

use App\Filament\Resources\AttendanceRecords\AttendanceRecordResource;
use App\Models\AttendanceRecord;
use Filament\Resources\Pages\ListRecords;
use Filament\Schemas\Components\Tabs\Tab;
use Illuminate\Database\Eloquent\Builder;

class ListAttendanceRecords extends ListRecords
{
    protected static string $resource = AttendanceRecordResource::class;

    public function getTitle(): string
    {
        return __('attendance.filament.resource.title');
    }

    /**
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
     * Filter tabs for browsing attendance records by approval status, matching the Company Requests pattern.
     *
     * @return array<string, Tab>
     */
    public function getTabs(): array
    {
        return [
            'all' => Tab::make(__('attendance.approval_status.all'))
                ->badge(fn (): int => AttendanceRecord::count()),
            'pending' => Tab::make(__('attendance.approval_status.pending'))
                ->modifyQueryUsing(fn (Builder $query) => $query->where('approval_status', AttendanceRecord::APPROVAL_PENDING))
                ->badge(fn (): int => AttendanceRecord::where('approval_status', AttendanceRecord::APPROVAL_PENDING)->count()),
            'approved' => Tab::make(__('attendance.approval_status.approved'))
                ->modifyQueryUsing(fn (Builder $query) => $query->where('approval_status', AttendanceRecord::APPROVAL_APPROVED))
                ->badge(fn (): int => AttendanceRecord::where('approval_status', AttendanceRecord::APPROVAL_APPROVED)->count()),
            'rejected' => Tab::make(__('attendance.approval_status.rejected'))
                ->modifyQueryUsing(fn (Builder $query) => $query->where('approval_status', AttendanceRecord::APPROVAL_REJECTED))
                ->badge(fn (): int => AttendanceRecord::where('approval_status', AttendanceRecord::APPROVAL_REJECTED)->count()),
        ];
    }
}
