<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Actions\Companies\SubmitCompanyRegistrationRequestAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Companies\CompanyRegistrationRequestRequest;
use Illuminate\Http\JsonResponse;

class CompanyRegistrationRequestController extends Controller
{
    /**
     * Handle the incoming company registration request.
     */
    public function __invoke(
        CompanyRegistrationRequestRequest $request,
        SubmitCompanyRegistrationRequestAction $action
    ): JsonResponse {
        $action->execute($request->validated());

        return response()->json([
            'message' => __('companies.request_submitted_successfully'),
        ], 201);
    }
}
