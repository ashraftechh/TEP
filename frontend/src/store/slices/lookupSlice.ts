import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';
import axios from 'axios';
import type { OpportunityTypeItem, TrainingCycleItem } from '@/types/opportunity';
import type { ReportTypeItem } from '@/types/reports';

export interface LocalizedName {
  ar?: string;
  en?: string;
  [key: string]: string | undefined;
}

export interface MajorItem {
  id: number;
  code: string;
  name: string | LocalizedName;
  is_active: boolean;
}

export interface IndustryItem {
  id: number;
  code: string;
  name: string | LocalizedName;
  is_active: boolean;
}

export interface SkillItem {
  id: number;
  category_id?: number | null;
  name: string | LocalizedName;
  is_active: boolean;
}

export interface LookupState {
  majors: MajorItem[];
  industries: IndustryItem[];
  skills: SkillItem[];
  opportunityTypes: OpportunityTypeItem[];
  trainingCycles: TrainingCycleItem[];
  reportTypes: ReportTypeItem[];
  isLoadingMajors: boolean;
  isLoadingIndustries: boolean;
  isLoadingSkills: boolean;
  isLoadingOpportunityTypes: boolean;
  isLoadingTrainingCycles: boolean;
  isLoadingReportTypes: boolean;
  majorsError: string | null;
  industriesError: string | null;
  skillsError: string | null;
  opportunityTypesError: string | null;
  trainingCyclesError: string | null;
  reportTypesError: string | null;
}

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

export const fetchMajors = createAsyncThunk<MajorItem[], void, { rejectValue: string }>(
  'lookup/fetchMajors',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<{ data: MajorItem[] }>('/majors');
      return response.data.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        return rejectWithValue(err.response.data.message);
      }
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to load majors');
    }
  }
);

export const fetchIndustries = createAsyncThunk<IndustryItem[], void, { rejectValue: string }>(
  'lookup/fetchIndustries',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<{ data: IndustryItem[] }>('/industries');
      return response.data.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        return rejectWithValue(err.response.data.message);
      }
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to load industries');
    }
  }
);

export const fetchSkills = createAsyncThunk<SkillItem[], void, { rejectValue: string }>(
  'lookup/fetchSkills',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<{ data: SkillItem[] }>('/skills');
      return response.data.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        return rejectWithValue(err.response.data.message);
      }
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to load skills');
    }
  }
);

export const fetchOpportunityTypes = createAsyncThunk<
  OpportunityTypeItem[],
  void,
  { rejectValue: string }
>('lookup/fetchOpportunityTypes', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<{ data: OpportunityTypeItem[] }>('/opportunity-types');
    return response.data.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      return rejectWithValue(err.response.data.message);
    }
    return rejectWithValue(err instanceof Error ? err.message : 'Failed to load opportunity types');
  }
});

export const fetchTrainingCycles = createAsyncThunk<
  TrainingCycleItem[],
  void,
  { rejectValue: string }
>('lookup/fetchTrainingCycles', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<{ data: TrainingCycleItem[] }>('/training-cycles');
    return response.data.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data?.message) {
      return rejectWithValue(err.response.data.message);
    }
    return rejectWithValue(err instanceof Error ? err.message : 'Failed to load training cycles');
  }
});

// TEP-675 dependency — GET /api/v1/report-types (permission report_types.view_any).
// Unlike the other lookups above, this endpoint requires authentication, since
// report types are not public reference data — see routes/api.php.
export const fetchReportTypes = createAsyncThunk<ReportTypeItem[], void, { rejectValue: string }>(
  'lookup/fetchReportTypes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get<{ data: ReportTypeItem[] }>('/report-types');
      return response.data.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        return rejectWithValue(err.response.data.message);
      }
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to load report types');
    }
  }
);

export const lookupSlice = createSlice({
  name: 'lookup',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Majors
    builder
      .addCase(fetchMajors.pending, (state) => {
        state.isLoadingMajors = true;
        state.majorsError = null;
      })
      .addCase(fetchMajors.fulfilled, (state, action) => {
        state.isLoadingMajors = false;
        state.majors = action.payload;
        state.majorsError = null;
      })
      .addCase(fetchMajors.rejected, (state, action) => {
        state.isLoadingMajors = false;
        state.majorsError = action.payload || 'Failed to load majors';
      });

    // Industries
    builder
      .addCase(fetchIndustries.pending, (state) => {
        state.isLoadingIndustries = true;
        state.industriesError = null;
      })
      .addCase(fetchIndustries.fulfilled, (state, action) => {
        state.isLoadingIndustries = false;
        state.industries = action.payload;
        state.industriesError = null;
      })
      .addCase(fetchIndustries.rejected, (state, action) => {
        state.isLoadingIndustries = false;
        state.industriesError = action.payload || 'Failed to load industries';
      });

    // Skills
    builder
      .addCase(fetchSkills.pending, (state) => {
        state.isLoadingSkills = true;
        state.skillsError = null;
      })
      .addCase(fetchSkills.fulfilled, (state, action) => {
        state.isLoadingSkills = false;
        state.skills = action.payload;
        state.skillsError = null;
      })
      .addCase(fetchSkills.rejected, (state, action) => {
        state.isLoadingSkills = false;
        state.skillsError = action.payload || 'Failed to load skills';
      });

    // Opportunity Types
    builder
      .addCase(fetchOpportunityTypes.pending, (state) => {
        state.isLoadingOpportunityTypes = true;
        state.opportunityTypesError = null;
      })
      .addCase(fetchOpportunityTypes.fulfilled, (state, action) => {
        state.isLoadingOpportunityTypes = false;
        state.opportunityTypes = action.payload;
        state.opportunityTypesError = null;
      })
      .addCase(fetchOpportunityTypes.rejected, (state, action) => {
        state.isLoadingOpportunityTypes = false;
        state.opportunityTypesError = action.payload || 'Failed to load opportunity types';
      });

    // Training Cycles
    builder
      .addCase(fetchTrainingCycles.pending, (state) => {
        state.isLoadingTrainingCycles = true;
        state.trainingCyclesError = null;
      })
      .addCase(fetchTrainingCycles.fulfilled, (state, action) => {
        state.isLoadingTrainingCycles = false;
        state.trainingCycles = action.payload;
        state.trainingCyclesError = null;
      })
      .addCase(fetchTrainingCycles.rejected, (state, action) => {
        state.isLoadingTrainingCycles = false;
        state.trainingCyclesError = action.payload || 'Failed to load training cycles';
      });

    // Report Types
    builder
      .addCase(fetchReportTypes.pending, (state) => {
        state.isLoadingReportTypes = true;
        state.reportTypesError = null;
      })
      .addCase(fetchReportTypes.fulfilled, (state, action) => {
        state.isLoadingReportTypes = false;
        state.reportTypes = action.payload;
        state.reportTypesError = null;
      })
      .addCase(fetchReportTypes.rejected, (state, action) => {
        state.isLoadingReportTypes = false;
        state.reportTypesError = action.payload || 'Failed to load report types';
      });
  },
});

export default lookupSlice.reducer;
