<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = $this->permissionDefinitions();

        foreach (array_keys($permissions) as $name) {
            DB::table('permissions')->updateOrInsert(
                ['name' => $name],
                ['guard_name' => 'web', 'created_at' => now(), 'updated_at' => now()]
            );
        }

        $roleIds = DB::table('roles')->pluck('id', 'name');

        $linked = 0;
        $skippedNoRole = [];

        foreach ($permissions as $permissionName => $roleNames) {
            $permissionId = DB::table('permissions')->where('name', $permissionName)->value('id');

            foreach ($roleNames as $roleName) {
                if (! isset($roleIds[$roleName])) {
                    $skippedNoRole[] = "{$permissionName} -> {$roleName}";

                    continue;
                }

                DB::table('role_permissions')->updateOrInsert(
                    ['role_id' => $roleIds[$roleName], 'permission_id' => $permissionId],
                    ['created_at' => now(), 'updated_at' => now()]
                );
                $linked++;
            }
        }

        if (! empty($skippedNoRole)) {
            // Fails loudly rather than silently seeding an incomplete RBAC
            // state — if RoleSeeder didn't run first, this is exactly the
            // kind of silent gap that caused the original bug.
            throw new \RuntimeException(
                'PermissionSeeder: role(s) referenced but not found — run RoleSeeder first. Missing: '
                    .implode(', ', $skippedNoRole)
            );
        }

        $this->command?->info("Linked {$linked} role-permission assignments across ".count($permissions).' permissions.');
    }

    /**
     * @return array<string, array<string>> permission name => role names that hold it
     */
    private function permissionDefinitions(): array
    {
        return [
            // Identity & RBAC
            'users.view_any' => ['training_coordinator', 'super_admin'],
            'users.view' => ['training_coordinator', 'super_admin'],
            'users.create' => ['super_admin'],
            'users.update' => ['super_admin'],
            'users.suspend' => ['training_coordinator', 'super_admin'],
            'users.reactivate' => ['training_coordinator', 'super_admin'],
            'roles.view_any' => ['super_admin'],
            'roles.view' => ['super_admin'],
            'roles.create' => ['super_admin'],
            'roles.update' => ['super_admin'],
            'roles.delete' => ['super_admin'],
            'permissions.view_any' => ['super_admin'],
            'permissions.view' => ['super_admin'],
            'user_roles.view_any' => ['super_admin'],
            'user_roles.assign' => ['super_admin'],
            'user_roles.revoke' => ['super_admin'],
            'sso_identities.own.view' => ['student', 'academic_supervisor', 'company_representative', 'training_coordinator', 'super_admin'],
            'sso_identities.own.unlink' => ['student', 'academic_supervisor', 'company_representative', 'training_coordinator', 'super_admin'],

            // Academic Hierarchy
            'colleges.view_any' => ['student', 'academic_supervisor', 'company_representative', 'training_coordinator', 'super_admin'],
            'colleges.view' => ['student', 'academic_supervisor', 'company_representative', 'training_coordinator', 'super_admin'],
            'colleges.create' => ['training_coordinator', 'super_admin'],
            'colleges.update' => ['training_coordinator', 'super_admin'],
            'colleges.delete' => ['super_admin'],
            'departments.view_any' => ['student', 'academic_supervisor', 'company_representative', 'training_coordinator', 'super_admin'],
            'departments.view' => ['student', 'academic_supervisor', 'company_representative', 'training_coordinator', 'super_admin'],
            'departments.create' => ['training_coordinator', 'super_admin'],
            'departments.update' => ['training_coordinator', 'super_admin'],
            'departments.delete' => ['super_admin'],
            'majors.view_any' => ['student', 'academic_supervisor', 'company_representative', 'training_coordinator', 'super_admin'],
            'majors.view' => ['student', 'academic_supervisor', 'company_representative', 'training_coordinator', 'super_admin'],
            'majors.create' => ['training_coordinator', 'super_admin'],
            'majors.update' => ['training_coordinator', 'super_admin'],
            'majors.delete' => ['super_admin'],
            'skills.view_any' => ['student', 'academic_supervisor', 'company_representative', 'training_coordinator', 'super_admin'],
            'skills.view' => ['student', 'academic_supervisor', 'company_representative', 'training_coordinator', 'super_admin'],
            'skills.create' => ['training_coordinator', 'super_admin'],
            'skills.update' => ['training_coordinator', 'super_admin'],
            'skills.delete' => ['super_admin'],
            'student_profiles.own.view' => ['student'],
            'student_profiles.own.update' => ['student'],
            'student_profiles.any.view' => ['academic_supervisor', 'training_coordinator', 'super_admin'],
            'academic_supervisor_profiles.own.view' => ['academic_supervisor'],
            'academic_supervisor_profiles.own.update' => ['academic_supervisor'],
            'academic_supervisor_profiles.any.view' => ['training_coordinator', 'super_admin'],
            'training_coordinator_profiles.own.view' => ['training_coordinator'],
            'training_coordinator_profiles.own.update' => ['training_coordinator'],
            'training_coordinator_profiles.any.view' => ['super_admin'],

            // Companies
            'companies.view_any' => ['student', 'company_representative', 'training_coordinator', 'super_admin'],
            'companies.view' => ['student', 'company_representative', 'training_coordinator', 'super_admin'],
            'companies.own.update' => ['company_representative'],
            'companies.approve' => ['training_coordinator'],
            'companies.reject' => ['training_coordinator'],
            'companies.suspend' => ['training_coordinator', 'super_admin'],
            'company_representatives.own.view' => ['company_representative'],
            'company_representatives.own.update' => ['company_representative'],
            'company_representatives.own.invite' => ['company_representative'],
            'company_representatives.own.remove' => ['company_representative'],
            'industries.view_any' => ['student', 'company_representative', 'training_coordinator', 'super_admin'],
            'industries.view' => ['student', 'company_representative', 'training_coordinator', 'super_admin'],
            'industries.create' => ['training_coordinator', 'super_admin'],
            'industries.update' => ['training_coordinator', 'super_admin'],
            'industries.delete' => ['super_admin'],

            // Opportunities
            'opportunities.view_any' => ['student', 'company_representative', 'training_coordinator', 'super_admin'],
            'opportunities.view' => ['student', 'company_representative', 'training_coordinator', 'super_admin'],
            'opportunities.own.create' => ['company_representative'],
            'opportunities.own.update' => ['company_representative'],
            'opportunities.own.publish' => ['company_representative'],
            'opportunities.own.close' => ['company_representative'],
            'opportunities.own.archive' => ['company_representative'],
            'opportunities.any.archive' => ['training_coordinator', 'super_admin'],
            'opportunity_types.view_any' => ['student', 'company_representative', 'training_coordinator', 'super_admin'],
            'opportunity_types.create' => ['training_coordinator', 'super_admin'],
            'opportunity_types.update' => ['training_coordinator', 'super_admin'],
            'opportunity_types.delete' => ['super_admin'],
            'training_cycles.view_any' => ['student', 'company_representative', 'training_coordinator', 'super_admin'],
            'training_cycles.view' => ['student', 'company_representative', 'training_coordinator', 'super_admin'],
            'training_cycles.create' => ['training_coordinator', 'super_admin'],
            'training_cycles.update' => ['training_coordinator', 'super_admin'],
            'training_cycles.delete' => ['super_admin'],

            // Applications & Training
            'applications.own.create' => ['student'],
            'applications.own.view' => ['student'],
            'applications.own.withdraw' => ['student'],
            'applications.company.view' => ['company_representative'],
            'applications.company.review' => ['company_representative'],
            'training_assignments.own.view' => ['student', 'academic_supervisor', 'company_representative'],
            'training_assignments.view_any' => ['training_coordinator', 'super_admin'],
            'training_assignments.create' => ['training_coordinator'],
            'training_assignments.transition' => ['training_coordinator'],
            'attendance_records.record' => ['company_representative'],
            'attendance_records.approve' => ['academic_supervisor', 'training_coordinator'],
            'attendance_records.own.view' => ['student'],
            'attendance_records.view_any' => ['academic_supervisor', 'training_coordinator', 'super_admin'],

            // Reports & Evaluation
            'reports.own.create' => ['student'],
            'reports.own.update' => ['student'],
            'reports.own.submit' => ['student'],
            'reports.own.view' => ['student'],
            'reports.review' => ['academic_supervisor'],
            'report_types.view_any' => ['student', 'academic_supervisor', 'training_coordinator', 'super_admin'],
            'report_types.create' => ['training_coordinator', 'super_admin'],
            'report_types.update' => ['training_coordinator', 'super_admin'],
            'report_types.delete' => ['super_admin'],
            'evaluations.create' => ['academic_supervisor'],
            'evaluations.update' => ['academic_supervisor'],
            'evaluations.submit' => ['academic_supervisor'],
            'evaluations.publish' => ['training_coordinator'],
            'evaluations.own.view' => ['student'],
            'evaluations.view_any' => ['academic_supervisor', 'training_coordinator', 'super_admin'],
            'evaluation_criteria.view_any' => ['student', 'academic_supervisor', 'training_coordinator', 'super_admin'],
            'evaluation_criteria.create' => ['training_coordinator', 'super_admin'],
            'evaluation_criteria.update' => ['training_coordinator', 'super_admin'],
            'evaluation_criteria.delete' => ['super_admin'],

            // Messaging, Files, Notifications (baseline — every real role)
            'conversations.own.view' => ['student', 'academic_supervisor', 'company_representative', 'training_coordinator', 'super_admin'],
            'conversations.own.create' => ['student', 'academic_supervisor', 'company_representative', 'training_coordinator', 'super_admin'],
            'messages.own.view' => ['student', 'academic_supervisor', 'company_representative', 'training_coordinator', 'super_admin'],
            'messages.own.create' => ['student', 'academic_supervisor', 'company_representative', 'training_coordinator', 'super_admin'],
            'files.upload' => ['student', 'academic_supervisor', 'company_representative', 'training_coordinator', 'super_admin'],
            'files.download' => ['student', 'academic_supervisor', 'company_representative', 'training_coordinator', 'super_admin'],
            'notifications.own.view' => ['student', 'academic_supervisor', 'company_representative', 'training_coordinator', 'super_admin'],
            'notifications.own.mark_read' => ['student', 'academic_supervisor', 'company_representative', 'training_coordinator', 'super_admin'],

            // System
            'settings.view_any' => ['training_coordinator', 'super_admin'],
            'settings.update' => ['training_coordinator', 'super_admin'],
            'settings.manage_sso' => ['super_admin'],
            'audit_logs.view_any' => ['super_admin'],
        ];
    }
}
