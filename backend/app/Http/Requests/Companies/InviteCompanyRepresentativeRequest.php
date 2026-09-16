<?php

declare(strict_types=1);

namespace App\Http\Requests\Companies;

use App\Models\CompanyRepresentative;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class InviteCompanyRepresentativeRequest extends FormRequest
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
        $user = $this->user();
        $companyId = $user?->companyRepresentative?->company_id;

        return [
            'email' => [
                'required',
                'string',
                app()->environment('testing') ? 'email:rfc' : 'email:rfc,dns',
                'max:255',
                function (string $attribute, mixed $value, Closure $fail) use ($companyId): void {
                    if ($companyId !== null) {
                        $alreadyExists = CompanyRepresentative::query()
                            ->where('company_id', $companyId)
                            ->whereHas('user', fn ($query) => $query->where('email', (string) $value))
                            ->exists();

                        if ($alreadyExists) {
                            $fail(__('companies.representatives_management.already_representative'));
                        }
                    }
                },
            ],
        ];
    }
}
