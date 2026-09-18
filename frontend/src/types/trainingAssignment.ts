import type { ApplicationItem } from './application';

export type TrainingAssignmentStatus = 'active' | 'suspended' | 'completed' | 'terminated';

export interface TrainingAssignmentCompany {
  id: number;
  name: Record<string, string> | string;
  logo_url?: string | null;
}

export interface TrainingAssignmentOpportunity {
  id: number;
  title: Record<string, string> | string;
}

export interface TrainingAssignmentStudentProfile {
  id: number;
  student_number: string;
  gpa: string | number | null;
  phone?: string | null;
  avatar_url?: string | null;
  major?: {
    id: number;
    name: Record<string, string>;
  } | null;
  user?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface TrainingAssignmentPerson {
  id: number;
  name: string;
  email?: string;
}

export interface ReportTypeConfigItem {
  enabled: boolean;
  max_count: number;
}

export interface AssignmentReportConfiguration {
  daily?: ReportTypeConfigItem;
  weekly?: ReportTypeConfigItem;
  monthly?: ReportTypeConfigItem;
  final?: ReportTypeConfigItem;
  [key: string]: ReportTypeConfigItem | undefined;
}

// TEP-665: `reports_submitted_count` / `latest_attendance_status` are only
// present when the endpoint computed them (both training-assignments
// endpoints do) — optional here because the resource also serves the
// TEP-661 create-assignment response, which doesn't include them.
export interface TrainingAssignmentItem {
  id: number;
  application_id: number;
  student_profile_id: number;
  company_id: number;
  opportunity_id: number;
  academic_supervisor_id: number | null;
  field_supervisor_id: number | null;
  training_coordinator_id: number | null;
  status: TrainingAssignmentStatus;
  is_current: boolean;
  start_date: string | null;
  end_date: string | null;
  progress_percentage: number;
  required_reports_count: number | null;
  report_configuration?: AssignmentReportConfiguration | null;
  total_reports?: number | null;
  reports_submitted_count?: number;
  latest_attendance_status?: 'present' | 'absent' | 'late' | 'excused' | null;
  suspension_reason: string | null;
  termination_reason: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  company?: TrainingAssignmentCompany;
  opportunity?: TrainingAssignmentOpportunity;
  student_profile?: TrainingAssignmentStudentProfile;
  academic_supervisor?: TrainingAssignmentPerson | null;
  field_supervisor?: TrainingAssignmentPerson | null;
  training_coordinator?: TrainingAssignmentPerson | null;
  application?: ApplicationItem | null;
}

export interface TrainingAssignmentListParams {
  status?: TrainingAssignmentStatus;
  q?: string;
  page?: number;
  per_page?: number;
}
