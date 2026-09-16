import { type LocalizedName } from '@/store/slices/lookupSlice';

export interface ProfileSkill {
  id: number;
  name: string | LocalizedName;
  proficiency?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | string | null;
}

export interface StudentProfileData {
  id: number;
  student_number: string;
  major_id: number | null;
  university_name: string;
  level_year: number | null;
  gpa: string | number | null;
  bio: string | null;
  phone: string | null;
  address: string | null;
  avatar_file_id?: number | null;
  avatar_url?: string | null;
  cv_file_id?: number | null;
  cv_file?: {
    id: number;
    original_name: string;
    url: string;
    mime_type?: string;
    size_bytes?: number;
  } | null;
  expected_graduation: string | null;
  interests: string[] | null;
  languages: string[] | null;
  achievements: string[] | null;
  major: {
    id: number;
    name: string | LocalizedName;
    code: string;
  } | null;
  skills: ProfileSkill[];
}

export interface AcademicSupervisorProfileData {
  id: number;
  department_id: number;
  avatar_file_id?: number | null;
  avatar_url?: string | null;
  department: {
    id: number;
    name: string | LocalizedName;
    code: string;
  } | null;
}

export interface TrainingCoordinatorProfileData {
  id: number;
  department_id: number;
  avatar_file_id?: number | null;
  avatar_url?: string | null;
  department: {
    id: number;
    name: string | LocalizedName;
    code: string;
  } | null;
}

export interface CompanyRepresentativeData {
  id: number;
  company_id: number;
  job_title: string | null;
  avatar_file_id?: number | null;
  avatar_url?: string | null;
  is_primary: boolean;
  company: {
    id: number;
    name: string | LocalizedName;
    status: string;
    industry_id?: number;
  } | null;
}

export interface SsoIdentityData {
  id: number;
  provider: 'google' | 'microsoft';
  provider_email: string;
}

export interface UserRoleData {
  id: number;
  name: string;
  label: string | LocalizedName;
  scope_type?: string | null;
  scope_id?: number | null;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  avatar_url?: string | null;
  status: string;
  has_password?: boolean;
  email_verified_at: string | null;
  roles: UserRoleData[];
  student_profile?: StudentProfileData | null;
  academic_supervisor_profile?: AcademicSupervisorProfileData | null;
  training_coordinator_profile?: TrainingCoordinatorProfileData | null;
  company_representative?: CompanyRepresentativeData | null;
  sso_identities?: SsoIdentityData[];
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UpdateProfilePayload {
  name?: string;
  phone?: string | null;
  job_title?: string | null;
  avatar_file_id?: number | null;
  bio?: string | null;
  address?: string | null;
  expected_graduation?: string | null;
  interests?: string[];
  languages?: string[];
  achievements?: string[];
}
