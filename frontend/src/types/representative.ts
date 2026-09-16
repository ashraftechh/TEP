export interface CompanyRepresentativeItem {
  id: number;
  user_id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  is_primary: boolean;
  avatar_url: string | null;
  joined_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface RepresentativesResponse {
  data: CompanyRepresentativeItem[];
  is_admin: boolean;
  message: string;
}

export interface InviteRepresentativePayload {
  email: string;
}

export interface UpdateRepresentativePayload {
  id?: number;
  job_title: string | null;
}

export interface CompanyRepresentativesState {
  representatives: CompanyRepresentativeItem[];
  isAdmin: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  inviteStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  updateStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  removeStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  validationErrors: Record<string, string[]> | null;
}
