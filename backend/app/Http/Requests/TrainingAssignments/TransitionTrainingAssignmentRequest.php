<?php

declare(strict_types=1);

namespace App\Http\Requests\TrainingAssignments;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * TEP-670 — POST /api/v1/training-assignments/{assignment}/transition
 *
 * Authorization is handled entirely by the route's `permission:
 * training_assignments.transition` middleware (coordinator-only, no
 * per-row ownership to check — any coordinator may transition any
 * assignment), same division of responsibility as
 * CreateTrainingAssignmentRequest.
 *
 * `to` is checked only against TrainingAssignment::STATUSES here — whether
 * the specific from -> to pair is actually reachable is TEP-669's map,
 * enforced by TransitionTrainingAssignmentAction and reported as a 422
 * with error_code `invalid_transition` from the controller, not duplicated
 * as a validation rule here (the valid "to" set depends on which row is
 * being transitioned, which this request has no reliable access to ahead
 * of route-model binding).
 */
class TransitionTrainingAssignmentRequest extends FormRequest
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
     * `reason` is REQUIRED when `to` is `suspended` or `terminated` (422
     * if missing) and optional otherwise — same pattern as Sprint 3's
     * reject-requires-reason rule.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'to' => ['required', 'string', 'in:active,suspended,completed,terminated'],
            'reason' => [
                Rule::requiredIf(fn (): bool => in_array($this->input('to'), ['suspended', 'terminated'], true)),
                'nullable',
                'string',
                'max:2000',
            ],
        ];
    }

    /**
     * Custom validation messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required' => __('training_assignments.validation.reason_required'),
        ];
    }
}
