<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\OpportunityRequirement;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin OpportunityRequirement
 */
class OpportunityRequirementResource extends JsonResource
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
            'requirement_text' => $this->getTranslations('requirement_text'),
            'sort_order' => $this->sort_order,
        ];
    }
}
