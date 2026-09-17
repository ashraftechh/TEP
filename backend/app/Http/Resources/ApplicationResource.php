<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Application;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Application
 */
class ApplicationResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var Application $application */
        $application = $this->resource;

        return [
            'id' => $application->id,
            'opportunity_id' => $application->opportunity_id,
            'student_profile_id' => $application->student_profile_id,
            'cv_file_id' => $application->cv_file_id,
            'cover_note' => $application->cover_note,
            'status' => $application->status,
            'interview_at' => $application->interview_at?->toISOString(),
            'decision_reason' => $application->decision_reason,
            'withdrawn_reason' => $application->withdrawn_reason,
            'version' => $application->version,
            'created_at' => $application->created_at?->toISOString(),
            'submitted_at' => $application->submitted_at?->toISOString(),
            'updated_at' => $application->updated_at?->toISOString(),
            'cv_file' => $this->when(
                $application->relationLoaded('cvFile') && $application->cvFile,
                function () use ($application) {
                    return [
                        'id' => $application->cvFile->id,
                        'original_name' => $application->cvFile->original_name,
                        'url' => $application->cvFile->url,
                        'mime_type' => $application->cvFile->mime_type,
                        'size_bytes' => $application->cvFile->size_bytes,
                    ];
                }
            ),
            'opportunity' => $this->when(
                $application->relationLoaded('opportunity') && $application->opportunity,
                function () use ($application) {
                    return new OpportunityResource($application->opportunity);
                }
            ),
            'student_profile' => $this->when(
                $application->relationLoaded('studentProfile') && $application->studentProfile,
                function () use ($application) {
                    $profile = $application->studentProfile;

                    return [
                        'id' => $profile->id,
                        'student_number' => $profile->student_number,
                        'avatar_url' => $profile->avatarFile?->url,
                        'university_name' => $profile->university_name,
                        'level_year' => $profile->level_year,
                        'gpa' => $profile->gpa,
                        'bio' => $profile->bio,
                        'phone' => $profile->phone,
                        'major' => $profile->relationLoaded('major') && $profile->major
                            ? [
                                'id' => $profile->major->id,
                                'name' => $profile->major->name,
                            ]
                            : null,
                        'user' => $profile->relationLoaded('user') && $profile->user
                            ? [
                                'id' => $profile->user->id,
                                'name' => $profile->user->name,
                                'email' => $profile->user->email,
                                'phone' => $profile->user->phone,
                            ]
                            : null,
                        'skills' => $profile->relationLoaded('skills') && $profile->skills
                            ? $profile->skills->map(function ($skill) {
                                return [
                                    'id' => $skill->id,
                                    'name' => $skill->name,
                                ];
                            })->values()->all()
                            : [],
                    ];
                }
            ),
            'transitions' => $this->when(
                $application->relationLoaded('transitions'),
                function () use ($application) {
                    return ApplicationTransitionResource::collection($application->transitions);
                }
            ),

            // ── TEP-636: My Applications list fields ──────────────────────────────
            // ASSUMPTION: withdrawable_statuses = ['submitted','under_review',
            // 'interview_scheduled'] — flagged open question in config/applications.php.
            // Computed server-side so the frontend does NOT duplicate this list.
            'can_withdraw' => in_array(
                $application->status,
                config('applications.withdrawable_statuses', [])
            ),

            // Single most-recent transition for the "last updated" summary line.
            // Only present when the latestTransition relation was eagerly loaded.
            'latest_transition' => $this->when(
                $application->relationLoaded('latestTransition') && $application->latestTransition,
                function () use ($application) {
                    return new ApplicationTransitionResource($application->latestTransition);
                }
            ),
        ];
    }
}
