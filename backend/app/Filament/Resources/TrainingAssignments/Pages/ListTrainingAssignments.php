<?php

declare(strict_types=1);

namespace App\Filament\Resources\TrainingAssignments\Pages;

use App\Filament\Resources\TrainingAssignments\TrainingAssignmentResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListTrainingAssignments extends ListRecords
{
    protected static string $resource = TrainingAssignmentResource::class;

    public function getTitle(): string
    {
        return __('training_assignments.resource.title');
    }

    /**
     * Get the header actions available on the list page.
     *
     * @return array<int, mixed>
     */
    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make()
                ->label(__('training_assignments.actions.create')),
        ];
    }
}
