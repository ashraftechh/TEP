<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Password;

class ForgotPasswordController extends Controller
{
    /**
     * Send a password reset link to the given email address.
     *
     * Verifies that the provided email exists in the database before sending
     * the password-reset email. Returns 404 if the account does not exist.
     */
    public function __invoke(ForgotPasswordRequest $request): JsonResponse
    {
        $email = $request->validated('email');

        if (! User::where('email', $email)->exists()) {
            return response()->json([
                'message' => __('auth.email_not_found'),
                'errors' => [
                    'email' => [__('auth.email_not_found')],
                ],
            ], 404);
        }

        Password::sendResetLink(
            $request->only('email')
        );

        return response()->json([
            'message' => __('auth.password_reset_link_sent'),
        ], 200);
    }
}
