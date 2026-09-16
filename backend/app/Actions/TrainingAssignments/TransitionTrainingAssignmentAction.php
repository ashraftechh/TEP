<?php

declare(strict_types=1);

namespace App\Actions\TrainingAssignments;

use App\Exceptions\InvalidTrainingAssignmentTransitionException;
use App\Models\AuditLog;
use App\Models\TrainingAssignment;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * TEP-670 — the single place a training assignment's status is ever
 * changed after creation. Called from BOTH
 * TrainingAssignmentController::transition() (the API surface, if/when the
 * React side ever exposes it — the permission is coordinator-only and
 * there is currently no React screen for it) and TEP-671's Filament row
 * actions on TrainingAssignmentsTable — neither surface duplicates this
 * logic in its own closure, matching TEP-670's explicit instruction and
 * the same shape as Companies/RejectCompanyAction.php.
 */
class TransitionTrainingAssignmentAction
{
    /**
     * Transition a training assignment to a new status.
     *
     * @param  string  $to  One of TrainingAssignment::TRANSITIONS' target statuses.
     * @param  string|null  $reason  Required by the caller when $to is
     *                               'suspended' or 'terminated' — that
     *                               requirement is enforced by the callers
     *                               (TransitionTrainingAssignmentRequest for
     *                               the API, the Filament action's own
     *                               required Textarea for the UI), not
     *                               re-validated here; this action only
     *                               guards the transition itself.
     * @param  int|null  $actorId  Optional explicit actor ID (defaults to $actor->id).
     *
     * @throws InvalidTrainingAssignmentTransitionException If the transition is not valid from the current status.
     */
    public function execute(
        TrainingAssignment $assignment,
        string $to,
        ?string $reason,
        User $actor,
        ?int $actorId = null,
    ): TrainingAssignment {
        return DB::transaction(function () use ($assignment, $to, $reason, $actor, $actorId): TrainingAssignment {
            /** @var TrainingAssignment $locked */
            $locked = TrainingAssignment::query()
                ->whereKey($assignment->id)
                ->lockForUpdate()
                ->firstOrFail();

            // 1. Validate the transition against TEP-669's map — the only
            // source of truth for which pairs are reachable.
            if (! $locked->canTransitionTo($to)) {
                throw InvalidTrainingAssignmentTransitionException::forTransition($locked->status, $to);
            }

            $beforeState = [
                'status' => $locked->status,
                'suspension_reason' => $locked->suspension_reason,
                'termination_reason' => $locked->termination_reason,
                'version' => $locked->version,
            ];

            $trimmedReason = $reason !== null ? trim($reason) : null;

            // 2. Store the reason in the column matching the target status;
            // clear both reason columns first (defensively — a stale
            // suspension_reason left over from a previous suspend->active
            // cycle, for example, should never survive into the new state)
            // and then set only the one the target status actually calls for.
            $attributes = [
                'status' => $to,
                'suspension_reason' => $to === 'suspended' ? $trimmedReason : null,
                'termination_reason' => $to === 'terminated' ? $trimmedReason : null,
                // 3. Bump version (optimistic-concurrency counter, same
                // convention as Opportunity/Application status writes).
                'version' => $locked->version + 1,
            ];

            $locked->update($attributes);

            AuditLog::create([
                'actor_id' => $actorId ?? $actor->id,
                'action' => 'training_assignments.transition',
                'entity_type' => 'training_assignments',
                'entity_id' => $locked->id,
                'before_state' => $beforeState,
                'after_state' => [
                    'status' => $attributes['status'],
                    'suspension_reason' => $attributes['suspension_reason'],
                    'termination_reason' => $attributes['termination_reason'],
                    'version' => $attributes['version'],
                ],
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);

            return $locked->fresh();
        });
    }
}
