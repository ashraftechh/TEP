<?php

declare(strict_types=1);

namespace App\Http\Requests\Applications;

use App\Models\Application;
use Illuminate\Foundation\Http\FormRequest;

class RejectApplicationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * TEP-649 — Same permission + ownership gate as AcceptApplicationRequest
     * (TEP-648): `applications.company.review` + the route-bound
     * application's opportunity must belong to the acting representative's
     * own company. See AcceptApplicationRequest for the full rationale.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user || ! $user->hasPermission('applications.company.review')) {
            return false;
        }

        $company = $user->companyRepresentative?->company;

        if (! $company) {
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
     * TEP-649 — unlike withdrawal, a rejection reason is REQUIRED: the
     * company owes the student a concrete explanation, whereas withdrawal is
     * the student's own choice and needs no justification to anyone.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'max:1000'],
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
