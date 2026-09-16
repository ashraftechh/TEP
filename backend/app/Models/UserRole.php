<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A scoped role assignment linking a user to a role.
 *
 * When scope_type and scope_id are NULL the assignment is global
 * (e.g. super_admin). When populated the role is limited to a
 * specific resource (e.g. company_representative for company #5).
 */
#[Fillable(['user_id', 'role_id', 'scope_type', 'scope_id', 'assigned_by', 'assigned_at'])]
class UserRole extends Model
{
    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'scope_id' => 'integer',
            'assigned_at' => 'datetime',
        ];
    }

    /**
     * The user this role assignment belongs to.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The role being assigned.
     *
     * @return BelongsTo<Role, $this>
     */
    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * The admin/coordinator who created this assignment.
     *
     * @return BelongsTo<User, $this>
     */
    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
