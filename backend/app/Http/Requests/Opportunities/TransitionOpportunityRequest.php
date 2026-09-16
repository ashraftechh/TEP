<?php

declare(strict_types=1);

namespace App\Http\Requests\Opportunities;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class TransitionOpportunityRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * Suspended companies may still archive or close their own opportunities
     * (housekeeping), but they cannot publish — that would allow new student
     * applications to a company that is not in good standing.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user) {
            return false;
        }

        $toStatus = (string) $this->input('to_status');

        // Map the requested transition to the required permission.
        $requiredPermission = match ($toStatus) {
            'published' => 'opportunities.own.publish',
            'closed' => 'opportunities.own.close',
            'archived' => 'opportunities.own.archive',
            default => null,
        };

        if ($requiredPermission !== null && ! $user->hasPermission($requiredPermission)) {
            return false;
        }

        $company = $user->companyRepresentative?->company;

        if (! $company) {
            return false;
        }

        // Suspended companies may not publish opportunities.
        if ($company->status === 'suspended' && $toStatus === 'published') {
            return false;
        }

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
            'to_status' => ['required', 'string', 'in:published,closed,archived'],
            'version' => ['required', 'integer'],
        ];
    }
}
