import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { StudentReportsPage } from './StudentReportsPage';
import { SupervisorReportsPage } from './SupervisorReportsPage';

/**
 * Role-aware reports page dispatcher.
 * - Academic supervisors (role academic_supervisor or permission reports.review) see SupervisorReportsPage.
 * - Students see StudentReportsPage.
 */
export const ReportsPage: React.FC = () => {
  const permissions = usePermissions();

  const isSupervisor =
    Boolean(permissions.hasRole?.('academic_supervisor')) ||
    Boolean(typeof permissions.can === 'function' && permissions.can('reports.review')) ||
    Boolean(
      typeof permissions.hasPermission === 'function' && permissions.hasPermission('reports.review')
    );

  if (isSupervisor) {
    return <SupervisorReportsPage />;
  }

  return <StudentReportsPage />;
};

export default ReportsPage;
