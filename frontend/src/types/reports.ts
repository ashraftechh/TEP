export interface LocalizedReportName {
  ar?: string;
  en?: string;
  [key: string]: string | undefined;
}

export type ReportStatus =
  'draft' | 'submitted' | 'under_review' | 'approved' | 'revision_requested' | 'rejected';

export interface ReportTypeItem {
  id: number;
  code: string;
  name: string | LocalizedReportName;
  is_active: boolean;
}

export interface ReportAttachment {
  id: number;
  original_name: string;
  url: string;
  mime_type: string;
  size_bytes: number;
}

export interface ReportReviewItem {
  id: number;
  decision: 'approved' | 'revision_requested' | 'rejected';
  feedback: string | null;
  created_at: string;
}

export interface ReportStudentInfo {
  id: number;
  student_number: string;
  name: string;
  email: string;
}

export interface ReviewerInfo {
  id: number;
  name: string;
  email: string;
}

export interface ReportReviewRecord {
  id: number;
  report_id: number;
  decision: 'approved' | 'revision_requested' | 'rejected';
  feedback: string | null;
  from_status?: string | null;
  to_status?: string | null;
  created_at: string;
  reviewer?: ReviewerInfo | null;
}

/**
 * Student-side quota/sequence gating numbers, scoped the same way as the
 * report list itself (role + include_history + explicit assignment) but
 * computed BEFORE pagination/optional filters, so they stay accurate no
 * matter which page or filter the list is currently showing. Keyed by
 * report_type_id (as a string, since it comes back through JSON object
 * keys). Only present for the student branch of GET /api/v1/reports.
 */
export interface ReportsSummary {
  total_count: number;
  type_counts: Record<string, number>;
  approved_type_counts: Record<string, number>;
  has_approved_final: boolean;
}

export interface ReportItem {
  id: number;
  training_assignment_id: number;
  is_current_assignment?: boolean;
  student?: ReportStudentInfo | null;
  opportunity?: {
    id: number;
    title: Record<string, string> | string;
  } | null;
  company?: {
    id: number;
    name: Record<string, string> | string;
  } | null;
  title: string;
  report_type_id: number;
  report_type?: ReportTypeItem | null;
  report_number: number;
  content: string;
  status: ReportStatus;
  grade: number | null;
  feedback?: string | null;
  latest_review?: ReportReviewItem | null;
  version: number;
  submitted_at: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
  files?: ReportAttachment[];
}

export interface CreateReportPayload {
  report_type_id: number;
  title: string;
  report_number: number;
  content: string;
  due_at?: string | null;
  file_ids?: number[];
}

export type UpdateReportPayload = Partial<CreateReportPayload>;

export interface ReviewReportPayload {
  decision: 'approved' | 'revision_requested' | 'rejected';
  feedback: string;
  grade?: number | null;
}
