<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\TrainingAssignment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin TrainingAssignment
 */
class TrainingAssignmentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var TrainingAssignment $assignment */
        $assignment = $this->resource;

        return [
            'id' => $assignment->id,
            'application_id' => $assignment->application_id,
            'student_profile_id' => $assignment->student_profile_id,
            'company_id' => $assignment->company_id,
            'opportunity_id' => $assignment->opportunity_id,
            'academic_supervisor_id' => $assignment->academic_supervisor_id,
            'field_supervisor_id' => $assignment->field_supervisor_id,
            'training_coordinator_id' => $assignment->training_coordinator_id,
            'status' => $assignment->status,
            'is_current' => (bool) $assignment->is_current,
            'start_date' => $assignment->start_date?->toDateString(),
            'end_date' => $assignment->end_date?->toDateString(),
            'progress_percentage' => $assignment->progress_percentage,
            'required_reports_count' => $assignment->required_reports_count,
            'report_configuration' => $assignment->report_configuration,
            // TEP-665: alias of required_reports_count under the name the
            // ticket asks for in list responses ("total_reports
            // (required_reports_count)") — same column, two keys, so
            // existing consumers of required_reports_count (e.g. the
            // create-assignment response) are unaffected.
            'total_reports' => $assignment->required_reports_count,
            'suspension_reason' => $assignment->suspension_reason,
            'termination_reason' => $assignment->termination_reason,
            'version' => $assignment->version,
            'created_at' => $assignment->created_at?->toISOString(),
            'updated_at' => $assignment->updated_at?->toISOString(),

            // TEP-665: computed via query aggregation in
            // TrainingAssignmentController::baseQuery() (withCount /
            // correlated subquery) — never present unless that query ran,
            // so both are guarded by isset() rather than relationLoaded().
            'reports_submitted_count' => $this->when(
                isset($assignment->reports_submitted_count),
                fn () => (int) $assignment->reports_submitted_count
            ),
            'latest_attendance_status' => $this->when(
                array_key_exists('latest_attendance_status', $assignment->getAttributes()),
                fn () => $assignment->getAttributes()['latest_attendance_status']
            ),

            'company' => $this->when(
                $assignment->relationLoaded('company') && $assignment->company,
                function () use ($assignment) {
                    return [
                        'id' => $assignment->company->id,
                        'name' => $assignment->company->getTranslation('name', app()->getLocale()),
                        'logo_url' => $assignment->company->relationLoaded('logoFile')
                            ? $assignment->company->logoFile?->url
                            : null,
                    ];
                }
            ),

            'opportunity' => $this->when(
                $assignment->relationLoaded('opportunity') && $assignment->opportunity,
                function () use ($assignment) {
                    return [
                        'id' => $assignment->opportunity->id,
                        'title' => $assignment->opportunity->getTranslation('title', app()->getLocale()),
                    ];
                }
            ),

            'application' => $this->when(
                $assignment->relationLoaded('application') && $assignment->application,
                function () use ($assignment) {
                    return new ApplicationResource($assignment->application);
                }
            ),

            'student_profile' => $this->when(
                $assignment->relationLoaded('studentProfile') && $assignment->studentProfile,
                function () use ($assignment) {
                    $profile = $assignment->studentProfile;

                    return [
                        'id' => $profile->id,
                        'student_number' => $profile->student_number,
                        'gpa' => $profile->gpa,
                        'phone' => $profile->phone ?? $profile->user?->phone,
                        'avatar_url' => $profile->relationLoaded('avatarFile') ? $profile->avatarFile?->url : null,
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
                            ]
                            : null,
                    ];
                }
            ),

            'academic_supervisor' => $this->when(
                $assignment->relationLoaded('academicSupervisor') && $assignment->academicSupervisor,
                function () use ($assignment) {
                    return [
                        'id' => $assignment->academicSupervisor->id,
                        'name' => $assignment->academicSupervisor->name,
                        'email' => $assignment->academicSupervisor->email,
                    ];
                }
            ),

            'field_supervisor' => $this->when(
                $assignment->relationLoaded('fieldSupervisor') && $assignment->fieldSupervisor,
                function () use ($assignment) {
                    return [
                        'id' => $assignment->fieldSupervisor->id,
                        'name' => $assignment->fieldSupervisor->name,
                        'email' => $assignment->fieldSupervisor->email,
                    ];
                }
            ),

            'training_coordinator' => $this->when(
                $assignment->relationLoaded('trainingCoordinator') && $assignment->trainingCoordinator,
                function () use ($assignment) {
                    return [
                        'id' => $assignment->trainingCoordinator->id,
                        'name' => $assignment->trainingCoordinator->name,
                    ];
                }
            ),
        ];
    }
}
