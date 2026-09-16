<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Auth;

use App\Actions\Auth\SsoCallbackAction;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Response;

class SsoController extends Controller
{
    /**
     * Redirect the browser to the OAuth2 provider's authorization page.
     *
     * This endpoint is used for both Login and Register flows — there is no
     * separate "register via SSO" endpoint. Account type is resolved AFTER
     * authentication succeeds on the /complete-registration screen.
     *
     * The frontend triggers this by navigating to (or opening a popup to):
     *   GET /api/v1/auth/{provider}/redirect
     *
     * @param  'google'|'microsoft'  $provider
     */
    public function redirect(Request $request, string $provider): Response
    {
        return Socialite::driver($provider)->stateless()->redirect();
    }

    /**
     * Handle the OAuth2 callback and log in or provision the user.
     *
     * After Socialite resolves the authenticated social user, delegates all
     * JIT-provisioning / account-linking logic to SsoCallbackAction, which
     * redirects the browser to the appropriate frontend URL:
     *   - status 'incomplete' → /complete-registration
     *   - status 'active'     → /dashboard
     *
     * @param  'google'|'microsoft'  $provider
     */
    public function callback(Request $request, string $provider, SsoCallbackAction $action): RedirectResponse
    {
        $socialiteUser = Socialite::driver($provider)->stateless()->user();

        return $action->execute($provider, $socialiteUser);
    }
}
