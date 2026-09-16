<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Auth;

use App\Actions\Auth\CompleteRegistrationAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\CompleteRegistrationRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class CompleteRegistrationController extends Controller
{
    /**
     * Complete registration for an authenticated user with status 'incomplete'.
     */
    public function __invoke(CompleteRegistrationRequest $request, CompleteRegistrationAction $action): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $updatedUser = $action->execute($user, $request->validated());

        return (new UserResource($updatedUser))
            ->additional([
                'message' => __('auth.registration_completed'),
            ])
            ->response()
            ->setStatusCode(200);
    }
}
