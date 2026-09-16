<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            [
                'name' => 'student',
                'label' => json_encode(['en' => 'Student', 'ar' => 'طالب']),
                'description' => 'Applies to training opportunities and tracks own training.',
            ],
            [
                'name' => 'academic_supervisor',
                'label' => json_encode(['en' => 'Academic Supervisor', 'ar' => 'مشرف أكاديمي']),
                'description' => 'Reviews student reports and submits evaluations.',
            ],
            [
                'name' => 'company_representative',
                'label' => json_encode(['en' => 'Company Representative', 'ar' => 'ممثل شركة']),
                'description' => 'Manages a company profile and its published opportunities.',
            ],
            [
                'name' => 'training_coordinator',
                'label' => json_encode(['en' => 'Training Coordinator', 'ar' => 'منسق تدريب']),
                'description' => 'Approves companies, manages cycles, publishes evaluation results.',
            ],
            [
                'name' => 'super_admin',
                'label' => json_encode(['en' => 'Super Admin', 'ar' => 'مدير عام']),
                'description' => 'Full technical/system control, RBAC management, audit access.',
            ],
        ];

        foreach ($roles as $role) {
            DB::table('roles')->updateOrInsert(
                ['name' => $role['name']],
                array_merge($role, ['guard_name' => 'web', 'created_at' => now(), 'updated_at' => now()])
            );
        }
    }
}
