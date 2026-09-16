<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Major;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Major
 */
class MajorResource extends JsonResource
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
            'department_id' => $this->department_id,
            'code' => $this->code,
            'name' => $this->name,
            'is_active' => $this->is_active,
        ];
    }
}
