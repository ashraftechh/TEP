<?php

declare(strict_types=1);

namespace App\Http\Requests\TrainingAssignments;

use App\Rules\FieldSupervisorBelongsToApplicationCompany;
use App\Rules\UserHasRole;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * TEP-661 — POST /api/v1/training-assignments
 *
 * Authorization is handled entirely by the route's `permission:
 * training_assignments.create` middleware (coordinator-only, no per-row
 * ownership to check at creation time).
 *
 * `company_id` / `opportunity_id` are deliberately NOT accepted here at
 * all — CreateTrainingAssignmentAction derives both from the application's
 * own opportunity so they can never be spoofed to disagree with it.
 */
class CreateTrainingAssignmentRequest extends FormRequest
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
            'application_id' => ['required', 'integer', 'exists:applications,id'],

            // Must actually hold the academic_supervisor role — validated via
            // a custom rule, not just exists:users,id (TEP-661). Nullable:
            // coordinators may assign a supervisor later.
            'academic_supervisor_id' => ['nullable', 'integer', 'exists:users,id', new UserHasRole('academic_supervisor')],

            // Must belong to the SAME company as the opportunity the
            // application was for (TEP-661) — depends on application_id,
            // so this is a DataAwareRule rather than a plain exists rule.
            // Nullable: coordinators may designate a field supervisor later.
            'field_supervisor_id' => ['nullable', 'integer', 'exists:users,id', new FieldSupervisorBelongsToApplicationCompany],

            'start_date' => ['nullable', 'date'],
            'end_date' => [
                'nullable',
                'date',
                function (string $attribute, mixed $value, Closure $fail): void {
                    $start = $this->input('start_date');

                    if ($start && $value && strtotime((string) $value) <= strtotime((string) $start)) {
                        $fail(__('validation.after', [
                            'attribute' => 'end_date',
                            'date' => 'start_date',
                        ]));
                    }
                },
            ],
            'required_reports_count' => ['nullable', 'integer', 'min:1', 'max:500'],
            'report_configuration' => ['nullable', 'array'],
            'report_configuration.*.enabled' => ['nullable', 'boolean'],
            'report_configuration.*.max_count' => ['nullable', 'integer', 'min:0'],
        ];
    }

    /**
     * Custom validation messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [];
    }
}
