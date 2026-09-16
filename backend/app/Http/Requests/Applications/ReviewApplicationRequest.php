<?php

declare(strict_types=1);

namespace App\Http\Requests\Applications;

use App\Models\Application;
use Illuminate\Foundation\Http\FormRequest;

class ReviewApplicationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * Gate: `applications.company.review` permission AND ownership —
     * the route-bound application's opportunity must belong to the acting
     * representative's own company.
     *
     * A failed check here yields a 403, covering unauthorized roles and
     * cross-tenant access.
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
     * No request body is expected to mark an application as under review.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [];
    }
}
