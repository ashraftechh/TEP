<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\TrainingCycle;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin TrainingCycle
 */
class TrainingCycleResource extends JsonResource
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
            'name' => $this->getTranslations('name'),
            'academic_year' => $this->academic_year,
            'semester' => $this->semester,
            'application_start_at' => $this->application_start_at?->toISOString(),
            'application_end_at' => $this->application_end_at?->toISOString(),
            'end_date' => $this->end_date?->format('Y-m-d'),
            'status' => $this->status,
        ];
    }
}
