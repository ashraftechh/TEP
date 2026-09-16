<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Auth;

use App\Actions\Auth\LoginAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoginController extends Controller
{
    /**
     * Handle an incoming local email/password login request.
     *
     * The Sanctum stateful-API two-step flow:
     *  1. Frontend calls GET /sanctum/csrf-cookie to prime the CSRF cookie.
     *  2. Frontend calls POST /api/v1/auth/login with the XSRF-TOKEN header set.
     *
     * On success, Sanctum sets a session cookie — no token is issued or returned.
     * The frontend must include credentials (withCredentials: true) on all subsequent
     * requests so the session cookie is sent.
     *
     * Rate limiting: configured on the route (throttle:5,1 — 5 attempts per minute
     * per unique fingerprint, combining IP + email from the request body via the
     * custom throttle key defined on the route).
     */
    public function login(LoginRequest $request, LoginAction $action): JsonResponse
    {
        $result = $action->execute(
            email: $request->string('email')->toString(),
            password: $request->string('password')->toString(),
            remember: $request->boolean('remember'),
        );

        // LoginAction returns JsonResponse for any rejection, User on success.
        if ($result instanceof JsonResponse) {
            return $result;
        }

        /** @var User $result */
        return (new UserResource($result))
            ->additional(['message' => __('auth.login_success')])
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Get the authenticated user's profile and roles.
     */
    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $user->load([
            'userRoles.role.permissions',
            'studentProfile.major',
            'studentProfile.cvFile',
            'companyRepresentative.company',
        ]);

        return (new UserResource($user))
            ->response()
            ->setStatusCode(200);
    }
}
