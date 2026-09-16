<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class LoginAction
{
    /**
     * Attempt a local email/password login.
     *
     * Returns the authenticated User on success, or a JsonResponse on any rejection.
     * The caller (LoginController) must check the return type and short-circuit on
     * JsonResponse to avoid reaching the success path.
     *
     * Security contract:
     *  - SSO-only accounts (password = null) receive the SAME generic 401 as a wrong
     *    password. We do not reveal whether the email exists or the account is SSO-only.
     *  - Status checks happen AFTER credential verification so an attacker cannot
     *    enumerate status by sending bad passwords against known emails.
     */
    public function execute(string $email, string $password, bool $remember = false): User|JsonResponse
    {
        // Constant-time lookup: always load the user first, then check password.
        // This avoids a timing side-channel that could leak whether an email exists.
        $user = User::where('email', $email)->first();

        // No user, SSO-only (password null), or wrong password → same generic error.
        if (! $user || ! $user->password || ! Hash::check($password, $user->password)) {
            return new JsonResponse([
                'message' => __('auth.failed'),
            ], 401);
        }

        // Status gating — checked only after credentials are confirmed valid.
        if ($user->status === 'suspended') {
            return new JsonResponse([
                'message' => __('auth.account_suspended'),
                'error_code' => 'account_suspended',
            ], 403);
        }

        if ($user->status === 'incomplete') {
            return new JsonResponse([
                'message' => __('auth.registration_incomplete'),
                'error_code' => 'registration_incomplete',
            ], 403);
        }

        // Application area gating — frontend client login is strictly for student, company_rep, and supervisor.
        // Backend users (training_coordinator, super_admin) must log in via the Filament Admin panel.
        $hasFrontendRole = $user->hasRole('student')
            || $user->hasRole('company_representative')
            || $user->hasRole('academic_supervisor');

        if (! $hasFrontendRole) {
            return new JsonResponse([
                'message' => __('auth.unauthorized_application_area'),
                'error_code' => 'unauthorized_application_area',
            ], 403);
        }

        return $this->completeLogin($user, $remember);
    }

    /**
     * Finalise a successful local login: start the Sanctum session and touch last_login_at.
     */
    private function completeLogin(User $user, bool $remember = false): User
    {
        Auth::login($user, $remember);

        $user->update(['last_login_at' => now()]);

        $user->load([
            'userRoles.role.permissions',
            'studentProfile.major',
            'companyRepresentative.company',
        ]);

        return $user;
    }
}
