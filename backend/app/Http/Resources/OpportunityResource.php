<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Opportunity;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Opportunity
 */
class OpportunityResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'company_id' => $this->company_id,
            'company' => $this->relationLoaded('company') && $this->company ? new CompanyResource($this->company) : null,
            'opportunity_type_id' => $this->opportunity_type_id,
            'opportunity_type' => $this->relationLoaded('opportunityType') && $this->opportunityType ? new OpportunityTypeResource($this->opportunityType) : null,
            'training_cycle_id' => $this->training_cycle_id,
            'training_cycle' => $this->relationLoaded('trainingCycle') && $this->trainingCycle ? new TrainingCycleResource($this->trainingCycle) : null,
            'created_by' => $this->created_by,
            'title' => $this->getTranslations('title'),
            'department' => $this->getTranslations('department'),
            'description' => $this->getTranslations('description'),
            'work_mode' => $this->work_mode,
            'is_remote' => $this->work_mode === 'remote',
            'location' => $this->location,
            'duration' => $this->duration,
            'capacity' => $this->capacity,
            'accepted_count' => isset($this->accepted_applications_count)
                ? (int) $this->accepted_applications_count
                : ($this->relationLoaded('applications')
                    ? $this->applications->where('status', 'accepted')->count()
                    : (int) ($this->accepted_count ?? 0)),
            'applicants_count' => isset($this->applicants_count)
                ? (int) $this->applicants_count
                : ($this->relationLoaded('applications')
                    ? $this->applications->whereNotIn('status', ['withdrawn', 'rejected'])->count()
                    : 0),
            'salary' => $this->salary !== null ? (float) $this->salary : null,
            'start_date' => $this->start_date?->format('Y-m-d'),
            'end_date' => $this->end_date?->format('Y-m-d'),
            'application_deadline' => $this->application_deadline?->format('Y-m-d'),
            'application_open' => $this->status === 'published' && ! $this->deadlinePassed(),
            'status' => $this->status,
            'version' => $this->version,
            'published_at' => $this->published_at?->toISOString(),
            'majors' => MajorResource::collection($this->whenLoaded('majors')),
            'skills' => SkillResource::collection($this->whenLoaded('skills')),
            'requirements' => OpportunityRequirementResource::collection($this->whenLoaded('requirements')),
            'benefits' => OpportunityBenefitResource::collection($this->whenLoaded('benefits')),
            'already_applied' => $this->when($request->user()?->hasRole('student'), fn() => (bool) ($this->already_applied ?? false)),
            'has_active_assignment' => $this->when($request->user()?->hasRole('student'), fn() => (bool) ($this->has_active_assignment ?? false)),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
