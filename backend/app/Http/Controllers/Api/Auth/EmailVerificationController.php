<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\JsonResponse;

class EmailVerificationController extends Controller
{
    /**
     * Handle an email verification request from a signed URL.
     *
     * Uses Laravel's built-in EmailVerificationRequest to validate:
     *   - The {id} matches the authenticated user.
     *   - The {hash} matches the user's email.
     *   - The URL signature has not expired or been tampered with.
     *
     * On success: marks the email as verified and transitions the user
     * status from 'pending' to 'active', enabling login (TEP-560/561).
     *
     * @throws AuthorizationException if the request is invalid or the
     *                                signature is expired/tampered.
     */
    public function verify(EmailVerificationRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();

            // Dispatch the auth Verified event (not fired automatically by
            // markEmailAsVerified — that only fires the Eloquent model event).
            event(new Verified($user));

            // Transition status from pending → active upon successful verification.
            // This is the exact moment a locally-registered user becomes able to log in.
            if ($user->status === 'pending') {
                $user->update(['status' => 'active']);
            }
        }

        $freshUser = $user->fresh();
        $freshUser->load([
            'userRoles.role.permissions',
            'studentProfile.major',
            'studentProfile.cvFile',
            'companyRepresentative.company',
        ]);

        return (new UserResource($freshUser))
            ->additional([
                'message' => __('auth.email_verified'),
            ])
            ->response()
            ->setStatusCode(200);
    }
}
