<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;

class CompleteRegistrationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * Only users with status 'incomplete' can complete their registration.
     */
    public function authorize(): bool
    {
        return $this->user()?->status === 'incomplete';
    }

    /**
     * Handle a failed authorization attempt.
     */
    protected function failedAuthorization(): void
    {
        throw new HttpResponseException(response()->json([
            'message' => __('auth.registration_already_complete'),
            'error_code' => 'registration_already_complete',
        ], 403));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'account_type' => ['required', 'string', Rule::in(['student'])],
            'major_id' => ['required', 'integer', 'exists:majors,id'],
        ];
    }
}
