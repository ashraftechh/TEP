<?php

declare(strict_types=1);

namespace App\Http\Requests\Applications;

use App\Models\Application;
use Illuminate\Foundation\Http\FormRequest;

class ViewApplicationTransitionsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * TEP-657 — Gate: the requester must either own the application
     * (`applications.own.view` + application.student_profile_id matches the
     * requester's own student profile) OR own the opportunity's company
     * (`applications.company.view` + application.opportunity.company_id
     * matches the requester's own company) — an unrelated student or
     * company cannot view another application's history.
     *
     * There is no per-row permission for either check (hasPermission() only
     * confirms the role may view applications of that kind in general), so
     * ownership is checked explicitly here — same division of
     * responsibility as WithdrawApplicationRequest's student-ownership
     * check and AcceptApplicationRequest's company-ownership check.
     *
     * A failed check here yields a 403, which also naturally covers the
     * "another student's/company's application" cross-tenant case without
     * leaking whether the application exists.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user) {
            return false;
        }

        /** @var Application|null $application */
        $application = $this->route('application');

        if ($application === null) {
            return false;
        }

        // Branch 1: the owning student.
        $studentProfile = $user->studentProfile;

        if (
            $user->hasPermission('applications.own.view')
            && $studentProfile !== null
            && $application->student_profile_id === $studentProfile->id
        ) {
            return true;
        }

        // Branch 2: the owning company's representative.
        $company = $user->companyRepresentative?->company;

        if ($user->hasPermission('applications.company.view') && $company !== null) {
            $application->loadMissing('opportunity');

            if ($application->opportunity !== null && $application->opportunity->company_id === $company->id) {
                return true;
            }
        }

        return false;
    }

    /**
     * No request body is expected — this is a read-only history fetch.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [];
    }
}
