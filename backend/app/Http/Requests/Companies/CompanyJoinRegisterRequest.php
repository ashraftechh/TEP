<?php

declare(strict_types=1);

namespace App\Http\Requests\Companies;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class CompanyJoinRegisterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare data for validation.
     */
    protected function prepareForValidation(): void
    {
        if (! $this->has('email') && $this->query('email')) {
            $this->merge(['email' => $this->query('email')]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:3', 'max:255'],
            'email' => [
                'required',
                'string',
                app()->environment('testing') ? 'email:rfc' : 'email:rfc,dns',
                'max:255',
                'indisposable',
                'unique:users,email',
            ],
            'phone' => [
                'nullable',
                'string',
                'phone:YE',
                'unique:users,phone',
            ],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ];
    }
}
