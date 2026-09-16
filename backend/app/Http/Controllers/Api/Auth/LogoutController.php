<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;

class LogoutController extends Controller
{
    /**
     * Log the user out of the application and invalidate the server-side session.
     *
     * In Laravel Sanctum stateful SPA authentication (SESSION_DRIVER=database),
     * executing Auth::guard('web')->logout() followed by session()->invalidate()
     * and session()->regenerateToken() guarantees that the active session row
     * is completely deleted from the `sessions` table, preventing reuse.
     *
     * If a Personal Access Token was used (bearer token), it is deleted.
     */
    public function __invoke(Request $request): Response
    {
        // 1. If a real bearer token (PersonalAccessToken) is used, revoke it.
        //    Guard against TransientToken — Sanctum's placeholder for session-based SPA auth —
        //    which has no delete() method and no id property.
        $token = $request->user()?->currentAccessToken();
        if ($token instanceof PersonalAccessToken) {
            $token->delete();
        }

        // 2. Invalidate web session & guard
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->noContent();
    }
}
