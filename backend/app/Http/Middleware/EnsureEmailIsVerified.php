<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailIsVerified
{
    /**
     * Handle an incoming request.
     *
     * Ensures the authenticated user has verified their email and holds an active account.
     * If the account is pending/unverified, returns a 403 with error_code 'email_not_verified'.
     * If the account is suspended, returns a 403 with error_code 'account_suspended'.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        if ($user->status === 'incomplete') {
            return new JsonResponse([
                'message' => __('auth.registration_incomplete'),
                'error_code' => 'registration_incomplete',
            ], 403);
        }

        if ($user->status === 'suspended') {
            return new JsonResponse([
                'message' => __('auth.account_suspended'),
                'error_code' => 'account_suspended',
            ], 403);
        }

        if ($user instanceof MustVerifyEmail && (! $user->hasVerifiedEmail() || $user->status === 'pending')) {
            return new JsonResponse([
                'message' => __('auth.email_not_verified'),
                'error_code' => 'email_not_verified',
            ], 403);
        }

        return $next($request);
    }
}
