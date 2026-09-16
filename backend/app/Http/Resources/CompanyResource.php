<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Application;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Company
 */
class CompanyResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $includeStats = $request->routeIs('company.*') || $this->relationLoaded('opportunities');

        $availableOpportunitiesCount = $includeStats
            ? $this->opportunities()->where('status', 'published')->count()
            : null;

        $acceptedStudentsCount = $includeStats
            ? Application::whereHas('opportunity', fn ($q) => $q->where('company_id', $this->id))
                ->where('status', 'accepted')
                ->count()
            : null;

        return [
            'id' => $this->id,
            'name' => $this->getTranslations('name'),
            'registration_number' => $this->registration_number,
            'industry_id' => $this->industry_id,
            'industry' => $this->industry ? new IndustryResource($this->industry) : null,
            'description' => $this->getTranslations('description'),
            'email' => $this->contact_email,
            'contact_email' => $this->contact_email,
            'phone' => $this->phone,
            'website' => $this->website,
            'address' => $this->address,
            'city' => $this->city,
            'established_year' => $this->established_year,
            'employees_count' => $this->employees_count,
            'logo' => $this->logoFile?->url,
            'logo_url' => $this->logoFile?->url,
            'logo_file_id' => $this->logo_file_id,
            'status' => $this->status,
            'status_reason' => $this->status_reason,
            'stats' => $this->when($includeStats, [
                'available_opportunities' => $availableOpportunitiesCount,
                'accepted_students' => $acceptedStudentsCount,
            ]),
            'available_opportunities_count' => $this->when($includeStats, $availableOpportunitiesCount),
            'accepted_students_count' => $this->when($includeStats, $acceptedStudentsCount),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
