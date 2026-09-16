<?php

declare(strict_types=1);

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use SocialiteProviders\Manager\SocialiteWasCalled;
use SocialiteProviders\Microsoft\Provider as MicrosoftProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Configure centralized strong password validation rules.
        Password::defaults(function () {
            return Password::min(8)
                ->letters()
                ->mixedCase()
                ->numbers()
                ->symbols();
        });

        // Configure the password reset notification URL to point to the frontend SPA.
        ResetPassword::createUrlUsing(function (object $notifiable, string $token): string {
            $frontendBase = rtrim(config('app.frontend_url', 'http://localhost:5173'), '/');

            return $frontendBase.'/reset-password?'.http_build_query([
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ]);
        });

        // Register the Microsoft Socialite driver.
        // Google is a native Socialite driver and does not need this.
        // Without this listener, Socialite::driver('microsoft') throws a
        // driver-not-found exception.
        Event::listen(function (SocialiteWasCalled $event): void {
            $event->extendSocialite('microsoft', MicrosoftProvider::class);
        });
    }
}
