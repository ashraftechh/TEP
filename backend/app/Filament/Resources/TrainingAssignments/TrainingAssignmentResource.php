<?php

declare(strict_types=1);

namespace App\Filament\Resources\TrainingAssignments;

use App\Filament\Resources\TrainingAssignments\Pages\CreateTrainingAssignment;
use App\Filament\Resources\TrainingAssignments\Pages\EditTrainingAssignment;
use App\Filament\Resources\TrainingAssignments\Pages\ListTrainingAssignments;
use App\Filament\Resources\TrainingAssignments\Schemas\TrainingAssignmentForm;
use App\Filament\Resources\TrainingAssignments\Schemas\TrainingAssignmentInfolist;
use App\Filament\Resources\TrainingAssignments\Tables\TrainingAssignmentsTable;
use App\Models\TrainingAssignment;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Facades\Auth;

class TrainingAssignmentResource extends Resource
{
    protected static ?string $model = TrainingAssignment::class;

    protected static string|\BackedEnum|null $navigationIcon = 'heroicon-o-briefcase';

    protected static ?int $navigationSort = 1;

    public static function getNavigationLabel(): string
    {
        return __('training_assignments.resource.title');
    }

    public static function getPluralModelLabel(): string
    {
        return __('training_assignments.resource.title');
    }

    public static function getModelLabel(): string
    {
        return __('training_assignments.resource.singular');
    }

    public static function getNavigationGroup(): ?string
    {
        return __('training_assignments.resource.navigation_group');
    }

    public static function canViewAny(): bool
    {
        $user = Auth::user();

        if (! $user) {
            return false;
        }

        return $user->hasPermission('training_assignments.view_any')
            || $user->hasRole('training_coordinator')
            || $user->hasRole('super_admin');
    }

    public static function canCreate(): bool
    {
        $user = Auth::user();

        return $user !== null && (
            $user->hasPermission('training_assignments.create')
            || $user->hasRole('training_coordinator')
            || $user->hasRole('super_admin')
        );
    }

    public static function canEdit(Model $record): bool
    {
        $user = Auth::user();

        return $user !== null && (
            $user->hasPermission('training_assignments.create')
            || $user->hasRole('training_coordinator')
            || $user->hasRole('super_admin')
        );
    }

    public static function canView(Model $record): bool
    {
        $user = Auth::user();

        return $user !== null && (
            $user->hasPermission('training_assignments.view_any')
            || $user->hasRole('training_coordinator')
            || $user->hasRole('super_admin')
        );
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->withoutGlobalScopes([
                SoftDeletingScope::class,
            ])
            ->with([
                'studentProfile.user',
                'studentProfile.major',
                'company',
                'opportunity',
                'academicSupervisor',
                'fieldSupervisor',
                'trainingCoordinator',
            ])
            ->latest('created_at');
    }

    public static function form(Schema $schema): Schema
    {
        return TrainingAssignmentForm::configure($schema);
    }

    public static function infolist(Schema $schema): Schema
    {
        return TrainingAssignmentInfolist::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return TrainingAssignmentsTable::configure($table);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListTrainingAssignments::route('/'),
            'create' => CreateTrainingAssignment::route('/create'),
            'edit' => EditTrainingAssignment::route('/{record}/edit'),
        ];
    }
}
