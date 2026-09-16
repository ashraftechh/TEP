<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ReportType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ReportType
 */
class ReportTypeResource extends JsonResource
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
            'code' => $this->code,
            'name' => $this->getTranslations('name'),
            'is_active' => $this->is_active,
        ];
    }
}
