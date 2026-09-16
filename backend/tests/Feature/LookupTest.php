<?php

declare(strict_types=1);

use App\Models\Industry;
use App\Models\Major;
use App\Models\Skill;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('can retrieve active academic majors list', function () {
    $collegeId = DB::table('colleges')->insertGetId([
        'code' => 'cci',
        'name' => json_encode(['en' => 'College of Computing', 'ar' => 'كلية الحاسب']),
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    $deptId = DB::table('departments')->insertGetId([
        'college_id' => $collegeId,
        'code' => 'cs_dept',
        'name' => json_encode(['en' => 'CS Department', 'ar' => 'قسم الحاسوب']),
        'is_active' => true,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    Major::create([
        'department_id' => $deptId,
        'code' => 'cs',
        'name' => ['en' => 'Computer Science', 'ar' => 'علوم الحاسب'],
        'is_active' => true,
    ]);

    Major::create([
        'department_id' => $deptId,
        'code' => 'inactive_major',
        'name' => ['en' => 'Inactive', 'ar' => 'غير نشط'],
        'is_active' => false,
    ]);

    $response = $this->getJson('/api/v1/majors');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.code', 'cs')
        ->assertJsonStructure([
            'data' => [
                '*' => ['id', 'code', 'name', 'is_active'],
            ],
        ]);
});

test('can retrieve active industries list', function () {
    Industry::create([
        'code' => 'tech',
        'name' => ['en' => 'Technology', 'ar' => 'التقنية'],
        'is_active' => true,
    ]);

    Industry::create([
        'code' => 'inactive_ind',
        'name' => ['en' => 'Inactive Industry', 'ar' => 'قطاع غير نشط'],
        'is_active' => false,
    ]);

    $response = $this->getJson('/api/v1/industries');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.code', 'tech')
        ->assertJsonStructure([
            'data' => [
                '*' => ['id', 'code', 'name', 'is_active'],
            ],
        ]);
});

test('can retrieve active skills list', function () {
    Skill::create([
        'name' => ['en' => 'React', 'ar' => 'رياكت'],
        'is_active' => true,
    ]);

    Skill::create([
        'name' => ['en' => 'Inactive Skill', 'ar' => 'مهارة غير نشطة'],
        'is_active' => false,
    ]);

    $response = $this->getJson('/api/v1/skills');

    $response->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name.en', 'React')
        ->assertJsonStructure([
            'data' => [
                '*' => ['id', 'name', 'is_active'],
            ],
        ]);
});
