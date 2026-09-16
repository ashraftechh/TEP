<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use App\Models\UserRole;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Provides scoped role and permission checking for the User model.
 *
 * Roles are loaded once per request and cached on the model instance
 * to avoid repeated queries when multiple checks happen in the same
 * lifecycle (middleware → controller → policy).
 *
 * Security: these methods query the database (or the request-scoped
 * cache populated from the database). They never trust client input.
 */
trait HasScopedRoles
{
    /**
     * Request-scoped cache of loaded role assignments with nested role.permissions.
     *
     * @var Collection<int, UserRole>|null
     */
    private ?Collection $cachedUserRoles = null;

    /**
     * The user-role assignments for this user.
     *
     * @return HasMany<UserRole, $this>
     */
    public function userRoles(): HasMany
    {
        return $this->hasMany(UserRole::class);
    }

    /**
     * Check whether the user holds a given role, optionally within a specific scope.
     *
     * Scope resolution:
     *  - No scope args → true if the user has ANY assignment for that role name.
     *  - With scope args → true if the user has either a matching scoped assignment
     *    (scope_type + scope_id) OR a global (null-scope) assignment for that role.
     *    A global assignment satisfies any scope check.
     */
    public function hasRole(string $roleName, ?string $scopeType = null, ?int $scopeId = null): bool
    {
        $userRoles = $this->loadScopedRoles();

        return $userRoles->contains(function (UserRole $userRole) use ($roleName, $scopeType, $scopeId): bool {
            if ($userRole->role->name !== $roleName) {
                return false;
            }

            // No scope constraint → any assignment matches.
            if ($scopeType === null) {
                return true;
            }

            // Global (null-scope) assignment satisfies any scope check.
            if ($userRole->scope_type === null) {
                return true;
            }

            // Scoped assignment must match exactly.
            return $userRole->scope_type === $scopeType
                && $userRole->scope_id === $scopeId;
        });
    }

    /**
     * Check whether the user holds a given permission, optionally within a specific scope.
     *
     * Resolves through: user_roles → roles → role_permissions → permissions.
     * Applies the same scope logic as hasRole().
     */
    public function hasPermission(string $permissionName, ?string $scopeType = null, ?int $scopeId = null): bool
    {
        $userRoles = $this->loadScopedRoles();

        return $userRoles->contains(function (UserRole $userRole) use ($permissionName, $scopeType, $scopeId): bool {
            // Apply scope filtering first.
            if ($scopeType !== null) {
                $scopeMatches = $userRole->scope_type === null
                    || ($userRole->scope_type === $scopeType && $userRole->scope_id === $scopeId);

                if (! $scopeMatches) {
                    return false;
                }
            }

            return $userRole->role->permissions->contains('name', $permissionName);
        });
    }

    /**
     * Load the user's role assignments with nested role.permissions,
     * cached for the lifetime of this model instance (one request).
     *
     * If the relationship was already eager-loaded (e.g. by middleware),
     * it uses that data. Otherwise it queries on first access.
     *
     * @return Collection<int, UserRole>
     */
    private function loadScopedRoles(): Collection
    {
        if ($this->cachedUserRoles !== null) {
            return $this->cachedUserRoles;
        }

        // Use eager-loaded data if available, otherwise query now.
        if (! $this->relationLoaded('userRoles')) {
            $this->load('userRoles.role.permissions');
        } elseif ($this->userRoles->isNotEmpty() && ! $this->userRoles->first()->relationLoaded('role')) {
            $this->load('userRoles.role.permissions');
        }

        $this->cachedUserRoles = $this->userRoles;

        return $this->cachedUserRoles;
    }
}
