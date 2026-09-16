<?php

declare(strict_types=1);

namespace App\Actions\TrainingAssignments;

use App\Actions\Applications\RecordApplicationTransitionAction;
use App\Exceptions\DuplicateTrainingAssignmentException;
use App\Exceptions\StudentAlreadyAssignedException;
use App\Models\Application;
use App\Models\Opportunity;
use App\Models\TrainingAssignment;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * TEP-661 — formalises an `accepted` application into a `training_assignments`
 * row. Called from TrainingAssignmentController::store() after the
 * application's `accepted` status has already been checked there (matching
 * ApplicationController::accept()'s pattern of a controller-level status
 * guard before the transactional write).
 */
class CreateTrainingAssignmentAction
{
    /**
     * Create the training assignment.
     *
     * @param  array{academic_supervisor_id?: int|null, field_supervisor_id?: int|null, start_date?: string|null, end_date?: string|null, required_reports_count?: int|null, report_configuration?: array<string, mixed>|null}  $data
     *
     * @throws DuplicateTrainingAssignmentException If an assignment already exists for this application.
     * @throws StudentAlreadyAssignedException If the student already has an active or suspended assignment.
     */
    public function execute(Application $application, array $data, User $coordinator): TrainingAssignment
    {
        return DB::transaction(function () use ($application, $data, $coordinator): TrainingAssignment {
            // Lock the application row for the duration of the check +
            // create so two concurrent requests for the same application
            // can't both pass the duplicate check before either commits.
            $locked = Application::with('opportunity')
                ->whereKey($application->id)
                ->lockForUpdate()
                ->firstOrFail();

            // Reject if a training_assignments row already exists for this application.
            $exists = TrainingAssignment::where('application_id', $locked->id)->exists();

            if ($exists) {
                throw DuplicateTrainingAssignmentException::forApplication($locked->id);
            }

            // Reject if the student already holds an active or suspended training assignment.
            $hasActiveAssignment = TrainingAssignment::where('student_profile_id', $locked->student_profile_id)
                ->whereIn('status', ['active', 'suspended'])
                ->exists();

            if ($hasActiveAssignment) {
                throw StudentAlreadyAssignedException::forStudent($locked->student_profile_id);
            }

            $reportConfig = $data['report_configuration'] ?? null;
            $requiredReportsCount = $data['required_reports_count'] ?? null;

            if ($requiredReportsCount === null && is_array($reportConfig)) {
                $sum = 0;
                foreach ($reportConfig as $typeConfig) {
                    if (is_array($typeConfig) && ! empty($typeConfig['enabled']) && isset($typeConfig['max_count'])) {
                        $sum += (int) $typeConfig['max_count'];
                    }
                }
                if ($sum > 0) {
                    $requiredReportsCount = $sum;
                }
            }

            $assignment = TrainingAssignment::create([
                'application_id' => $locked->id,
                'student_profile_id' => $locked->student_profile_id,
                'company_id' => $locked->opportunity->company_id,
                'opportunity_id' => $locked->opportunity_id,
                'academic_supervisor_id' => $data['academic_supervisor_id'] ?? null,
                'field_supervisor_id' => $data['field_supervisor_id'] ?? null,
                'training_coordinator_id' => $coordinator->id,
                'status' => TrainingAssignment::STATUSES[0], // 'active'
                'start_date' => $data['start_date'] ?? null,
                'end_date' => $data['end_date'] ?? null,
                'progress_percentage' => 0,
                'required_reports_count' => $requiredReportsCount,
                'report_configuration' => $reportConfig,
                'version' => 1,
            ]);

            // Auto-resolve any other accepted or pending applications for this student.
            $otherApplications = Application::where('student_profile_id', $locked->student_profile_id)
                ->where('id', '!=', $locked->id)
                ->whereIn('status', ['accepted', ...Application::ACTIVE_STATUSES])
                ->get();

            foreach ($otherApplications as $otherApp) {
                // If the other application was accepted, release its reserved seat on that opportunity.
                if ($otherApp->status === 'accepted') {
                    Opportunity::whereKey($otherApp->opportunity_id)
                        ->where('accepted_count', '>', 0)
                        ->decrement('accepted_count');
                }

                app(RecordApplicationTransitionAction::class)->execute(
                    application: $otherApp,
                    toStatus: 'withdrawn',
                    actor: $coordinator,
                    reason: __('applications.withdrawn_due_to_other_assignment'),
                );
            }

            return $assignment;
        });
    }
}
