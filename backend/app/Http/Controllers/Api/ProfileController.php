<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\AttachSkillRequest;
use App\Http\Requests\Profile\UpdateProfileRequest;
use App\Http\Resources\ProfileResource;
use App\Models\File;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class ProfileController extends Controller
{
    /**
     * Get the authenticated user's profile with role-specific nested details.
     *
     * Base endpoint requires only auth:sanctum (permission-free).
     * Nested profile data is conditionally eager-loaded and attached
     * according to the user's granular RBAC permissions.
     */
    public function show(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $this->loadProfileRelations($user);

        return (new ProfileResource($user))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Update the authenticated user's profile data.
     *
     * Base fields (name, phone) are editable by any authenticated user.
     * Role-specific profile fields (bio, address, interests, etc.) require
     * their respective .own.update permissions.
     * Email changes are rejected; GPA and Major are read-only.
     */
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validated();

        DB::transaction(function () use ($user, $validated) {
            $userFields = array_intersect_key($validated, array_flip(['name', 'phone']));
            if (! empty($userFields)) {
                $user->update($userFields);
            }

            if ($user->hasPermission('student_profiles.own.update') && $user->studentProfile) {
                $studentFields = array_intersect_key($validated, array_flip([
                    'bio',
                    'address',
                    'expected_graduation',
                    'interests',
                    'languages',
                    'achievements',
                    'avatar_file_id',
                ]));

                if (! empty($studentFields)) {
                    $user->studentProfile->update($studentFields);
                }
            }

            if ($user->hasPermission('company_representatives.own.update') && $user->companyRepresentative) {
                $repFields = array_intersect_key($validated, array_flip([
                    'job_title',
                    'avatar_file_id',
                ]));

                if (! empty($repFields)) {
                    $user->companyRepresentative->update($repFields);
                }
            }

            if ($user->hasPermission('academic_supervisor_profiles.own.update') && $user->academicSupervisorProfile) {
                if (array_key_exists('avatar_file_id', $validated)) {
                    $user->academicSupervisorProfile->update(['avatar_file_id' => $validated['avatar_file_id']]);
                }
            }

            if ($user->hasPermission('training_coordinator_profiles.own.update') && $user->trainingCoordinatorProfile) {
                if (array_key_exists('avatar_file_id', $validated)) {
                    $user->trainingCoordinatorProfile->update(['avatar_file_id' => $validated['avatar_file_id']]);
                }
            }
        });

        $this->loadProfileRelations($user);

        return (new ProfileResource($user))
            ->additional(['message' => __('profile.updated_successfully')])
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Attach a skill to the authenticated student's profile.
     */
    public function attachSkill(AttachSkillRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $studentProfile = $user->studentProfile;

        if (! $studentProfile) {
            abort(404, __('profile.student_profile_not_found'));
        }

        $validated = $request->validated();

        if ($studentProfile->skills()->where('skill_id', $validated['skill_id'])->exists()) {
            return response()->json([
                'message' => __('profile.skill_already_attached'),
            ], 409);
        }

        $studentProfile->skills()->attach($validated['skill_id'], [
            'proficiency' => $validated['proficiency'],
        ]);

        return response()->json([
            'message' => __('profile.skill_attached'),
        ], 201);
    }

    /**
     * Detach a skill from the authenticated student's profile.
     */
    public function detachSkill(Request $request, int $skillId): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->hasPermission('student_profiles.own.update')) {
            abort(403, __('profile.unauthorized_update_skills'));
        }

        $studentProfile = $user->studentProfile;
        if (! $studentProfile) {
            abort(404, __('profile.student_profile_not_found'));
        }

        if (! $studentProfile->skills()->where('skill_id', $skillId)->exists()) {
            return response()->json([
                'message' => __('profile.skill_not_found'),
            ], 404);
        }

        $studentProfile->skills()->detach($skillId);

        return response()->json([
            'message' => __('profile.skill_removed'),
        ], 200);
    }

    /**
     * Unlink a connected SSO identity from the user's account.
     * Prevents self-lockout if the SSO identity is the user's only authentication method.
     */
    public function unlinkSso(Request $request, string $provider): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if (! $user->hasPermission('sso_identities.own.unlink')) {
            abort(403, __('profile.unauthorized_unlink_sso'));
        }

        $identity = $user->ssoIdentities()->where('provider', $provider)->first();

        if (! $identity) {
            return response()->json([
                'message' => __('profile.sso_not_found'),
            ], 404);
        }

        // Self-lockout check: If the user has no password and this is their last/only SSO identity, reject.
        if (empty($user->password) && $user->ssoIdentities()->count() <= 1) {
            return response()->json([
                'message' => __('profile.cannot_unlink_last_auth_method'),
            ], 422);
        }

        $identity->delete();

        return response()->json([
            'message' => __('profile.sso_unlinked'),
        ], 200);
    }

    /**
     * Upload and update the avatar image for the authenticated user's profile.
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
        ]);

        /** @var User $user */
        $user = $request->user();
        $uploadedFile = $request->file('avatar');

        $path = $uploadedFile->store('avatars', 'public');

        $file = File::create([
            'uploader_id' => $user->id,
            'fileable_type' => User::class,
            'fileable_id' => $user->id,
            'purpose' => 'avatar',
            'disk' => 'public',
            'path' => $path,
            'original_name' => $uploadedFile->getClientOriginalName(),
            'mime_type' => $uploadedFile->getMimeType() ?? 'image/jpeg',
            'size_bytes' => $uploadedFile->getSize(),
            'scan_status' => 'clean',
            'scanned_at' => now(),
        ]);

        if ($user->studentProfile) {
            $user->studentProfile->update(['avatar_file_id' => $file->id]);
        } elseif ($user->companyRepresentative) {
            $user->companyRepresentative->update(['avatar_file_id' => $file->id]);
        } elseif ($user->academicSupervisorProfile) {
            $user->academicSupervisorProfile->update(['avatar_file_id' => $file->id]);
        } elseif ($user->trainingCoordinatorProfile) {
            $user->trainingCoordinatorProfile->update(['avatar_file_id' => $file->id]);
        }

        $this->loadProfileRelations($user);

        return (new ProfileResource($user))
            ->additional(['message' => __('profile.avatar_updated_successfully')])
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Upload and update the CV document for the authenticated student's profile.
     */
    public function uploadCv(Request $request): JsonResponse
    {
        $request->validate([
            'cv' => ['required', 'file', 'mimes:pdf,doc,docx', 'max:5120'],
        ]);

        /** @var User $user */
        $user = $request->user();

        if (! $user->studentProfile) {
            return response()->json([
                'message' => __('profile.student_profile_not_found'),
            ], 404);
        }

        $uploadedFile = $request->file('cv');
        $path = $uploadedFile->store('cvs', 'public');

        $file = File::create([
            'uploader_id' => $user->id,
            'fileable_type' => User::class,
            'fileable_id' => $user->id,
            'purpose' => 'cv',
            'disk' => 'public',
            'path' => $path,
            'original_name' => $uploadedFile->getClientOriginalName(),
            'mime_type' => $uploadedFile->getMimeType() ?? 'application/pdf',
            'size_bytes' => $uploadedFile->getSize(),
            'scan_status' => 'clean',
            'scanned_at' => now(),
        ]);

        $user->studentProfile->update(['cv_file_id' => $file->id]);

        $this->loadProfileRelations($user);

        return (new ProfileResource($user))
            ->additional([
                'message' => __('profile.cv_updated_successfully'),
                'file' => [
                    'id' => $file->id,
                    'original_name' => $file->original_name,
                    'url' => $file->url,
                    'size_bytes' => $file->size_bytes,
                    'mime_type' => $file->mime_type,
                ],
            ])
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Change or set password for the authenticated user.
     */
    public function changePassword(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $rules = [
            'new_password' => ['required', 'string', 'confirmed', Password::defaults()],
        ];

        // Require current_password only if user already has a password set
        if (! empty($user->password)) {
            $rules['current_password'] = ['required', 'string'];
        }

        $validated = $request->validate($rules);

        if (! empty($user->password) && ! Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => __('auth.password'),
                'errors' => [
                    'current_password' => [__('auth.password')],
                ],
            ], 422);
        }

        $user->update([
            'password' => Hash::make($validated['new_password']),
        ]);

        return response()->json([
            'message' => __('profile.password_updated_successfully'),
        ], 200);
    }

    /**
     * Eager load the appropriate relationships according to the user's permissions.
     */
    private function loadProfileRelations(User $user): void
    {
        $relations = ['userRoles.role'];

        if ($user->hasPermission('student_profiles.own.view')) {
            $relations[] = 'studentProfile.major';
            $relations[] = 'studentProfile.skills';
            $relations[] = 'studentProfile.avatarFile';
            $relations[] = 'studentProfile.cvFile';
        }

        if ($user->hasPermission('academic_supervisor_profiles.own.view')) {
            $relations[] = 'academicSupervisorProfile.department';
            $relations[] = 'academicSupervisorProfile.avatarFile';
        }

        if ($user->hasPermission('training_coordinator_profiles.own.view')) {
            $relations[] = 'trainingCoordinatorProfile.department';
            $relations[] = 'trainingCoordinatorProfile.avatarFile';
        }

        if ($user->hasPermission('company_representatives.own.view')) {
            $relations[] = 'companyRepresentative.company';
            $relations[] = 'companyRepresentative.avatarFile';
        }

        if ($user->hasPermission('sso_identities.own.view')) {
            $relations[] = 'ssoIdentities';
        }

        $user->load($relations);
    }
}
