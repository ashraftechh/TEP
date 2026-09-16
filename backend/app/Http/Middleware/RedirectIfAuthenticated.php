<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rejects requests from already-authenticated users.
 *
 * On web routes, Laravel's built-in middleware would issue a redirect.
 * This API-specific version returns a JSON 409 Conflict instead, which
 * is the correct response for a stateless JSON API — authenticated users
 * should not be re-registering or re-logging-in.
 */
class RedirectIfAuthenticated
{
    public function handle(Request $request, Closure $next, string ...$guards): Response
    {
        $guards = $guards ?: [null];

        foreach ($guards as $guard) {
            if (Auth::guard($guard)->check()) {
                return response()->json(
                    ['message' => __('auth.already_authenticated')],
                    Response::HTTP_CONFLICT,
                );
            }
        }

        return $next($request);
    }
}
