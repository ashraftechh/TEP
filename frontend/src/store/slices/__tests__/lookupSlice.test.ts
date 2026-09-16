import { describe, it, expect } from 'vitest';
import lookupReducer, {
  fetchMajors,
  fetchIndustries,
  fetchSkills,
  type LookupState,
  type MajorItem,
  type IndustryItem,
  type SkillItem,
} from '../lookupSlice';

describe('lookupSlice Reducer', () => {
  const initialState: LookupState = {
    majors: [],
    industries: [],
    skills: [],
    opportunityTypes: [],
    trainingCycles: [],
    reportTypes: [],
    isLoadingMajors: false,
    isLoadingIndustries: false,
    isLoadingSkills: false,
    isLoadingOpportunityTypes: false,
    isLoadingTrainingCycles: false,
    isLoadingReportTypes: false,
    majorsError: null,
    industriesError: null,
    skillsError: null,
    opportunityTypesError: null,
    trainingCyclesError: null,
    reportTypesError: null,
  };

  const mockMajors: MajorItem[] = [
    { id: 1, code: 'cs', name: { en: 'Computer Science', ar: 'علوم الحاسب' }, is_active: true },
    { id: 2, code: 'it', name: { en: 'IT', ar: 'تقنية المعلومات' }, is_active: true },
  ];

  const mockIndustries: IndustryItem[] = [
    { id: 1, code: 'tech', name: { en: 'Tech', ar: 'التقنية' }, is_active: true },
  ];

  it('handles fetchMajors.pending', () => {
    const nextState = lookupReducer(initialState, { type: fetchMajors.pending.type });
    expect(nextState.isLoadingMajors).toBe(true);
    expect(nextState.majorsError).toBeNull();
  });

  it('handles fetchMajors.fulfilled', () => {
    const nextState = lookupReducer(
      { ...initialState, isLoadingMajors: true },
      { type: fetchMajors.fulfilled.type, payload: mockMajors }
    );
    expect(nextState.isLoadingMajors).toBe(false);
    expect(nextState.majors).toEqual(mockMajors);
  });

  it('handles fetchMajors.rejected', () => {
    const nextState = lookupReducer(
      { ...initialState, isLoadingMajors: true },
      { type: fetchMajors.rejected.type, payload: 'Failed to fetch' }
    );
    expect(nextState.isLoadingMajors).toBe(false);
    expect(nextState.majorsError).toBe('Failed to fetch');
  });

  it('handles fetchIndustries.fulfilled', () => {
    const nextState = lookupReducer(
      { ...initialState, isLoadingIndustries: true },
      { type: fetchIndustries.fulfilled.type, payload: mockIndustries }
    );
    expect(nextState.isLoadingIndustries).toBe(false);
    expect(nextState.industries).toEqual(mockIndustries);
  });

  it('handles fetchSkills.fulfilled', () => {
    const mockSkills: SkillItem[] = [
      { id: 1, name: { en: 'React', ar: 'رياكت' }, is_active: true },
    ];
    const nextState = lookupReducer(
      { ...initialState, isLoadingSkills: true },
      { type: fetchSkills.fulfilled.type, payload: mockSkills }
    );
    expect(nextState.isLoadingSkills).toBe(false);
    expect(nextState.skills).toEqual(mockSkills);
  });
});
