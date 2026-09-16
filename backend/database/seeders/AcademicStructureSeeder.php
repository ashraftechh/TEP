<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AcademicStructureSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $collegeId = DB::table('colleges')->updateOrInsert(
            ['code' => 'cci'],
            [
                'name' => json_encode(['en' => 'College of Computer and Information Systems', 'ar' => 'كلية الحاسب الآلي ونظم المعلومات']),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $collegeId = DB::table('colleges')->where('code', 'cci')->value('id');

        DB::table('departments')->updateOrInsert(
            ['code' => 'cs_dept'],
            [
                'college_id' => $collegeId,
                'name' => json_encode(['en' => 'Computer Science Department', 'ar' => 'قسم علوم الحاسوب']),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
        $departmentId = DB::table('departments')->where('code', 'cs_dept')->value('id');

        $majors = [
            ['code' => 'cs', 'en' => 'Computer Science', 'ar' => 'علوم حاسوب'],
            ['code' => 'it', 'en' => 'Information Technology', 'ar' => 'تقنية المعلومات'],
            ['code' => 'is', 'en' => 'Information Systems', 'ar' => 'نظم المعلومات'],
            ['code' => 'se', 'en' => 'Software Engineering', 'ar' => 'هندسة برمجيات'],
        ];

        foreach ($majors as $major) {
            DB::table('majors')->updateOrInsert(
                ['code' => $major['code']],
                [
                    'department_id' => $departmentId,
                    'name' => json_encode(['en' => $major['en'], 'ar' => $major['ar']]),
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
