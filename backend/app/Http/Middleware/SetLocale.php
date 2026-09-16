<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    /**
     * Supported application locales.
     *
     * @var array<int, string>
     */
    protected array $supportedLocales = ['ar', 'en'];

    /**
     * Handle an incoming request and set the application locale based on Accept-Language header.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->header('X-Locale')
            ?? $request->getPreferredLanguage($this->supportedLocales)
            ?? config('app.locale', 'ar');

        // Normalize locale (e.g. ar-YE -> ar, en-US -> en)
        $normalized = str_starts_with((string) $locale, 'ar') ? 'ar' : 'en';

        App::setLocale($normalized);

        $response = $next($request);

        // Optionally set Content-Language header on response
        $response->headers->set('Content-Language', $normalized);

        return $response;
    }
}
