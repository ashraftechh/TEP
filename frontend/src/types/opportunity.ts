export interface LocalizedString {
  ar?: string;
  en?: string;
  [key: string]: string | undefined;
}

export interface MajorItem {
  id: number;
  code: string;
  name: LocalizedString | string;
  is_active: boolean;
}

export interface SkillItem {
  id: number;
  category_id?: number | null;
  name: LocalizedString | string;
  is_active: boolean;
}

export interface OpportunityTypeItem {
  id: number;
  code: string;
  name: LocalizedString | string;
  is_active: boolean;
}

export interface TrainingCycleItem {
  id: number;
  name: LocalizedString | string;
  academic_year?: string;
  semester?: string | null;
  application_start_at?: string | null;
  application_end_at?: string | null;
  end_date?: string | null;
  status: 'draft' | 'active' | 'closed' | 'archived';
}

export interface OpportunityRequirementItem {
  id?: number;
  requirement_text: LocalizedString | string;
  sort_order: number;
}

export interface OpportunityBenefitItem {
  id?: number;
  benefit_text: LocalizedString | string;
  sort_order: number;
}

import type { CompanyData } from './company';

export interface OpportunityItem {
  id: number;
  company_id: number;
  company?: CompanyData | null;
  opportunity_type_id: number;
  opportunity_type?: OpportunityTypeItem | null;
  training_cycle_id?: number | null;
  training_cycle?: TrainingCycleItem | null;
  created_by: number;
  title: LocalizedString | string;
  department?: LocalizedString | string | null;
  description: LocalizedString | string;
  work_mode: 'full_time' | 'part_time' | 'remote' | 'hybrid';
  location?: string | null;
  duration?: string | null;
  capacity: number;
  accepted_count?: number;
  applicants_count?: number;
  applications_count?: number;
  salary?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  application_deadline?: string | null;
  status: 'draft' | 'published' | 'closed' | 'archived' | 'completed';
  version: number;
  majors?: MajorItem[];
  skills?: SkillItem[];
  requirements?: OpportunityRequirementItem[];
  benefits?: OpportunityBenefitItem[];
  applied?: boolean;
  already_applied?: boolean;
  has_active_assignment?: boolean;
  application_open?: boolean;
  rating?: number;
  created_at?: string;
  updated_at?: string;
}

export interface OpportunityFilterParams {
  q?: string;
  major_id?: number | string;
  skill_id?: number | string;
  opportunity_type_id?: number | string;
  is_remote?: boolean | string;
  location?: string;
  page?: number;
  per_page?: number;
}

export interface CreateOpportunityPayload {
  title_ar: string;
  title_en: string;
  department_ar?: string;
  department_en?: string;
  description_ar: string;
  description_en: string;
  opportunity_type_id: number;
  training_cycle_id?: number | null;
  work_mode?: 'full_time' | 'part_time' | 'remote' | 'hybrid';
  location?: string;
  duration?: string;
  capacity: number;
  salary?: number | null;
  start_date?: string;
  end_date?: string;
  application_deadline?: string;
  major_ids?: number[];
  skill_ids?: number[];
  requirements_ar?: string[];
  requirements_en?: string[];
  benefits_ar?: string[];
  benefits_en?: string[];
}

export interface UpdateOpportunityPayload extends Partial<CreateOpportunityPayload> {
  version: number;
}

export interface TransitionOpportunityPayload {
  to_status: 'published' | 'closed' | 'archived';
  version: number;
}
