<?php

declare(strict_types=1);

namespace App\Http\Requests\Applications;

use App\Models\Application;
use Illuminate\Foundation\Http\FormRequest;

class AcceptApplicationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * TEP-648 — Gate: `applications.company.review` permission AND ownership —
     * the route-bound application's opportunity must belong to the acting
     * representative's own company. There is no per-row permission
     * (hasPermission() only confirms the role may review ITS OWN company's
     * applications in general), so ownership is checked explicitly here —
     * same division of responsibility as WithdrawApplicationRequest's
     * student-ownership check and OpportunityController::update()'s
     * company-ownership check.
     *
     * A failed check here yields a 403, which also naturally covers the
     * "another company's application" cross-tenant case from TEP-651 without
     * leaking whether the application exists.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user || ! $user->hasPermission('applications.company.review')) {
            return false;
        }

        $company = $user->companyRepresentative?->company;

        if (! $company || $company->status === 'suspended') {
            return false;
        }

        /** @var Application|null $application */
        $application = $this->route('application');

        if ($application === null) {
            return false;
        }

        $application->loadMissing('opportunity');

        return $application->opportunity !== null
            && $application->opportunity->company_id === $company->id;
    }

    /**
     * No request body is expected for accept — the decision itself carries
     * no additional data (unlike reject, which requires a reason).
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [];
    }
}
