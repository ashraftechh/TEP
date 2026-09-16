<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\User;
use App\Models\UserRole;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
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
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'avatar_url' => $this->studentProfile?->avatarFile?->url
                ?? $this->companyRepresentative?->avatarFile?->url
                ?? null,
            'status' => $this->status,
            'email_verified_at' => $this->email_verified_at?->toISOString(),
            'roles' => $this->whenLoaded('userRoles', function () {
                return $this->userRoles->map(function (UserRole $userRole) {
                    return [
                        'id' => $userRole->role_id,
                        'name' => $userRole->role?->name,
                        'label' => $userRole->role?->label,
                        'scope_type' => $userRole->scope_type,
                        'scope_id' => $userRole->scope_id,
                    ];
                });
            }),
            'permissions' => $this->whenLoaded('userRoles', function () {
                return $this->userRoles
                    ->flatMap(fn (UserRole $ur) => $ur->role?->permissions ?? [])
                    ->pluck('name')
                    ->unique()
                    ->values()
                    ->all();
            }),
            'student_profile' => $this->whenLoaded('studentProfile', function () {
                if (! $this->studentProfile) {
                    return null;
                }

                return [
                    'id' => $this->studentProfile->id,
                    'student_number' => $this->studentProfile->student_number,
                    'major_id' => $this->studentProfile->major_id,
                    'university_name' => $this->studentProfile->university_name,
                    'level_year' => $this->studentProfile->level_year,
                    'gpa' => $this->studentProfile->gpa,
                    'major' => $this->studentProfile->relationLoaded('major') && $this->studentProfile->major
                        ? [
                            'id' => $this->studentProfile->major->id,
                            'name' => $this->studentProfile->major->name,
                            'code' => $this->studentProfile->major->code,
                        ]
                        : null,
                    'cv_file_id' => $this->studentProfile->cv_file_id,
                    'cv_file' => $this->studentProfile->relationLoaded('cvFile') && $this->studentProfile->cvFile
                        ? [
                            'id' => $this->studentProfile->cvFile->id,
                            'original_name' => $this->studentProfile->cvFile->original_name,
                            'url' => $this->studentProfile->cvFile->url,
                            'size_bytes' => $this->studentProfile->cvFile->size_bytes,
                            'mime_type' => $this->studentProfile->cvFile->mime_type,
                        ]
                        : null,
                    'has_active_assignment' => $this->studentProfile->relationLoaded('trainingAssignments')
                        ? $this->studentProfile->trainingAssignments->whereIn('status', ['active', 'suspended'])->isNotEmpty()
                        : $this->studentProfile->trainingAssignments()->whereIn('status', ['active', 'suspended'])->exists(),
                ];
            }),
            'company_representative' => $this->whenLoaded('companyRepresentative', function () {
                if (! $this->companyRepresentative) {
                    return null;
                }

                return [
                    'id' => $this->companyRepresentative->id,
                    'company_id' => $this->companyRepresentative->company_id,
                    'job_title' => $this->companyRepresentative->job_title,
                    'is_primary' => $this->companyRepresentative->is_primary,
                    'company' => $this->companyRepresentative->relationLoaded('company') && $this->companyRepresentative->company
                        ? [
                            'id' => $this->companyRepresentative->company->id,
                            'name' => $this->companyRepresentative->company->name,
                            'status' => $this->companyRepresentative->company->status,
                            'industry_id' => $this->companyRepresentative->company->industry_id,
                        ]
                        : null,
                ];
            }),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
