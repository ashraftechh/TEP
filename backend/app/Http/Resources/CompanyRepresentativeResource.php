<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\CompanyRepresentative;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CompanyRepresentative
 */
class CompanyRepresentativeResource extends JsonResource
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
            'user_id' => $this->user_id,
            'name' => $this->user?->name,
            'email' => $this->user?->email,
            'phone' => $this->user?->phone,
            'job_title' => $this->job_title,
            'is_primary' => (bool) $this->is_primary,
            'avatar_url' => $this->avatarFile?->url ?? $this->user?->companyRepresentative?->avatarFile?->url ?? null,
            'joined_at' => $this->created_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
