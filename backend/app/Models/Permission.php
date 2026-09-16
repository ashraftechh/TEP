<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Represents a granular permission (e.g. 'companies.approve').
 *
 * Permissions are linked to roles via the role_permissions pivot.
 * Authorization checks resolve through user_roles → roles → permissions.
 */
#[Fillable(['name', 'guard_name', 'description'])]
class Permission extends Model
{
    /**
     * The roles that include this permission.
     *
     * @return BelongsToMany<Role, $this>
     */
    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'role_permissions');
    }
}
