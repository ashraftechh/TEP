<?php

declare(strict_types=1);

return [
    'request_submitted_successfully' => 'Company registration request submitted successfully. It will be reviewed by the administration.',
    'request_already_exists' => 'A registration request for this company already exists.',
    'profile_retrieved' => 'Company profile retrieved successfully.',
    'profile_updated_successfully' => 'Company profile updated successfully.',
    'logo_uploaded_successfully' => 'Company logo uploaded successfully.',
    'no_company' => 'No company is associated with your account.',
    'company_suspended' => 'Your company account is suspended. This action cannot be performed.',

    'dashboard' => [
        'title' => 'Overview',
        'navigation' => 'Overview',
    ],

    'resource' => [
        'brand_name' => 'Cooperative Training Platform | Saba Region University',
        'title' => 'Company Requests',
        'singular' => 'Company Request',
        'navigation_group' => 'Companies & Training Partners',
        'list_title' => 'Company Requests Queue',
    ],

    'columns' => [
        'name' => 'Company Name',
        'email' => 'Contact Email',
        'contact_email' => 'Company Contact Email',
        'representative_email' => 'Representative Personal Email',
        'email_unverified' => 'Unverified Email',
        'phone' => 'Phone Number',
        'industry' => 'Industry',
        'registration_number' => 'Registration Number',
        'status' => 'Status',
        'submitted_at' => 'Submitted Date',
        'actions' => 'Actions',
        'website' => 'Website',
        'description' => 'Description',
        'representatives' => 'Representatives',
        'representative_active' => 'Claimed by :name',
        'representative_pending' => 'Pending representative claim',
        'primary_representative' => 'Primary Representative',
        'no_representatives' => 'No representative has activated their account via the invitation link yet.',
    ],

    'statuses' => [
        'pending_verification' => 'Pending Verification',
        'under_review' => 'Under Review',
        'approved' => 'Approved',
        'rejected' => 'Rejected',
        'changes_requested' => 'Changes Requested',
        'suspended' => 'Suspended',
        'all' => 'All',
        'deleted' => 'Deleted',
    ],

    'actions' => [
        'approve' => [
            'label' => 'Approve Request',
            'modal_heading' => 'Approve Company Registration Request',
            'modal_description' => 'Are you sure you want to approve this company? A signed claim invitation will be sent to the contact email immediately.',
            'success_notification' => 'Company approved successfully and invitation sent to the contact email.',
            'success_no_mail_notification' => 'Company approved successfully.',
        ],
        'reject' => [
            'label' => 'Reject / Request Changes',
            'modal_heading' => 'Decision on Company Registration Request',
            'status_label' => 'Decision Type',
            'status_options' => [
                'rejected' => 'Reject Application',
                'changes_requested' => 'Request Information / Changes',
            ],
            'reason_label' => 'Reason / Coordinator Feedback',
            'reason_placeholder' => 'Explain the reason or specify the missing details/documents clearly...',
            'success_notification' => 'Decision recorded and company contact notified successfully.',
            'success_no_mail_notification' => 'Decision recorded successfully.',
        ],
        'view_details' => [
            'label' => 'View Details',
            'modal_heading' => 'Company Registration Details',
            'unverified_email_alert' => 'Notice: This contact email is not verified yet. The company will prove ownership via the signed invite URL on approval.',
        ],
        'suspend' => [
            'label' => 'Suspend',
            'modal_heading' => 'Suspend Company Account',
            'modal_description' => 'Are you sure you want to suspend this company?',
            'reason_label' => 'Suspension Reason',
            'reason_placeholder' => 'Enter the reason for suspension...',
            'success_notification' => 'Company suspended successfully.',
        ],
        'reactivate' => [
            'label' => 'Reactivate',
            'modal_heading' => 'Reactivate Suspended Company',
            'modal_description' => 'Are you sure you want to reactivate this approved company?',
            'success_notification' => 'Company reactivated successfully.',
        ],
        'mail_failure' => [
            'title' => 'Email Notification Not Sent',
            'body' => 'The action was completed successfully, but the notification email could not be sent. Please check the mail server connection.',
        ],
    ],

    'representatives_management' => [
        'list_retrieved' => 'Company representatives retrieved successfully.',
        'invite_sent' => 'Invitation sent successfully.',
        'updated_successfully' => 'Representative updated successfully.',
        'removed_successfully' => 'Representative removed successfully.',
        'left_successfully' => 'You have left the company successfully.',
        'already_representative' => 'This user is already a representative of this company.',
        'admin_only' => 'Only the primary representative can perform this action.',
        'not_found' => 'Representative not found or does not belong to your company.',
        'no_company' => 'No company is associated with your representative account.',
        'mail_failure' => 'Failed to send invitation email. Please check the mail server connection and try again.',
        'last_representative' => 'You cannot leave the company because you are the only representative. Add another representative first or contact the administration.',
    ],

    'attributes' => [
        'name_ar' => 'Company name (Arabic)',
        'name_en' => 'Company name (English)',
        'description_ar' => 'Company description (Arabic)',
        'description_en' => 'Company description (English)',
        'industry_id' => 'Industry',
        'registration_number' => 'Commercial registration number',
        'email' => 'Contact email',
        'phone' => 'Phone number',
        'website' => 'Website',
        'address' => 'Address',
        'city' => 'City',
        'established_year' => 'Established year',
        'employees_count' => 'Employees count',
    ],
];
