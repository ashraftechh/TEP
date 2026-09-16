<?php

declare(strict_types=1);

namespace App\Http\Requests\Applications;

use App\Models\Application;
use Illuminate\Foundation\Http\FormRequest;

class ScheduleInterviewRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * TEP-653 — Gate: `applications.company.review` permission AND ownership —
     * the route-bound application's opportunity must belong to the acting
     * representative's own company. There is no dedicated
     * `applications.schedule_interview` permission in the seeded catalog;
     * scheduling an interview is part of the company's review process, so
     * this reuses the same `applications.company.review` permission as
     * accept (TEP-648) / reject (TEP-649) — same division of responsibility
     * as AcceptApplicationRequest/RejectApplicationRequest, which this
     * mirrors exactly.
     *
     * A failed check here yields a 403, which also naturally covers the
     * "another company's application" cross-tenant case without leaking
     * whether the application exists.
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
     * TEP-653 — `interview_at` is required and must be a future timestamp;
     * scheduling an interview in the past makes no sense for either the
     * initial schedule or a reschedule.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'interview_at' => ['required', 'date', 'after:now'],
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
            'interview_at' => __('validation.attributes.interview_at', ['default' => 'interview date/time']),
        ];
    }
}
