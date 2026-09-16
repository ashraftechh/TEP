<?php

declare(strict_types=1);

namespace App\Http\Requests\Reports;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

/**
 * TEP-674 — POST /api/v1/reports
 *
 * Permission `reports.own.create` (student only, per the Sprint 4
 * permission catalog). Ownership of *which* training assignment the
 * report is filed against is resolved server-side from the
 * authenticated student's own active assignment inside
 * CreateReportAction — never a request/route param — same pattern as
 * MyTrainingAssignmentRequest.
 */
class CreateReportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        /** @var User|null $user */
        $user = $this->user();

        if (! $user || ! $user->hasPermission('reports.own.create')) {
            return false;
        }

        return $user->studentProfile !== null;
    }

    /**
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'report_type_id' => ['required', 'integer', 'exists:report_types,id'],
            'title' => ['required', 'string', 'max:255'],
            'report_number' => ['required', 'integer', 'min:1'],
            'content' => ['required', 'string'],
            'due_at' => ['required', 'date'],
            'file_ids' => ['nullable', 'array'],
            'file_ids.*' => ['integer', 'exists:files,id'],
        ];
    }
}
