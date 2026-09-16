<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EvaluationCriteriaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $criteria = [
            ['code' => 'technical', 'en' => 'Technical Skills', 'ar' => 'المهارات التقنية', 'weight' => 16.67, 'sort' => 1],
            ['code' => 'communication', 'en' => 'Communication', 'ar' => 'مهارات التواصل', 'weight' => 16.67, 'sort' => 2],
            ['code' => 'teamwork', 'en' => 'Teamwork', 'ar' => 'العمل الجماعي', 'weight' => 16.67, 'sort' => 3],
            ['code' => 'initiative', 'en' => 'Initiative', 'ar' => 'المبادرة', 'weight' => 16.66, 'sort' => 4],
            ['code' => 'problem_solving', 'en' => 'Problem Solving', 'ar' => 'حل المشكلات', 'weight' => 16.66, 'sort' => 5],
            ['code' => 'professionalism', 'en' => 'Professionalism', 'ar' => 'الاحترافية', 'weight' => 16.67, 'sort' => 6],
        ];

        $sum = array_sum(array_column($criteria, 'weight'));
        if (abs($sum - 100.0) > 0.001) {
            throw new \RuntimeException("Evaluation criteria weights must sum to 100.00, got {$sum}.");
        }

        foreach ($criteria as $row) {
            DB::table('evaluation_criteria')->updateOrInsert(
                ['code' => $row['code']],
                [
                    'name' => json_encode(['en' => $row['en'], 'ar' => $row['ar']]),
                    'weight' => $row['weight'],
                    'max_score' => 100,
                    'sort_order' => $row['sort'],
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]
            );
        }
    }
}
