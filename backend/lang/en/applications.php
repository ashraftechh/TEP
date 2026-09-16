<?php

declare(strict_types=1);

return [
    // Eligibility errors
    'opportunity_not_published' => 'This training opportunity is not accepting applications.',
    'deadline_passed' => 'The application deadline for this opportunity has passed.',
    'opportunity_at_capacity' => 'This opportunity has reached its maximum accepted applicants. No further applications are accepted.',
    'already_applied' => 'You have already submitted an active application for this opportunity.',
    'student_already_assigned' => 'You already have an active or suspended training assignment and cannot apply to new opportunities.',
    'active_cap_reached' => 'You have reached the maximum of :cap concurrent active applications (current: :count). You must withdraw or wait for a decision on an existing application before applying to another opportunity.',

    // General application messages
    'submitted_successfully' => 'Your application has been submitted successfully.',
    'withdrawn_successfully' => 'Your application has been withdrawn.',
    'withdrawn_due_to_other_assignment' => 'Automatically withdrawn because the student was assigned to another training placement.',
    'not_found' => 'Application not found.',
    'cannot_withdraw' => 'This application cannot be withdrawn from its current status.',
    'version_mismatch' => 'This application was modified by another process. Please reload before retrying.',
    'decision_recorded' => 'Decision recorded successfully.',
    'list_fetched' => 'Applications retrieved successfully.',

    // Accept / Reject
    'cannot_accept' => 'This application cannot be accepted from its current status.',
    'cannot_reject' => 'This application cannot be rejected from its current status.',
    'capacity_reached' => 'This opportunity has already reached its accepted-student capacity.',

    // Schedule Interview
    'cannot_schedule_interview' => 'This application cannot have an interview scheduled from its current status.',
    'interview_scheduled_successfully' => 'Interview scheduled successfully.',

    // Company applications review
    'company_not_found' => 'No company is associated with your account.',
    'cannot_review' => 'This application cannot be put under review from its current status.',
    'review_started_successfully' => 'Application is now under review.',

    // Transition history
    'transitions_fetched' => 'Application history retrieved successfully.',
];
