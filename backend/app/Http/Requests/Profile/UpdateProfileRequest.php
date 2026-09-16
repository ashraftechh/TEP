<?php

declare(strict_types=1);

namespace App\Http\Requests\Profile;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class UpdateProfileRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string|ValidationRule>>
     */
    public function rules(): array
    {
        /** @var User $user */
        $user = $this->user();

        $rules = [
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'avatar_file_id' => ['sometimes', 'nullable', 'integer', 'exists:files,id'],

            // Prohibited fields for all roles
            // OPEN QUESTION: Does a student changing majors need approval, or is it self-service? Leave read-only for this task; decision is pending.
            'major_id' => ['prohibited'],

            // OPEN QUESTION: GPA is read-only on the training platform to ensure academic integrity; whether it should be synced from records or entered by an admin is pending decision.
            'gpa' => ['prohibited'],

            // Admin-only change: Department cannot be updated by supervisors/coordinators themselves.
            'department_id' => ['prohibited'],
        ];

        if ($user->hasPermission('student_profiles.own.update')) {
            $rules['bio'] = ['sometimes', 'nullable', 'string', 'max:1000'];
            $rules['address'] = ['sometimes', 'nullable', 'string', 'max:255'];
            $rules['expected_graduation'] = ['sometimes', 'nullable', 'date'];
            $rules['interests'] = ['sometimes', 'nullable', 'array'];
            $rules['interests.*'] = ['string', 'max:100'];
            $rules['languages'] = ['sometimes', 'nullable', 'array'];
            $rules['languages.*'] = ['string', 'max:100'];
            $rules['achievements'] = ['sometimes', 'nullable', 'array'];
            $rules['achievements.*'] = ['string', 'max:255'];
        } else {
            // Student-specific fields prohibited for non-students
            $rules['bio'] = ['prohibited'];
            $rules['address'] = ['prohibited'];
            $rules['expected_graduation'] = ['prohibited'];
            $rules['interests'] = ['prohibited'];
            $rules['languages'] = ['prohibited'];
            $rules['achievements'] = ['prohibited'];
        }

        if ($user->hasPermission('company_representatives.own.update')) {
            $rules['job_title'] = ['sometimes', 'nullable', 'string', 'max:255'];
        } else {
            $rules['job_title'] = ['prohibited'];
        }

        return $rules;
    }

    /**
     * Configure the validator instance with custom domain checks.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            // Explicit rejection of email changes (changing a login identifier requires a separate verification flow)
            if ($this->has('email')) {
                $v->errors()->add('email', __('profile.email_cannot_be_changed'));
            }
        });
    }
}
