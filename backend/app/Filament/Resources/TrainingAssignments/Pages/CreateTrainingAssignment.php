<?php

declare(strict_types=1);

namespace App\Filament\Resources\TrainingAssignments\Pages;

use App\Actions\TrainingAssignments\CreateTrainingAssignmentAction;
use App\Exceptions\DuplicateTrainingAssignmentException;
use App\Exceptions\StudentAlreadyAssignedException;
use App\Filament\Resources\TrainingAssignments\TrainingAssignmentResource;
use App\Models\Application;
use App\Models\TrainingAssignment;
use App\Models\User;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;

/**
 * TEP-662 — routes the Filament create form through the SAME
 * CreateTrainingAssignmentAction the API endpoint uses (TEP-661), rather
 * than Filament's default `static::getModel()::create($data)`. This keeps
 * the "accepted-only" and "no duplicate assignment" business rules defined
 * in exactly one place — the form's own options already steer the
 * coordinator away from invalid choices, but this is the same defense-in-
 * depth re-check the API applies, guarding against a stale form submission.
 */
class CreateTrainingAssignment extends CreateRecord
{
    protected static string $resource = TrainingAssignmentResource::class;

    /**
     * @param  array<string, mixed>  $data
     */
    protected function handleRecordCreation(array $data): Model
    {
        /** @var User $coordinator */
        $coordinator = Auth::user();

        /** @var Application $application */
        $application = Application::with('opportunity')->findOrFail($data['application_id']);

        if ($application->status !== 'accepted') {
            Notification::make()
                ->title(__('training_assignments.cannot_create_from_status'))
                ->danger()
                ->send();

            $this->halt();
        }

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

        try {
            return app(CreateTrainingAssignmentAction::class)->execute(
                application: $application,
                data: [
                    'academic_supervisor_id' => isset($data['academic_supervisor_id']) ? (int) $data['academic_supervisor_id'] : null,
                    'field_supervisor_id' => isset($data['field_supervisor_id']) ? (int) $data['field_supervisor_id'] : null,
                    'start_date' => isset($data['start_date']) ? (string) $data['start_date'] : null,
                    'end_date' => isset($data['end_date']) ? (string) $data['end_date'] : null,
                    'required_reports_count' => isset($data['required_reports_count']) ? (int) $data['required_reports_count'] : null,
                    'report_configuration' => $reportConfig,
                ],
                coordinator: $coordinator,
            );
        } catch (DuplicateTrainingAssignmentException $e) {
            Notification::make()
                ->title(__('training_assignments.already_exists'))
                ->danger()
                ->send();

            $this->halt();
        } catch (StudentAlreadyAssignedException $e) {
            Notification::make()
                ->title(__('training_assignments.student_already_assigned'))
                ->danger()
                ->send();

            $this->halt();
        }

        // Unreachable — $this->halt() above stops execution — but keeps the
        // method's declared return type honest for static analysis.
        return new TrainingAssignment;
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}
