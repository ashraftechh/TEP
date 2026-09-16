<?php

declare(strict_types=1);

namespace App\Rules;

use App\Models\Application;
use App\Models\CompanyRepresentative;
use Closure;
use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * TEP-661 — validates that the selected `field_supervisor_id` is a
 * representative of the SAME company as the opportunity the application (also
 * present in the request payload as `application_id`) was submitted for. A
 * field supervisor from an unrelated company makes no sense per TEP-661.
 *
 * Implements DataAwareRule to read the sibling `application_id` field —
 * this rule can't be expressed as a plain `exists:` rule because the
 * "which company" constraint depends on another field in the same request.
 *
 * Silently passes when `application_id` itself is missing/invalid, or when
 * the referenced application has no opportunity — those cases are already
 * reported by `application_id`'s own `required`/`exists` rules, and
 * duplicating that failure here would be confusing.
 */
class FieldSupervisorBelongsToApplicationCompany implements DataAwareRule, ValidationRule
{
    /**
     * All of the data under validation.
     *
     * @var array<string, mixed>
     */
    protected array $data = [];

    /**
     * Set the data under validation.
     *
     * @param  array<string, mixed>  $data
     */
    public function setData(array $data): static
    {
        $this->data = $data;

        return $this;
    }

    /**
     * Run the validation rule.
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $applicationId = $this->data['application_id'] ?? null;

        if (! is_numeric($applicationId) || ! is_numeric($value)) {
            return;
        }

        $application = Application::with('opportunity')->find((int) $applicationId);

        if ($application === null || $application->opportunity === null) {
            return;
        }

        $companyId = $application->opportunity->company_id;

        $belongsToCompany = CompanyRepresentative::where('user_id', (int) $value)
            ->where('company_id', $companyId)
            ->exists();

        if (! $belongsToCompany) {
            $fail(__('training_assignments.validation.field_supervisor_wrong_company'));
        }
    }
}
