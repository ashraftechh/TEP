<?php

declare(strict_types=1);

namespace App\Rules;

use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * TEP-661 — validates that a `users.id` value belongs to a user who actually
 * holds the given role, since `exists:users,id` alone only confirms the row
 * exists, not that the user is eligible for the position they're being
 * assigned to (e.g. an `academic_supervisor_id` that points at a student).
 *
 * Silently passes when the id itself doesn't resolve to a user — the
 * `exists:users,id` rule already covers that case and reports it on its own;
 * duplicating the "not found" message here would be confusing.
 */
class UserHasRole implements ValidationRule
{
    public function __construct(private readonly string $role) {}

    /**
     * Run the validation rule.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_numeric($value)) {
            return;
        }

        $user = User::find((int) $value);

        if ($user === null) {
            return;
        }

        if (! $user->hasRole($this->role)) {
            $fail(__('training_assignments.validation.user_missing_role', [
                'role' => $this->role,
            ]));
        }
    }
}
