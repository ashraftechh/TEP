<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Report;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Report
 */
class ReportResource extends JsonResource
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
            'training_assignment_id' => $this->training_assignment_id,
            'student' => $this->whenLoaded('trainingAssignment', function () {
                $profile = $this->trainingAssignment->studentProfile;
                if (! $profile) {
                    return null;
                }

                return [
                    'id' => $profile->id,
                    'student_number' => $profile->student_number,
                    'name' => $profile->user?->name ?? '',
                    'email' => $profile->user?->email ?? '',
                ];
            }),
            'opportunity' => $this->whenLoaded('trainingAssignment', function () {
                $opp = $this->trainingAssignment?->opportunity;
                if (! $opp) {
                    return null;
                }

                return [
                    'id' => $opp->id,
                    'title' => $opp->getTranslations('title'),
                ];
            }),
            'company' => $this->whenLoaded('trainingAssignment', function () {
                $comp = $this->trainingAssignment?->company;
                if (! $comp) {
                    return null;
                }

                return [
                    'id' => $comp->id,
                    'name' => $comp->getTranslations('name'),
                ];
            }),
            'title' => $this->title,
            'report_type_id' => $this->report_type_id,
            'report_type' => $this->whenLoaded('reportType', fn () => [
                'id' => $this->reportType->id,
                'code' => $this->reportType->code,
                'name' => $this->reportType->getTranslations('name'),
            ]),
            'report_number' => $this->report_number,
            'content' => $this->content,
            'status' => $this->status,
            'grade' => $this->grade,
            'version' => $this->version,
            'feedback' => $this->relationLoaded('latestReview')
                ? $this->latestReview?->feedback
                : ($this->feedback ?? null),
            'latest_review' => $this->whenLoaded('latestReview', fn () => $this->latestReview ? [
                'id' => $this->latestReview->id,
                'decision' => $this->latestReview->decision,
                'feedback' => $this->latestReview->feedback,
                'created_at' => $this->latestReview->created_at,
            ] : null),
            'submitted_at' => $this->submitted_at,
            'due_at' => $this->due_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'files' => $this->whenLoaded('files', fn () => $this->files->map(fn ($file) => [
                'id' => $file->id,
                'original_name' => $file->original_name,
                'url' => $file->url,
                'mime_type' => $file->mime_type,
                'size_bytes' => $file->size_bytes,
            ])->values()),
        ];
    }
}
