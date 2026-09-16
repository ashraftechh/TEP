<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Route middleware that enforces permission-based access control.
 *
 * Fixes BUG-004: server-side authorization enforcement instead of
 * relying on UI-level role hiding.
 *
 * Usage examples:
 *   ->middleware('permission:companies.approve')
 *   ->middleware('permission:company.own.manage,company')
 *
 * The optional second parameter is a scope type. When provided, the
 * middleware resolves the scope_id from a route parameter matching
 * that name, then delegates to User::hasPermission() with full
 * scope context.
 */
class EnsurePermission
{
    /**
     * Handle an incoming request.
     *
     * @param  string  $permission  The dotted permission key (e.g. 'companies.approve').
     * @param  string|null  $scopeType  Optional scope dimension (e.g. 'company'). When set,
     *                                  the middleware looks for a route parameter with the
     *                                  same name and uses its ID as the scope_id for the
     *                                  permission check.
     *
     *                                  Route parameter resolution:
     *                                  - If the route uses implicit model binding (e.g. {company}
     *                                    resolves to a Company model), we read ->id from it.
     *                                  - If the parameter is a raw integer (explicit binding or
     *                                    no model binding), we cast it directly.
     *                                  - If the parameter is missing or unresolvable, we fail
     *                                    closed (403) — never fail open.
     */
    public function handle(Request $request, Closure $next, string $permission, ?string $scopeType = null): Response
    {
        $user = $request->user();
        if ($user === null) {
            return response()->json(['message' => __('auth.unauthenticated')], 401);
        }
        // When a scope type is specified, resolve the scope_id from the
        // matching route parameter so the check is resource-specific.
        $scopeId = null;
        if ($scopeType !== null) {
            $scopeId = $this->resolveScopeId($request, $scopeType);
            // Fail closed: if we can't determine the scope_id, deny access
            // rather than falling back to an unscoped (overly broad) check.
            if ($scopeId === null) {
                return $this->forbidden();
            }
        }
        if (! $user->hasPermission($permission, $scopeType, $scopeId)) {
            return $this->forbidden();
        }

        return $next($request);
    }

    /**
     * Resolve the scope_id from a route parameter matching the scope type.
     *
     * Laravel's implicit model binding means the parameter value may already
     * be an Eloquent model instance (e.g. a Company object for {company}).
     * If model binding isn't configured for this parameter, it will be the
     * raw string from the URL segment, which we cast to int.
     */
    private function resolveScopeId(Request $request, string $scopeType): ?int
    {
        $parameter = $request->route($scopeType);
        if ($parameter === null) {
            return null;
        }
        // Implicit model binding: the parameter is already a model instance.
        if (is_object($parameter) && method_exists($parameter, 'getKey')) {
            $key = $parameter->getKey();

            return is_numeric($key) ? (int) $key : null;
        }
        // Raw route parameter (string or int from the URL segment).
        if (is_numeric($parameter)) {
            return (int) $parameter;
        }

        return null;
    }

    /**
     * Return a generic 403 response that never leaks authorization internals.
     */
    private function forbidden(): Response
    {
        return response()->json(['message' => __('auth.unauthorized')], 403);
    }
}
