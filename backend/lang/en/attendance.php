<?php

declare(strict_types=1);

return [
    'fetched_successfully' => 'Attendance records retrieved successfully.',
    'recorded_successfully' => 'Attendance record recorded successfully.',
    'approved_successfully' => 'Attendance record approved successfully.',
    'rejected_successfully' => 'Attendance record rejected successfully.',
    'already_recorded' => 'Attendance has already been recorded for this student on the selected date.',
    'assignment_not_active' => 'Cannot record attendance. The training placement is not active.',

    'status' => [
        'present' => 'Present',
        'absent' => 'Absent',
        'late' => 'Late',
        'excused' => 'Excused',
    ],

    'approval_status' => [
        'all' => 'All',
        'pending' => 'Pending Approval',
        'approved' => 'Approved',
        'rejected' => 'Rejected',
    ],

    'validation' => [
        'reason_required_for_non_present' => 'A reason is required when the student is not present.',
        'rejection_reason_required' => 'A rejection reason is required.',
        'date_cannot_be_future' => 'Attendance date cannot be in the future.',
    ],

    'filament' => [
        'resource' => [
            'title' => 'Attendance Records',
            'singular' => 'Attendance Record',
            'navigation_group' => 'Training Management & Monitoring',
        ],
        'columns' => [
            'student' => 'Student',
            'student_number' => 'Student No.',
            'company' => 'Company',
            'date' => 'Attendance Date',
            'status' => 'Status',
            'reason' => 'Reason',
            'approval_status' => 'Approval Status',
            'recorded_by' => 'Recorded By',
            'approved_by' => 'Approved By',
            'approved_at' => 'Approved At',
        ],
        'actions' => [
            'approve' => [
                'label' => 'Approve',
                'modal_heading' => 'Approve Attendance Record',
                'modal_description' => 'Are you sure you want to approve this attendance record?',
                'success_notification' => 'Attendance record approved successfully.',
            ],
            'reject' => [
                'label' => 'Reject',
                'modal_heading' => 'Reject Attendance Record',
                'modal_description' => 'Please provide a reason for rejecting this attendance record.',
                'reason_label' => 'Rejection Reason',
                'reason_placeholder' => 'State the reason for rejecting this attendance record...',
                'success_notification' => 'Attendance record rejected successfully.',
            ],
        ],
    ],
];
