<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Companies\GenerateCompanyJoinInvite;
use App\Http\Controllers\Controller;
use App\Http\Requests\Companies\InviteCompanyRepresentativeRequest;
use App\Http\Requests\Companies\UpdateCompanyRepresentativeRequest;
use App\Http\Resources\CompanyRepresentativeResource;
use App\Mail\CompanyJoinInviteMail;
use App\Models\CompanyRepresentative;
use App\Models\User;
use App\Models\UserRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class CompanyRepresentativeController extends Controller
{
    /**
     * List all representatives of the authenticated user's company.
     *
     * Gated by company_representatives.own.view permission.
     * Ordered with the primary representative first, then by joined date (created_at).
     */
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $callerRep = $user->companyRepresentative;

        if (! $callerRep) {
            return response()->json([
                'message' => __('companies.representatives_management.no_company'),
            ], 404);
        }

        $representatives = CompanyRepresentative::query()
            ->where('company_id', $callerRep->company_id)
            ->with(['user', 'avatarFile'])
            ->orderByDesc('is_primary')
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'data' => CompanyRepresentativeResource::collection($representatives),
            'is_admin' => (bool) $callerRep->is_primary,
            'message' => __('companies.representatives_management.list_retrieved'),
        ]);
    }

    /**
     * Invite a colleague to join the company as a representative.
     *
     * Gated by company_representatives.own.invite permission + is_primary check.
     * Only the primary representative ("Admin") can invite new members.
     */
    public function invite(
        InviteCompanyRepresentativeRequest $request,
        GenerateCompanyJoinInvite $generateInviteAction
    ): JsonResponse {
        /** @var User $user */
        $user = $request->user();
        $callerRep = $user->companyRepresentative;

        if (! $callerRep || ! $callerRep->is_primary) {
            return response()->json([
                'message' => __('companies.representatives_management.admin_only'),
                'error_code' => 'admin_only',
            ], 403);
        }

        $company = $callerRep->company;
        $email = (string) $request->validated('email');

        $inviteUrl = $generateInviteAction->execute($company, $email);

        try {
            Mail::to($email)->send(
                new CompanyJoinInviteMail(
                    company: $company,
                    inviteUrl: $inviteUrl,
                    recipientName: null,
                    locale: app()->getLocale() ?: 'ar',
                )
            );
        } catch (\Throwable $e) {
            report($e);

            return response()->json([
                'message' => __('companies.representatives_management.mail_failure'),
            ], 500);
        }

        return response()->json([
            'data' => [
                'invite_url' => $inviteUrl,
            ],
            'message' => __('companies.representatives_management.invite_sent'),
        ], 200);
    }

    /**
     * Self-edit job title for the authenticated representative.
     *
     * Accessible to all company representatives for their own account.
     */
    public function updateMe(UpdateCompanyRepresentativeRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $callerRep = $user->companyRepresentative;

        if (! $callerRep) {
            return response()->json([
                'message' => __('companies.representatives_management.no_company'),
            ], 404);
        }

        $callerRep->update([
            'job_title' => $request->input('job_title'),
        ]);

        $callerRep->load(['user', 'avatarFile']);

        return (new CompanyRepresentativeResource($callerRep))
            ->additional([
                'message' => __('companies.representatives_management.updated_successfully'),
            ])
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Edit another representative's job title.
     *
     * Restricted to the primary representative ("Admin") of the same company.
     * Note: Transferring is_primary directly is not supported via this endpoint.
     */
    public function update(
        UpdateCompanyRepresentativeRequest $request,
        CompanyRepresentative $representative
    ): JsonResponse {
        /** @var User $user */
        $user = $request->user();
        $callerRep = $user->companyRepresentative;

        if (! $callerRep || ! $callerRep->is_primary) {
            return response()->json([
                'message' => __('companies.representatives_management.admin_only'),
                'error_code' => 'admin_only',
            ], 403);
        }

        if ($representative->company_id !== $callerRep->company_id) {
            return response()->json([
                'message' => __('companies.representatives_management.not_found'),
            ], 403);
        }

        $representative->update([
            'job_title' => $request->input('job_title'),
        ]);

        $representative->load(['user', 'avatarFile']);

        return (new CompanyRepresentativeResource($representative))
            ->additional([
                'message' => __('companies.representatives_management.updated_successfully'),
            ])
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Remove a representative from the company, or leave the company voluntarily.
     *
     * Gated by company_representatives.own.remove.
     * - Removing another representative requires is_primary = true (Admin).
     * - Removing oneself ("leave") is allowed for any representative.
     * - If the primary representative leaves and others remain, the earliest joined
     *   remaining representative is auto-promoted to is_primary = true.
     * - If the last representative is removed, the company reverts to 0 representatives.
     */
    public function destroy(Request $request, CompanyRepresentative $representative): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $callerRep = $user->companyRepresentative;

        if (! $callerRep) {
            return response()->json([
                'message' => __('companies.representatives_management.no_company'),
            ], 403);
        }

        if ($representative->company_id !== $callerRep->company_id) {
            return response()->json([
                'message' => __('companies.representatives_management.not_found'),
            ], 403);
        }

        $isSelf = $representative->user_id === $user->id;

        if (! $isSelf && ! $callerRep->is_primary) {
            return response()->json([
                'message' => __('companies.representatives_management.admin_only'),
                'error_code' => 'admin_only',
            ], 403);
        }

        // Block leaving when you are the only representative — the company must always have at least one.
        if ($isSelf && $representative->company->representatives()->count() === 1) {
            return response()->json([
                'message' => __('companies.representatives_management.last_representative'),
                'error_code' => 'last_representative',
            ], 422);
        }

        DB::transaction(function () use ($representative): void {
            $companyId = $representative->company_id;
            $targetUserId = $representative->user_id;
            $wasPrimary = (bool) $representative->is_primary;

            $representative->delete();

            UserRole::query()
                ->where('user_id', $targetUserId)
                ->where('scope_type', 'company')
                ->where('scope_id', $companyId)
                ->delete();

            // Permanently delete the user account.
            User::find($targetUserId)?->forceDelete();

            if ($wasPrimary) {
                $nextPrimary = CompanyRepresentative::query()
                    ->where('company_id', $companyId)
                    ->orderBy('created_at', 'asc')
                    ->first();

                if ($nextPrimary) {
                    $nextPrimary->update(['is_primary' => true]);
                }
            }
        });

        return response()->json([
            'message' => $isSelf
                ? __('companies.representatives_management.left_successfully')
                : __('companies.representatives_management.removed_successfully'),
        ], 200);
    }
}
