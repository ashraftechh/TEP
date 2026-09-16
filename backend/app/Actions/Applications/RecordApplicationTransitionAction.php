<?php

declare(strict_types=1);

namespace App\Actions\Applications;

use App\Models\Application;
use App\Models\ApplicationTransition;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Shared action to transition an Application's status and record an append-only
 * transition log in the `application_transitions` table.
 *
 * All status modifications across the entire application domain MUST pass through
 * this action inside a single database transaction.
 */
class RecordApplicationTransitionAction
{
    /**
     * Transition application status, increment optimistic concurrency version,
     * and write an application_transitions audit record.
     *
     * @param  Application  $application  The application instance being transitioned.
     * @param  string  $toStatus  The new application status.
     * @param  User  $actor  The user performing the transition.
     * @param  string|null  $reason  Optional reason for the status change (e.g. rejection or withdrawal reason).
     * @param  string|null  $fromStatus  Optional explicit previous status (defaults to current application status; null on initial creation).
     * @return Application The refreshed Application instance.
     */
    public function execute(
        Application $application,
        string $toStatus,
        User $actor,
        ?string $reason = null,
        ?string $fromStatus = null,
        bool $isInitial = false
    ): Application {
        return DB::transaction(function () use ($application, $toStatus, $actor, $reason, $fromStatus, $isInitial) {
            // Determine the from_status.
            // On initial application submission ($isInitial = true), from_status is null.
            $effectiveFromStatus = $isInitial
                ? null
                : ($fromStatus ?? $application->getOriginal('status', $application->status));

            // Update application status and increment optimistic locking version
            $application->status = $toStatus;
            $application->version = ($application->version ?? 0) + 1;

            if ($toStatus === 'rejected' && $reason !== null) {
                $application->decision_reason = $reason;
            } elseif ($toStatus === 'withdrawn' && $reason !== null) {
                $application->withdrawn_reason = $reason;
            }

            $application->save();

            // Insert append-only transition record
            ApplicationTransition::create([
                'application_id' => $application->id,
                'actor_id' => $actor->id,
                'from_status' => $effectiveFromStatus,
                'to_status' => $toStatus,
                'reason' => $reason,
            ]);

            return $application->fresh([
                'opportunity.company',
                'studentProfile.user',
                'cvFile',
                'transitions.actor',
            ]);
        });
    }
}
