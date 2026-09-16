<?php

declare(strict_types=1);

namespace App\Actions\Auth;

use App\Models\Role;
use App\Models\StudentProfile;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Auth\Events\Registered;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class RegisterUserAction
{
    /**
     * Register a new student user account.
     *
     * @param  array{
     *     name: string,
     *     email: string,
     *     phone?: string|null,
     *     password: string,
     *     account_type: 'student',
     *     major_id: int,
     * }  $data
     */
    public function execute(array $data): User
    {
        return DB::transaction(function () use ($data): User {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'phone' => $data['phone'] ?? null,
                'password' => Hash::make($data['password']),
                'status' => 'pending',
                'email_verified_at' => null,
            ]);

            $this->registerStudent($user, (int) $data['major_id']);

            event(new Registered($user));

            $user->load([
                'userRoles.role',
                'studentProfile.major',
            ]);

            return $user;
        });
    }

    /**
     * Create the student profile and assign the global student role.
     */
    public function registerStudent(User $user, int $majorId): void
    {
        // TBD: Real university ID-issuance system integration is an open question.
        // For now, generate a placeholder unique student number: STU-{year}-{random 6 digits}.
        $studentNumber = $this->generateUniqueStudentNumber();

        StudentProfile::create([
            'user_id' => $user->id,
            'student_number' => $studentNumber,
            'major_id' => $majorId,
        ]);

        $role = Role::where('name', 'student')->firstOrFail();

        UserRole::create([
            'user_id' => $user->id,
            'role_id' => $role->id,
            'scope_type' => null,
            'scope_id' => null,
            'assigned_by' => null,
            'assigned_at' => now(),
        ]);
    }

    /**
     * Generate a unique placeholder student number.
     *
     * Format: STU-{year}-{6 random digits}
     */
    public function generateUniqueStudentNumber(): string
    {
        $year = now()->format('Y');

        do {
            $studentNumber = sprintf('STU-%s-%06d', $year, random_int(1, 999999));
        } while (StudentProfile::where('student_number', $studentNumber)->exists());

        return $studentNumber;
    }
}
