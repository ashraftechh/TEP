export interface ApplicationTransitionItem {
  id: number;
  from_status: string | null;
  to_status: string;
  reason: string | null;
  created_at: string;
  actor?: {
    id: number;
    name: string;
    // TEP-657: only present on GET /applications/{id}/transitions (the
    // dedicated history endpoint) — lets the UI show whether a change was
    // the student's own action or the company's. Absent on the lighter
    // `transitions`/`latest_transition` arrays embedded in mutation
    // responses (store/withdraw/accept/reject/interview).
    roles?: string[];
  } | null;
}

export interface ApplicationCvFile {
  id: number;
  original_name: string;
  url: string;
  mime_type?: string;
  size_bytes?: number;
}

export interface ApplicationStudentSkill {
  id: number;
  name: Record<string, string> | string;
}

// TEP-644: student summary shown on the company review list — name, major,
// GPA, skills. Only present when the endpoint eager-loaded studentProfile.
export interface ApplicationStudentProfile {
  id: number;
  student_number: string;
  avatar_url?: string | null;
  university_name?: string | null;
  level_year?: number | null;
  gpa: string | number | null;
  major?: {
    id: number;
    name: Record<string, string>;
  } | null;
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
  phone?: string | null;
  bio?: string | null;
  skills?: ApplicationStudentSkill[];
}

export interface ApplicationItem {
  id: number;
  opportunity_id: number;
  student_profile_id: number;
  cv_file_id: number;
  cover_note: string | null;
  status:
    'submitted' | 'under_review' | 'interview_scheduled' | 'accepted' | 'rejected' | 'withdrawn';
  interview_at: string | null;
  decision_reason: string | null;
  withdrawn_reason: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  cv_file?: ApplicationCvFile | null;
  transitions?: ApplicationTransitionItem[];
  // Only present on the company review list (TEP-644).
  student_profile?: ApplicationStudentProfile | null;

  // ── TEP-636: My Applications list fields ──────────────────────────────────
  // ASSUMPTION: withdrawable_statuses flagged in config/applications.php.
  // Computed server-side — do NOT re-derive on the client.
  can_withdraw: boolean;

  // Single most-recent transition for the "last updated" summary line.
  // Only present when the endpoint eager-loaded latestTransition.
  latest_transition?: ApplicationTransitionItem | null;

  // Eager-loaded opportunity + company (for the list view cards).
  opportunity?: {
    id: number;
    title: Record<string, string>;
    department?: Record<string, string> | null;
    location: string | null;
    duration: string | null;
    is_remote?: boolean;
    // TEP-650: capacity / accepted_count, used to disable the Accept button
    // once the opportunity's capacity is reached — computed server-side,
    // do NOT re-derive on the client.
    capacity?: number;
    accepted_count?: number;
    company?: {
      id: number;
      name: Record<string, string>;
      logo_url?: string | null;
    } | null;
  } | null;
}

// TEP-648/649: error response shape for accept/reject failures.
// `error_code: 'capacity_reached'` (409) additionally carries the current
// accepted_count/capacity so the UI can explain the constraint precisely.
export interface DecisionErrorResponse {
  message: string;
  error_code?: string;
  errors?: Record<string, string[]>;
  accepted_count?: number;
  capacity?: number;
}

// TEP-644: filter/sort params for GET /api/v1/company/applications.
export interface CompanyApplicationsParams {
  opportunity_id?: number | string;
  status?: string;
  sort_by?: 'created_at' | 'status';
  sort_dir?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export interface ApplyOpportunityPayload {
  opportunityId: number;
  cv_file_id: number;
  cover_note?: string;
}

export interface ApplyErrorResponse {
  message: string;
  error_code?: string;
  errors?: Record<string, string[]>;
}
