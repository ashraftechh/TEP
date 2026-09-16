export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export type AttendanceApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface AttendancePerson {
  id: number;
  name: string;
  email?: string;
}

export interface AttendanceRecordItem {
  id: number;
  training_assignment_id: number;
  attendance_date: string;
  status: AttendanceStatus;
  reason: string | null;
  recorded_by: number | null;
  approval_status: AttendanceApprovalStatus;
  approved_by: number | null;
  approved_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  recorder?: AttendancePerson | null;
  approver?: AttendancePerson | null;
}

export interface AttendanceSummary {
  total_days: number;
  valid_days?: number;
  present_days: number;
  absent_days: number;
  late_days: number;
  excused_days: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
}

export interface RecordAttendancePayload {
  attendance_date: string;
  status: AttendanceStatus;
  reason?: string | null;
}

export interface AttendanceFilterParams {
  status?: AttendanceStatus;
  approval_status?: AttendanceApprovalStatus;
  month?: string; // e.g. YYYY-MM
  from?: string;
  to?: string;
}
