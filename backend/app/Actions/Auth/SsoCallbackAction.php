<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Models\SsoIdentity;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Symfony\Component\HttpFoundation\RedirectResponse;

class SsoCallbackAction
{
    /**
     * Handle a successful OAuth2 callback from Google or Microsoft.
     *
     * Resolution order (by provider_subject_id, never by email):
     *  1. Existing sso_identities row → log in the linked user.
     *  2. No SSO row but matching users.email → link a new sso_identities row, log in.
     *  3. No match at all → JIT-provision a minimal users + sso_identities row (no role, no profile).
     *
     * After login, redirect the browser to the frontend:
     *  - status 'incomplete' → /complete-registration
     *  - otherwise          → /dashboard
     *
     * @param  'google'|'microsoft'  $provider
     */
    public function execute(string $provider, SocialiteUser $socialiteUser): RedirectResponse
    {
        $user = $this->resolveUser($provider, $socialiteUser);

        $user->update(['last_login_at' => now()]);

        Auth::login($user);

        $frontendBase = rtrim(Config::string('app.frontend_url', 'http://localhost:5173'), '/');

        return new RedirectResponse($frontendBase.'/oauth/callback');
    }

    /**
     * Find or create the local User for this SSO identity.
     *
     * @param  'google'|'microsoft'  $provider
     */
    private function resolveUser(string $provider, SocialiteUser $socialiteUser): User
    {
        // 1. Look up by stable provider subject ID — never by email.
        $identity = SsoIdentity::where('provider', $provider)
            ->where('provider_subject_id', $socialiteUser->getId())
            ->first();

        if ($identity) {
            return $identity->user;
        }

        // 2. Existing local user with the same email? Link a new SSO identity row.
        $providerEmail = (string) $socialiteUser->getEmail();
        $existingUser = User::where('email', $providerEmail)->first();

        if ($existingUser) {
            SsoIdentity::create([
                'user_id' => $existingUser->id,
                'provider' => $provider,
                'provider_subject_id' => $socialiteUser->getId(),
                'provider_email' => $providerEmail,
            ]);

            return $existingUser;
        }

        // 3. No match at all → JIT-provision.
        // Deliberately minimal: no role, no profile — the user must complete
        // registration via the /complete-registration screen (separate ticket).
        $newUser = User::create([
            'name' => (string) $socialiteUser->getName(),
            'email' => $providerEmail,
            'password' => null,                  // SSO-only; local login will fail gracefully.
            'status' => 'incomplete',
            'email_verified_at' => now(),        // Provider already verified the email.
        ]);

        SsoIdentity::create([
            'user_id' => $newUser->id,
            'provider' => $provider,
            'provider_subject_id' => $socialiteUser->getId(),
            'provider_email' => $providerEmail,
        ]);

        return $newUser;
    }
}
