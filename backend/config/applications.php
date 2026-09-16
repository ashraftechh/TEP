<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Application Submission Rules (TEP-628)
    |--------------------------------------------------------------------------
    |
    | These values are ASSUMPTIONS — not confirmed business decisions from
    | the university's documented policy. They are config-driven specifically
    | so they can be changed without a code deploy once the real university
    | policy is confirmed.
    |
    | FLAGGED OPEN QUESTIONS:
    |  - max_active_applications_per_student = 5 is a reasonable default
    |    with no source-of-truth confirmation from the provided materials.
    |  - deadline_buffer_hours = 0 means the buffer is disabled. The concept
    |    of a pre-deadline buffer was specified in the ticket but the actual
    |    value was not confirmed. 0 (disabled) is the safest assumption.
    |
    */

    // Max applications a student may hold simultaneously in a non-terminal
    // status (submitted / under_review / interview_scheduled).
    // 'accepted' does NOT count against this cap — once accepted, the
    // student is effectively done searching.
    // Do NOT hardcode the number 5 elsewhere in the codebase; always read
    // from config('applications.max_active_applications_per_student').
    'max_active_applications_per_student' => 5,

    // A student may withdraw freely only while their application is in one
    // of these statuses. Any other status is terminal for withdrawal purposes.
    'withdrawable_statuses' => ['submitted', 'under_review', 'interview_scheduled'],

    // Hours before application_deadline after which new applications are
    // blocked even if the deadline technically has not passed yet (buffer
    // for the company to review before close).
    // 0 disables the buffer entirely (current assumption — not confirmed).
    'deadline_buffer_hours' => 0,
];
