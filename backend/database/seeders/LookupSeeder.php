<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LookupSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $industries = [
            ['code' => 'tech', 'en' => 'Technology', 'ar' => 'التقنية'],
            ['code' => 'finance', 'en' => 'Finance', 'ar' => 'المالية'],
            ['code' => 'healthcare', 'en' => 'Healthcare', 'ar' => 'الرعاية الصحية'],
            ['code' => 'education', 'en' => 'Education', 'ar' => 'التعليم'],
            ['code' => 'government', 'en' => 'Government', 'ar' => 'حكومي'],
        ];
        foreach ($industries as $row) {
            DB::table('industries')->updateOrInsert(
                ['code' => $row['code']],
                [
                    'name' => json_encode(['en' => $row['en'], 'ar' => $row['ar']]),
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        $opportunityTypes = [
            ['code' => 'cooperative', 'en' => 'Cooperative', 'ar' => 'تعاوني'],
            ['code' => 'summer', 'en' => 'Summer', 'ar' => 'صيفي'],
            ['code' => 'internship', 'en' => 'Internship', 'ar' => 'تدريب'],
        ];
        foreach ($opportunityTypes as $row) {
            DB::table('opportunity_types')->updateOrInsert(
                ['code' => $row['code']],
                [
                    'name' => json_encode(['en' => $row['en'], 'ar' => $row['ar']]),
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }

        $trainingCycles = [
            [
                'academic_year' => '2026/2027',
                'semester' => 'first',
                'name_en' => 'Fall 2026 Training Cycle',
                'name_ar' => 'الدورة التدريبية - خريف 2026',
                'status' => 'active',
            ],
            [
                'academic_year' => '2026/2027',
                'semester' => 'second',
                'name_en' => 'Spring 2027 Training Cycle',
                'name_ar' => 'الدورة التدريبية - ربيع 2027',
                'status' => 'active',
            ],
        ];
        foreach ($trainingCycles as $row) {
            DB::table('training_cycles')->updateOrInsert(
                [
                    'academic_year' => $row['academic_year'],
                    'semester' => $row['semester'],
                ],
                [
                    'name' => json_encode(['en' => $row['name_en'], 'ar' => $row['name_ar']]),
                    'status' => $row['status'],
                    'application_start_at' => now()->subDays(10),
                    'application_end_at' => now()->addDays(30),
                    'end_date' => now()->addMonths(4)->toDateString(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
