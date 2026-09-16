<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\ReportReview;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ReportReview
 */
class ReportReviewResource extends JsonResource
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
            'report_id' => $this->report_id,
            'decision' => $this->decision,
            'feedback' => $this->feedback,
            'from_status' => $this->from_status,
            'to_status' => $this->to_status,
            'created_at' => $this->created_at,
            'reviewer' => $this->whenLoaded('reviewer', fn () => $this->reviewer ? [
                'id' => $this->reviewer->id,
                'name' => $this->reviewer->name,
                'email' => $this->reviewer->email,
            ] : null),
        ];
    }
}
