import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { OpportunitiesManagementPage } from './OpportunitiesManagementPage';
import { StudentOpportunitiesPage } from './StudentOpportunitiesPage';

/**
 * Role-aware opportunities page dispatcher.
 * - Company Representatives see their Opportunity Management dashboard.
 * - Students see the Available Training Opportunities browse grid.
 */
export const OpportunitiesPage: React.FC = () => {
  const { hasRole } = usePermissions();

  if (hasRole('company_representative')) {
    return <OpportunitiesManagementPage />;
  }

  return <StudentOpportunitiesPage />;
};

export default OpportunitiesPage;
