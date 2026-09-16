import { type LocalizedName } from '@/store/slices/lookupSlice';

export type CompanyStatus =
  | 'pending_verification'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'suspended';

export interface CompanyIndustry {
  id: number;
  code: string;
  name: string | LocalizedName;
  is_active?: boolean;
}

export interface CompanyData {
  id: number;
  name: { en: string; ar: string } | string;
  registration_number: string | null;
  industry_id: number | null;
  industry: CompanyIndustry | null;
  description: { en: string; ar: string } | string | null;
  email: string | null;
  contact_email?: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  established_year: number | null;
  employees_count: string | null;
  logo: string | null;
  logo_url?: string | null;
  logo_file_id: number | null;
  status: CompanyStatus;
  status_reason: string | null;
  stats?: {
    available_opportunities: number;
    accepted_students: number;
  };
  available_opportunities_count?: number;
  accepted_students_count?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UpdateCompanyProfilePayload {
  name_ar: string;
  name_en: string;
  description_ar?: string | null;
  description_en?: string | null;
  industry_id?: number | null;
  registration_number?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  established_year?: number | null;
  employees_count?: string | null;
}

export interface CompanyProfileResponse {
  data: CompanyData;
  message?: string;
}
