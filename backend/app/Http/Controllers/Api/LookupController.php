<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\IndustryResource;
use App\Http\Resources\MajorResource;
use App\Http\Resources\OpportunityTypeResource;
use App\Http\Resources\ReportTypeResource;
use App\Http\Resources\SkillResource;
use App\Http\Resources\TrainingCycleResource;
use App\Models\Industry;
use App\Models\Major;
use App\Models\OpportunityType;
use App\Models\ReportType;
use App\Models\Skill;
use App\Models\TrainingCycle;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class LookupController extends Controller
{
    /**
     * Get all active academic majors.
     */
    public function majors(): AnonymousResourceCollection
    {
        $majors = Major::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->get();

        return MajorResource::collection($majors);
    }

    /**
     * Get all active industries.
     */
    public function industries(): AnonymousResourceCollection
    {
        $industries = Industry::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->get();

        return IndustryResource::collection($industries);
    }

    /**
     * Get all active skills for student profile selection.
     */
    public function skills(): AnonymousResourceCollection
    {
        $skills = Skill::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->get();

        return SkillResource::collection($skills);
    }

    /**
     * Get all active opportunity types.
     */
    public function opportunityTypes(): AnonymousResourceCollection
    {
        $types = OpportunityType::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->get();

        return OpportunityTypeResource::collection($types);
    }

    /**
     * Get all active training cycles.
     */
    public function trainingCycles(): AnonymousResourceCollection
    {
        $cycles = TrainingCycle::query()
            ->where('status', 'active')
            ->orderBy('id', 'desc')
            ->get();

        return TrainingCycleResource::collection($cycles);
    }

    /**
     * Get all active report types.
     *
     * TEP-674/TEP-675 — GET /api/v1/report-types, permission
     * `report_types.view_any` (student, academic_supervisor,
     * training_coordinator, super_admin — see PermissionSeeder). Unlike
     * the other lookups above, this is registered behind `auth:sanctum`
     * + the permission middleware rather than the public throttled
     * group, since report types are not meant to be publicly readable.
     */
    public function reportTypes(): AnonymousResourceCollection
    {
        $reportTypes = ReportType::query()
            ->where('is_active', true)
            ->orderBy('id')
            ->get();

        return ReportTypeResource::collection($reportTypes);
    }
}
