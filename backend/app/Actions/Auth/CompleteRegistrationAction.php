<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class CompleteRegistrationAction
{
    public function __construct(
        private readonly RegisterUserAction $registerUserAction
    ) {}

    /**
     * Complete the registration for an authenticated user with status 'incomplete'.
     *
     * @param  array{
     *     account_type: 'student',
     *     major_id: int,
     * }  $data
     */
    public function execute(User $user, array $data): User
    {
        if ($user->status !== 'incomplete') {
            abort(response()->json([
                'message' => __('auth.registration_already_complete'),
                'error_code' => 'registration_already_complete',
            ], 403));
        }

        return DB::transaction(function () use ($user, $data): User {
            $this->registerUserAction->registerStudent($user, (int) $data['major_id']);

            // Transition status from incomplete to active.
            // Do NOT touch email_verified_at (already verified by SSO provider).
            $user->update([
                'status' => 'active',
            ]);

            $user->load([
                'userRoles.role',
                'studentProfile.major',
            ]);

            return $user;
        });
    }
}
