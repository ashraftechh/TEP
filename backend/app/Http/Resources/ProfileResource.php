<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Skill;
use App\Models\SsoIdentity;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class ProfileResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var User $user */
        $user = $this->resource;

        $avatarUrl = $user->studentProfile?->avatarFile?->url
            ?? $user->companyRepresentative?->avatarFile?->url
            ?? $user->academicSupervisorProfile?->avatarFile?->url
            ?? $user->trainingCoordinatorProfile?->avatarFile?->url
            ?? null;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'avatar_url' => $avatarUrl,
            'status' => $user->status,
            'has_password' => ! empty($user->password),
            'email_verified_at' => $user->email_verified_at?->toISOString(),
            'roles' => $this->whenLoaded('userRoles', function () use ($user) {
                return $user->userRoles->map(function (UserRole $userRole) {
                    return [
                        'id' => $userRole->role_id,
                        'name' => $userRole->role?->name,
                        'label' => $userRole->role?->label,
                        'scope_type' => $userRole->scope_type,
                        'scope_id' => $userRole->scope_id,
                    ];
                });
            }),
            'student_profile' => $this->when(
                $user->hasPermission('student_profiles.own.view') && $user->relationLoaded('studentProfile') && $user->studentProfile,
                function () use ($user, $avatarUrl) {
                    $profile = $user->studentProfile;

                    return [
                        'id' => $profile->id,
                        'student_number' => $profile->student_number,
                        'major_id' => $profile->major_id,
                        'university_name' => $profile->university_name,
                        'level_year' => $profile->level_year,
                        'gpa' => $profile->gpa,
                        'bio' => $profile->bio,
                        'phone' => $profile->phone,
                        'address' => $profile->address,
                        'avatar_file_id' => $profile->avatar_file_id,
                        'avatar_url' => $avatarUrl,
                        'cv_file_id' => $profile->cv_file_id,
                        'cv_file' => $profile->relationLoaded('cvFile') && $profile->cvFile
                            ? [
                                'id' => $profile->cvFile->id,
                                'original_name' => $profile->cvFile->original_name,
                                'url' => $profile->cvFile->url,
                                'size_bytes' => $profile->cvFile->size_bytes,
                                'mime_type' => $profile->cvFile->mime_type,
                            ]
                            : ($profile->cv_file_id && $profile->cvFile ? [
                                'id' => $profile->cvFile->id,
                                'original_name' => $profile->cvFile->original_name,
                                'url' => $profile->cvFile->url,
                                'size_bytes' => $profile->cvFile->size_bytes,
                                'mime_type' => $profile->cvFile->mime_type,
                            ] : null),
                        'expected_graduation' => $profile->expected_graduation,
                        'interests' => $profile->interests,
                        'languages' => $profile->languages,
                        'achievements' => $profile->achievements,
                        'major' => $profile->relationLoaded('major') && $profile->major
                            ? [
                                'id' => $profile->major->id,
                                'name' => $profile->major->name,
                                'code' => $profile->major->code,
                            ]
                            : null,
                        'skills' => $profile->relationLoaded('skills')
                            ? $profile->skills->map(function (Skill $skill) {
                                return [
                                    'id' => $skill->id,
                                    'name' => $skill->name,
                                    'proficiency' => $skill->pivot?->proficiency,
                                ];
                            })
                            : [],
                    ];
                }
            ),
            'academic_supervisor_profile' => $this->when(
                $user->hasPermission('academic_supervisor_profiles.own.view') && $user->relationLoaded('academicSupervisorProfile') && $user->academicSupervisorProfile,
                function () use ($user, $avatarUrl) {
                    $profile = $user->academicSupervisorProfile;

                    return [
                        'id' => $profile->id,
                        'department_id' => $profile->department_id,
                        'avatar_file_id' => $profile->avatar_file_id,
                        'avatar_url' => $avatarUrl,
                        'department' => $profile->relationLoaded('department') && $profile->department
                            ? [
                                'id' => $profile->department->id,
                                'name' => $profile->department->name,
                                'code' => $profile->department->code,
                            ]
                            : null,
                    ];
                }
            ),
            'training_coordinator_profile' => $this->when(
                $user->hasPermission('training_coordinator_profiles.own.view') && $user->relationLoaded('trainingCoordinatorProfile') && $user->trainingCoordinatorProfile,
                function () use ($user, $avatarUrl) {
                    $profile = $user->trainingCoordinatorProfile;

                    return [
                        'id' => $profile->id,
                        'department_id' => $profile->department_id,
                        'avatar_file_id' => $profile->avatar_file_id,
                        'avatar_url' => $avatarUrl,
                        'department' => $profile->relationLoaded('department') && $profile->department
                            ? [
                                'id' => $profile->department->id,
                                'name' => $profile->department->name,
                                'code' => $profile->department->code,
                            ]
                            : null,
                    ];
                }
            ),
            'company_representative' => $this->when(
                $user->hasPermission('company_representatives.own.view') && $user->relationLoaded('companyRepresentative') && $user->companyRepresentative,
                function () use ($user, $avatarUrl) {
                    $rep = $user->companyRepresentative;

                    return [
                        'id' => $rep->id,
                        'company_id' => $rep->company_id,
                        'job_title' => $rep->job_title,
                        'avatar_file_id' => $rep->avatar_file_id,
                        'avatar_url' => $avatarUrl,
                        'is_primary' => $rep->is_primary,
                        'company' => $rep->relationLoaded('company') && $rep->company
                            ? [
                                'id' => $rep->company->id,
                                'name' => $rep->company->name,
                                'status' => $rep->company->status,
                                'industry_id' => $rep->company->industry_id,
                            ]
                            : null,
                    ];
                }
            ),
            'sso_identities' => $this->when(
                $user->hasPermission('sso_identities.own.view') && $user->relationLoaded('ssoIdentities'),
                function () use ($user) {
                    return $user->ssoIdentities->map(function (SsoIdentity $identity) {
                        return [
                            'id' => $identity->id,
                            'provider' => $identity->provider,
                            'provider_email' => $identity->provider_email,
                            // CRITICAL SECURITY: Never expose provider_subject_id
                        ];
                    });
                }
            ),
            'created_at' => $user->created_at?->toISOString(),
            'updated_at' => $user->updated_at?->toISOString(),
        ];
    }
}
