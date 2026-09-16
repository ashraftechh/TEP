<?php

declare(strict_types=1);

return [
    'created_successfully' => 'Training assignment created successfully.',
    'updated_successfully' => 'Training assignment updated successfully.',
    'fetched_successfully' => 'Training assignment retrieved successfully.',
    'transitioned_successfully' => 'Training assignment status updated successfully.',
    'no_active_assignment' => 'You do not have an active training placement yet.',
    'cannot_create_from_status' => 'A training assignment can only be created from an accepted application.',
    'already_exists' => 'A training assignment already exists for this application.',
    'student_already_assigned' => 'This student already has an active or suspended training assignment.',
    'invalid_transition' => 'Cannot change the training assignment status from :from to :to.',

    'validation' => [
        'user_missing_role' => 'The selected user does not hold the :role role.',
        'field_supervisor_wrong_company' => 'The selected field supervisor must belong to the same company as the opportunity.',
        'reason_required' => 'A reason is required when suspending or terminating a training assignment.',
    ],

    'resource' => [
        'title' => 'Training Assignments',
        'singular' => 'Training Assignment',
        'navigation_group' => 'Training Management & Monitoring',
    ],

    'form' => [
        'application' => 'Accepted Application',
        'academic_supervisor' => 'Academic Supervisor',
        'field_supervisor' => 'Field Supervisor',
        'field_supervisor_hint' => 'Optional — select an accepted application first; only representatives of that opportunity\'s company are shown.',
        'start_date' => 'Start Date',
        'end_date' => 'End Date',
        'required_reports_count' => 'Total Required Reports',
        'report_configuration_section' => 'Report Requirements & Schedule',
        'duration_summary' => 'Calculated Duration: :days days (:weeks weeks, :months months)',
        'enable_daily_reports' => 'Enable Daily Reports',
        'daily_reports_count' => 'Daily Reports Count',
        'enable_weekly_reports' => 'Enable Weekly Reports',
        'weekly_reports_count' => 'Weekly Reports Count',
        'enable_monthly_reports' => 'Enable Monthly Reports',
        'monthly_reports_count' => 'Monthly Reports Count',
        'require_final_report' => 'Require Final Report',
        'required_reports_calculated_hint' => 'Automatically calculated from enabled report quotas above.',
        'filter_section' => 'Filter Applications',
        'filter_section_hint' => 'Use filters to narrow the application list below.',
        'filter_by_company' => 'Filter by Company',
        'filter_by_opportunity' => 'Filter by Opportunity',
        'filter_by_student' => 'Filter by Student',
        'all_companies' => 'All companies',
        'all_opportunities' => 'All opportunities',
        'all_students' => 'All students',
    ],

    'columns' => [
        'student' => 'Student',
        'company' => 'Company',
        'academic_supervisor' => 'Academic Supervisor',
        'field_supervisor' => 'Field Supervisor',
        'status' => 'Status',
        'start_date' => 'Start Date',
        'end_date' => 'End Date',
        'progress' => 'Progress',
    ],

    'infolist' => [
        'student_section' => 'Student Information',
        'placement_section' => 'Training Placement & Opportunity',
        'supervisors_section' => 'Supervisors & Coordination',
        'report_config_section' => 'Report Requirements & Schedule',
        'reports_summary' => 'Reports Breakdown',
        'student_number' => 'Student ID',
        'major' => 'Major',
        'university' => 'University',
        'opportunity' => 'Opportunity',
        'coordinator' => 'Training Coordinator',
        'daily_reports' => 'Daily Reports',
        'weekly_reports' => 'Weekly Reports',
        'monthly_reports' => 'Monthly Reports',
        'final_report' => 'Final Report',
        'enabled' => 'Enabled',
        'disabled' => 'Disabled',
    ],

    'statuses' => [
        'active' => 'Active',
        'suspended' => 'Suspended',
        'completed' => 'Completed',
        'terminated' => 'Terminated',
    ],

    'actions' => [
        'create' => 'Create Training Assignment',
        'edit' => [
            'label' => 'Edit',
            'modal_heading' => 'Edit Training Assignment',
        ],
        'view_details' => [
            'label' => 'View Details',
            'modal_heading' => 'Training Assignment Details',
        ],
        'view' => 'View',
        'suspend' => [
            'label' => 'Suspend',
            'modal_heading' => 'Suspend Training Assignment',
            'modal_description' => 'The student and field supervisor will be notified. This can be reversed later with "Reactivate".',
            'reason_label' => 'Reason for suspension',
            'reason_placeholder' => 'Explain why this training assignment is being suspended...',
            'success_notification' => 'Training assignment suspended.',
        ],
        'terminate' => [
            'label' => 'Terminate',
            'modal_heading' => 'Terminate Training Assignment',
            'modal_description' => 'This ends the training placement permanently and cannot be undone.',
            'reason_label' => 'Reason for termination',
            'reason_placeholder' => 'Explain why this training assignment is being terminated...',
            'success_notification' => 'Training assignment terminated.',
        ],
        'reactivate' => [
            'label' => 'Reactivate',
            'modal_heading' => 'Reactivate Training Assignment',
            'modal_description' => 'This will resume the suspended training placement.',
            'success_notification' => 'Training assignment reactivated.',
        ],
        'mark_completed' => [
            'label' => 'Mark Completed',
            'modal_heading' => 'Mark Training Assignment as Completed',
            'modal_description' => 'This marks the placement as finished. This status is terminal and cannot be changed afterwards.',
            'success_notification' => 'Training assignment marked as completed.',
        ],
    ],
];
