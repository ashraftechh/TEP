<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Auth;

use App\Actions\Auth\RegisterUserAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class RegisterController extends Controller
{
    /**
     * Handle an incoming registration request for a student or company representative.
     */
    public function register(RegisterRequest $request, RegisterUserAction $action): JsonResponse
    {
        $user = $action->execute($request->validated());

        // Authenticate the user into the Sanctum session upon registration
        Auth::login($user);

        return (new UserResource($user))
            ->additional([
                'message' => __('auth.registration_success'),
            ])
            ->response()
            ->setStatusCode(201);
    }
}
