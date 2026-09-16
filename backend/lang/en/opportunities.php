<?php

declare(strict_types=1);

return [
    'company_not_approved' => 'Your company must be approved by the university before you can manage training opportunities.',
    'created_successfully' => 'Opportunity draft created successfully.',
    'updated_successfully' => 'Opportunity updated successfully.',
    'transitioned_successfully' => 'Opportunity status updated successfully.',
    'not_found' => 'Training opportunity not found.',
    'version_mismatch' => 'This opportunity was modified by another user. Please reload the latest version before submitting.',
    'invalid_transition' => 'The requested status transition from :from to :to is invalid. Allowed transitions: :allowed.',
    'capacity_below_accepted' => 'The capacity cannot be reduced below the accepted applicants count (:count).',
    'cannot_edit_closed' => 'Closed, completed, or archived opportunities cannot be edited.',
    'unauthorized_company' => 'You are not authorized to manage opportunities for this company.',
];
