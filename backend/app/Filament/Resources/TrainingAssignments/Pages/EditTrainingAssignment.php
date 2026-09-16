<?php

declare(strict_types=1);

namespace App\Filament\Resources\TrainingAssignments\Pages;

use App\Filament\Resources\TrainingAssignments\TrainingAssignmentResource;
use App\Models\TrainingAssignment;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;

class EditTrainingAssignment extends EditRecord
{
    protected static string $resource = TrainingAssignmentResource::class;

    public function getTitle(): string
    {
        return __('training_assignments.actions.edit.modal_heading');
    }

    /**
     * Populate virtual form fields from report_configuration JSON column.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function mutateFormDataBeforeFill(array $data): array
    {
        /** @var TrainingAssignment $record */
        $record = $this->record;
        $reportConfig = $record->report_configuration ?? [];

        $data['daily_enabled'] = (bool) ($reportConfig['daily']['enabled'] ?? false);
        $data['daily_count'] = isset($reportConfig['daily']['max_count']) ? (int) $reportConfig['daily']['max_count'] : 0;

        $data['weekly_enabled'] = (bool) ($reportConfig['weekly']['enabled'] ?? false);
        $data['weekly_count'] = isset($reportConfig['weekly']['max_count']) ? (int) $reportConfig['weekly']['max_count'] : 0;

        $data['monthly_enabled'] = (bool) ($reportConfig['monthly']['enabled'] ?? false);
        $data['monthly_count'] = isset($reportConfig['monthly']['max_count']) ? (int) $reportConfig['monthly']['max_count'] : 0;

        $data['final_enabled'] = (bool) ($reportConfig['final']['enabled'] ?? true);

        return $data;
    }

    /**
     * Transform form data back into attributes for saving.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    protected function mutateFormDataBeforeSave(array $data): array
    {
        $reportConfig = [
            'daily' => [
                'enabled' => (bool) ($data['daily_enabled'] ?? false),
                'max_count' => (bool) ($data['daily_enabled'] ?? false) ? (int) ($data['daily_count'] ?? 0) : 0,
            ],
            'weekly' => [
                'enabled' => (bool) ($data['weekly_enabled'] ?? false),
                'max_count' => (bool) ($data['weekly_enabled'] ?? false) ? (int) ($data['weekly_count'] ?? 0) : 0,
            ],
            'monthly' => [
                'enabled' => (bool) ($data['monthly_enabled'] ?? false),
                'max_count' => (bool) ($data['monthly_enabled'] ?? false) ? (int) ($data['monthly_count'] ?? 0) : 0,
            ],
            'final' => [
                'enabled' => (bool) ($data['final_enabled'] ?? true),
                'max_count' => (bool) ($data['final_enabled'] ?? true) ? 1 : 0,
            ],
        ];

        $data['report_configuration'] = $reportConfig;
        $data['version'] = ((int) ($this->record->version ?? 1)) + 1;

        unset(
            $data['daily_enabled'],
            $data['daily_count'],
            $data['weekly_enabled'],
            $data['weekly_count'],
            $data['monthly_enabled'],
            $data['monthly_count'],
            $data['final_enabled'],
        );

        return $data;
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }

    protected function getSavedNotification(): ?Notification
    {
        return Notification::make()
            ->title(__('training_assignments.updated_successfully'))
            ->success();
    }

    protected function getHeaderActions(): array
    {
        return [];
    }
}
