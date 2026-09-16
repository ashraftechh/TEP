<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Application;
use App\Models\Opportunity;
use App\Models\StudentProfile;
use App\Models\TrainingAssignment;

/**
 * TEP-629 — Application Eligibility Service.
 *
 * Encapsulates all "can this student apply to this opportunity?" checks in a
 * single, reusable service so that every entry-point (form request, artisan,
 * tests) runs the same logic. Called by StoreApplicationRequest::authorize()
 * and by the store action before creating the application row.
 *
 * Checks are performed in fail-fast order; the first violated rule returns
 * a distinct, translated result so the frontend can display the specific reason.
 */
class ApplicationEligibilityService
{
    /**
     * @return array{eligible: true}|array{eligible: false, reason: string, http_status: int, error_code: string}
     */
    public function check(Opportunity $opportunity, StudentProfile $student): array
    {
        // ----------------------------------------------------------------
        // Check 1 — Opportunity must be published and within deadline.
        // ----------------------------------------------------------------
        if ($opportunity->status !== 'published') {
            return [
                'eligible' => false,
                'reason' => __('applications.opportunity_not_published'),
                'http_status' => 422,
                'error_code' => 'opportunity_not_published',
            ];
        }

        if ($opportunity->deadlinePassed()) {
            return [
                'eligible' => false,
                'reason' => __('applications.deadline_passed'),
                'http_status' => 422,
                'error_code' => 'deadline_passed',
            ];
        }

        // ----------------------------------------------------------------
        // Check 2 — Opportunity must still have open capacity.
        //
        // JUDGMENT CALL (flagged): the ticket does not explicitly say to
        // block new applications once accepted_count >= capacity. However,
        // blocking makes practical sense since accepting further applicants
        // beyond capacity is not meaningful. Flagged here for team review.
        // ----------------------------------------------------------------
        if ($opportunity->accepted_count >= $opportunity->capacity) {
            return [
                'eligible' => false,
                'reason' => __('applications.opportunity_at_capacity'),
                'http_status' => 422,
                'error_code' => 'opportunity_at_capacity',
            ];
        }

        // ----------------------------------------------------------------
        // Check 3 — No existing non-terminal application for this pair.
        //
        // Returns 409 (Conflict), not 422, to distinguish "already applied"
        // from a validation error. Withdrawn and rejected are treated as
        // terminal — re-application is permitted from those statuses.
        // ----------------------------------------------------------------
        $existingActive = Application::where('opportunity_id', $opportunity->id)
            ->where('student_profile_id', $student->id)
            ->whereNotIn('status', Application::REAPPLYABLE_STATUSES)
            ->whereNull('deleted_at')
            ->exists();

        if ($existingActive) {
            return [
                'eligible' => false,
                'reason' => __('applications.already_applied'),
                'http_status' => 409,
                'error_code' => 'already_applied',
            ];
        }

        // ----------------------------------------------------------------
        // Check 4 — Student must not hold an active or suspended assignment.
        //
        // A student who has already begun an active training placement
        // cannot apply to new opportunities until that assignment ends.
        // ----------------------------------------------------------------
        $hasActiveAssignment = TrainingAssignment::where('student_profile_id', $student->id)
            ->whereIn('status', ['active', 'suspended'])
            ->exists();

        if ($hasActiveAssignment) {
            return [
                'eligible' => false,
                'reason' => __('applications.student_already_assigned'),
                'http_status' => 422,
                'error_code' => 'student_already_assigned',
            ];
        }

        // ----------------------------------------------------------------
        // Check 5 — Student has not exceeded the concurrent active cap.
        // ----------------------------------------------------------------
        $cap = (int) config('applications.max_active_applications_per_student', 5);

        $activeCount = Application::where('student_profile_id', $student->id)
            ->whereIn('status', Application::ACTIVE_STATUSES)
            ->whereNull('deleted_at')
            ->count();

        if ($activeCount >= $cap) {
            return [
                'eligible' => false,
                'reason' => __('applications.active_cap_reached', [
                    'count' => $activeCount,
                    'cap' => $cap,
                ]),
                'http_status' => 422,
                'error_code' => 'active_cap_reached',
            ];
        }

        return ['eligible' => true];
    }
}
