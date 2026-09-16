<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\OpportunityBenefit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin OpportunityBenefit
 */
class OpportunityBenefitResource extends JsonResource
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
            'benefit_text' => $this->getTranslations('benefit_text'),
            'sort_order' => $this->sort_order,
        ];
    }
}
