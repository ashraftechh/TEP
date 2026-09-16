<?php

declare(strict_types=1);

namespace App\Http\Requests\Applications;

use App\Models\Application;
use Illuminate\Foundation\Http\FormRequest;

class WithdrawApplicationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * Gate: `applications.own.withdraw` permission AND ownership — the
     * route-bound application's student_profile_id must match the
     * authenticated user's own student profile. There is no per-row
     * permission (hasPermission() only confirms the student role may
     * withdraw its OWN applications in general), so ownership is checked
     * explicitly here — same pattern as OpportunityController's
     * own.update ownership check and ApplyToOpportunityRequest's
     * "never trust an id from the request" rule.
     *
     * A failed check here yields a 403, which also naturally covers the
     * "another student's application" case from TEP-642 without leaking
     * whether the application exists.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user || ! $user->hasPermission('applications.own.withdraw')) {
            return false;
        }

        $studentProfile = $user->studentProfile;

        if (! $studentProfile) {
            return false;
        }

        /** @var Application|null $application */
        $application = $this->route('application');

        return $application !== null
            && $application->student_profile_id === $studentProfile->id;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * Custom translated attribute names.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'reason' => __('validation.attributes.reason', ['default' => 'reason']),
        ];
    }
}
