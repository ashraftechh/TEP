<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * TEP-661 — seeds the three report type codes named in TEP-660's schema
 * block, matching the glossary ('weekly', 'monthly', 'final'). Same
 * updateOrInsert-by-code shape as LookupSeeder's industries/opportunity_types.
 */
class ReportTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $reportTypes = [
            ['code' => 'daily', 'en' => 'Daily Report', 'ar' => 'تقرير يومي'],
            ['code' => 'weekly', 'en' => 'Weekly Report', 'ar' => 'تقرير أسبوعي'],
            ['code' => 'monthly', 'en' => 'Monthly Report', 'ar' => 'تقرير شهري'],
            ['code' => 'final', 'en' => 'Final Report', 'ar' => 'التقرير النهائي'],
        ];

        foreach ($reportTypes as $row) {
            DB::table('report_types')->updateOrInsert(
                ['code' => $row['code']],
                [
                    'name' => json_encode(['en' => $row['en'], 'ar' => $row['ar']]),
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
