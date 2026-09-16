<?php

declare(strict_types=1);

namespace App\Http\Requests\Reports;

use App\Models\Report;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

/**
 * TEP-682 / TEP-684 — POST /api/v1/reports/{report}/review
 *
 * Permission `reports.review` (academic_supervisor), plus an explicit ownership
 * check verifying that the acting user is the academic supervisor assigned to
 * this report's training assignment.
 */
class ReviewReportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        /** @var User|null $user */
        $user = $this->user();

        if (! $user || ! $user->hasPermission('reports.review')) {
            return false;
        }

        /** @var Report|null $report */
        $report = $this->route('report');

        if (! $report || ! $report->trainingAssignment) {
            return false;
        }

        // Supervisor ownership: must be the assigned academic supervisor
        return (int) $report->trainingAssignment->academic_supervisor_id === (int) $user->id;
    }

    /**
     * @return array<string, array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'decision' => ['required', 'string', 'in:approved,rejected,revision_requested'],
            'feedback' => ['required', 'string', 'max:2000'],
            'grade' => ['required_if:decision,approved', 'nullable', 'numeric', 'min:0', 'max:100'],
        ];
    }

    /**
     * Decision-aware validation messages per TEP-684.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        $decision = $this->input('decision');

        if ($decision === 'rejected') {
            $feedbackMessage = __('reports.validation.feedback_required_reject');
        } elseif ($decision === 'revision_requested') {
            $feedbackMessage = __('reports.validation.feedback_required_revision');
        } else {
            $feedbackMessage = __('reports.validation.feedback_required');
        }

        return [
            'feedback.required' => $feedbackMessage,
            'grade.required_if' => __('reports.validation.grade_required_on_approval'),
        ];
    }
}
