<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Companies\JoinCompanyRegisterAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Companies\CompanyJoinRegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\URL;

class CompanyJoinController extends Controller
{
    /**
     * Inspect and validate the signed company join invitation.
     *
     * Returns company details for the registration form.
     * No longer checks account_exists — every visitor goes through the
     * unified registration form.
     */
    public function show(Request $request, Company $company): JsonResponse
    {
        $email = (string) $request->query('email', '');

        if ($company->status !== 'approved') {
            return response()->json([
                'message' => __('auth.invite_invalid_or_used'),
            ], 410);
        }

        $contactEmail = $company->contact_email ?? $company->email ?? $email;

        return response()->json([
            'data' => [
                'company_id' => $company->id,
                'company_name' => $company->name,
                'contact_email' => $contactEmail,
                'email' => $email,
            ],
            'message' => 'Invite details retrieved successfully.',
        ]);
    }

    /**
     * Register a new user and link them as a representative to the company.
     *
     * The user is created with status=''pending'' and email_verified_at=null.
     * The Registered event fires after the DB transaction to send the
     * bilingual email-verification notification.
     *
     * Uniqueness of the email is enforced by the CompanyJoinRegisterRequest
     * validation rules (unique:users,email) — no separate 409 check needed.
     */
    public function register(
        CompanyJoinRegisterRequest $request,
        Company $company,
        JoinCompanyRegisterAction $action
    ): JsonResponse {
        $this->validateInviteSignature($request, $company);

        if ($company->status !== 'approved') {
            return response()->json([
                'message' => __('auth.invite_invalid_or_used'),
            ], 410);
        }

        $validated = $request->validated();
        $personalEmail = (string) $validated['email'];

        $user = $action->execute($company, $personalEmail, $validated);

        Auth::login($user);

        return (new UserResource($user))
            ->additional([
                'message' => __('auth.company_join_success'),
            ])
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Validate that the request carries a valid signed invite signature
     * (either for the current URL or the parent company.join route).
     */
    protected function validateInviteSignature(Request $request, Company $company): void
    {
        // 1. Direct signature check on current request
        if (URL::hasValidSignature($request)) {
            return;
        }

        // 2. Canonical company.join signed URL signature check (from the original email link)
        $email = (string) $request->query('email', '');
        $expires = $request->query('expires');
        $signature = $request->query('signature');

        if ($email !== '' && $expires && $signature) {
            $canonicalUrl = route('company.join', [
                'company' => $company->id,
                'email' => $email,
                'expires' => $expires,
                'signature' => $signature,
            ]);

            if (URL::hasValidSignature(Request::create($canonicalUrl))) {
                return;
            }
        }

        abort(403, 'Invalid signature.');
    }
}
