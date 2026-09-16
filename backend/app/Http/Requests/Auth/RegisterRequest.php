<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', 'min:3'],
            'email' => [
                'required',
                'string',
                app()->environment('testing') ? 'email:rfc' : 'email:rfc,dns',
                'max:255',
                'unique:users,email',
                'indisposable',
            ],

            'phone' => [
                'nullable',
                'string',
                'phone:YE',
                'unique:users,phone',
            ],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
            'account_type' => ['required', 'string', Rule::in(['student'])],
            'major_id' => ['required', 'integer', 'exists:majors,id'],
        ];
    }
}
