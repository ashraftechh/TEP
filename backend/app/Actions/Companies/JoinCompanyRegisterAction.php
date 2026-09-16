<?php

declare(strict_types=1);

namespace App\Actions\Companies;

use App\Models\Company;
use App\Models\CompanyRepresentative;
use App\Models\Role;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class JoinCompanyRegisterAction
{
    /**
     * Register a new user as a representative of the company.
     *
     * The account is created with status='pending' and email_verified_at=null
     * exactly like a student registration. The Registered event dispatches
     * the bilingual email-verification notification inside the DB transaction,
     * so a mail-server failure rolls back the account creation.
     *
     * @param  array{
     *     name: string,
     *     email?: string,
     *     phone?: string|null,
     *     password: string,
     * }  $data
     */
    public function execute(Company $company, string $email, array $data): User
    {
        $userEmail = $data['email'] ?? $email;

        $user = DB::transaction(function () use ($company, $userEmail, $data): User {
            $user = User::create([
                'name' => $data['name'],
                'email' => $userEmail,
                'phone' => $data['phone'] ?? null,
                'password' => Hash::make($data['password']),
                'status' => 'pending',
                'email_verified_at' => null,
            ]);

            $isPrimary = $company->representatives()->doesntExist();

            CompanyRepresentative::create([
                'company_id' => $company->id,
                'user_id' => $user->id,
                'is_primary' => $isPrimary,
            ]);

            $role = Role::where('name', 'company_representative')->firstOrFail();

            UserRole::create([
                'user_id' => $user->id,
                'role_id' => $role->id,
                'scope_type' => 'company',
                'scope_id' => $company->id,
                'assigned_by' => null,
                'assigned_at' => now(),
            ]);

            event(new Registered($user));

            $user->load([
                'userRoles.role',
                'companyRepresentative.company',
            ]);

            return $user;
        });

        return $user;
    }
}
