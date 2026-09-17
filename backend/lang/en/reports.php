<?php

declare(strict_types=1);

return [
    'created_successfully' => 'Report draft created successfully.',
    'updated_successfully' => 'Report updated successfully.',
    'submitted_successfully' => 'Report submitted successfully.',
    'no_active_assignment' => 'You must have an active training placement to create a report.',
    'duplicate_report' => 'A report of this type and number already exists for your placement.',
    'duplicate_final_report' => 'A final report has already been created for your placement.',
    'not_editable' => 'This report can no longer be edited.',
    'not_submittable' => 'Cannot submit a report that is not in draft or revision requested status.',
    'reviewed_successfully' => 'Report reviewed successfully.',
    'not_reviewable' => 'This report cannot be reviewed in its current status.',
    'training_completed' => 'Your training is complete (final report approved). No further reports can be created or submitted.',
    'report_type_not_allowed' => 'This report type is not enabled for your training assignment.',
    'report_quota_exceeded' => 'You have reached the maximum allowed number of reports for this type or assignment.',
    'report_sequence_not_met' => 'You must complete and get approval for all :prerequisite_type reports before creating a :type report.',

    'validation' => [
        'feedback_required' => 'Feedback is required.',
        'feedback_required_reject' => 'A reason is required to reject a report.',
        'feedback_required_revision' => 'A reason is required to request revision on a report.',
        'grade_required_on_approval' => 'A grade is required when approving a report.',
    ],

    'status' => [
        'draft' => 'Draft',
        'submitted' => 'Submitted',
        'under_review' => 'Under Review',
        'approved' => 'Approved',
        'revision_requested' => 'Revision Requested',
        'rejected' => 'Rejected',
    ],
];