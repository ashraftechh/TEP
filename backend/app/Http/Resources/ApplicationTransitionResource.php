<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ApplicationTransition;
use App\Models\UserRole;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ApplicationTransition
 */
class ApplicationTransitionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * Single source of truth for "what a transition looks like as JSON" —
     * used directly by the dedicated GET /applications/{application}/transitions
     * endpoint (TEP-657) AND internally by ApplicationResource's `transitions`
     * / `latest_transition` fields, so the shape is defined once. `roles` is
     * only populated when the actor's `userRoles` relation was eager-loaded;
     * the mutation endpoints (store/withdraw/accept/reject/scheduleInterview)
     * don't load it, so their embedded transitions simply get `roles: []` at
     * no extra query cost, while the dedicated history endpoint explicitly
     * eager-loads it to show whether a change was the student's own action
     * or the company's.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var ApplicationTransition $transition */
        $transition = $this->resource;

        return [
            'id' => $transition->id,
            'from_status' => $transition->from_status,
            'to_status' => $transition->to_status,
            'reason' => $transition->reason,
            'created_at' => $transition->created_at?->toISOString(),
            'actor' => $transition->relationLoaded('actor') && $transition->actor
                ? [
                    'id' => $transition->actor->id,
                    'name' => $transition->actor->name,
                    'roles' => $transition->actor->relationLoaded('userRoles')
                        ? $transition->actor->userRoles
                            ->map(fn (UserRole $userRole) => $userRole->role?->name)
                            ->filter()
                            ->unique()
                            ->values()
                            ->all()
                        : [],
                ]
                : null,
        ];
    }
}
