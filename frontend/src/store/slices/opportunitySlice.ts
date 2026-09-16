import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/lib/api';
import axios from 'axios';
import type {
  CreateOpportunityPayload,
  OpportunityItem,
  OpportunityFilterParams,
  UpdateOpportunityPayload,
  TransitionOpportunityPayload,
} from '@/types/opportunity';

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number | null;
  to?: number | null;
}

export interface FetchOpportunitiesResult {
  data: OpportunityItem[];
  meta: PaginationMeta | null;
}

export interface OpportunityState {
  opportunities: OpportunityItem[];
  pagination: PaginationMeta | null;
  selectedOpportunity: OpportunityItem | null;
  isLoading: boolean;
  isCreating: boolean;
  createSuccess: boolean;
  error: string | null;
  createError: string | null;
  createErrorCode: string | null;
  isUpdating: boolean;
  updateSuccess: boolean;
  updateError: string | null;
  updateErrorCode: string | null;
  isTransitioning: boolean;
  transitionError: string | null;
  transitionErrorCode: string | null;
  validationErrors: Record<string, string[]>;
}

const initialState: OpportunityState = {
  opportunities: [],
  pagination: null,
  selectedOpportunity: null,
  isLoading: false,
  isCreating: false,
  createSuccess: false,
  error: null,
  createError: null,
  createErrorCode: null,
  isUpdating: false,
  updateSuccess: false,
  updateError: null,
  updateErrorCode: null,
  isTransitioning: false,
  transitionError: null,
  transitionErrorCode: null,
  validationErrors: {},
};

export const fetchOpportunities = createAsyncThunk<
  FetchOpportunitiesResult,
  OpportunityFilterParams | void,
  { rejectValue: string }
>('opportunity/fetchOpportunities', async (params, { rejectWithValue }) => {
  try {
    const response = await api.get<{
      data: OpportunityItem[];
      meta?: PaginationMeta;
    }>('/opportunities', {
      params: params || undefined,
    });

    if (Array.isArray(response.data)) {
      return { data: response.data, meta: null };
    }
    return {
      data: response.data.data ?? [],
      meta: response.data.meta ?? null,
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue(err.response.data?.message || 'Failed to load opportunities');
    }
    return rejectWithValue(err instanceof Error ? err.message : 'Unknown error occurred');
  }
});

export const fetchOpportunityById = createAsyncThunk<
  OpportunityItem,
  number,
  { rejectValue: string }
>('opportunity/fetchOpportunityById', async (id, { rejectWithValue }) => {
  try {
    const response = await api.get<{ data: OpportunityItem }>(`/opportunities/${id}`);
    return response.data.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue(err.response.data?.message || 'Failed to load opportunity');
    }
    return rejectWithValue(err instanceof Error ? err.message : 'Unknown error occurred');
  }
});

export const createOpportunity = createAsyncThunk<
  OpportunityItem,
  CreateOpportunityPayload,
  {
    rejectValue: {
      message: string;
      error_code?: string;
      errors?: Record<string, string[]>;
    };
  }
>('opportunity/createOpportunity', async (payload, { rejectWithValue }) => {
  try {
    const response = await api.post<{ data: OpportunityItem; message?: string }>(
      '/opportunities',
      payload
    );
    return response.data.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      const data = err.response.data;
      return rejectWithValue({
        message: data?.message || 'Failed to create training opportunity',
        error_code: data?.error_code,
        errors: data?.errors || {},
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  }
});

export const updateOpportunity = createAsyncThunk<
  OpportunityItem,
  { id: number; payload: UpdateOpportunityPayload },
  {
    rejectValue: {
      message: string;
      error_code?: string;
      errors?: Record<string, string[]>;
    };
  }
>('opportunity/updateOpportunity', async ({ id, payload }, { rejectWithValue }) => {
  try {
    const response = await api.patch<{ data: OpportunityItem; message?: string }>(
      `/opportunities/${id}`,
      payload
    );
    return response.data.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      const data = err.response.data;
      return rejectWithValue({
        message: data?.message || 'Failed to update training opportunity',
        error_code: data?.error_code,
        errors: data?.errors || {},
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  }
});

export const transitionOpportunity = createAsyncThunk<
  OpportunityItem,
  { id: number; payload: TransitionOpportunityPayload },
  {
    rejectValue: {
      message: string;
      error_code?: string;
      allowed_transitions?: string[];
    };
  }
>('opportunity/transitionOpportunity', async ({ id, payload }, { rejectWithValue }) => {
  try {
    const response = await api.post<{ data: OpportunityItem; message?: string }>(
      `/opportunities/${id}/transition`,
      payload
    );
    return response.data.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      const data = err.response.data;
      return rejectWithValue({
        message: data?.message || 'Failed to update opportunity status',
        error_code: data?.error_code,
        allowed_transitions: data?.allowed_transitions,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  }
});

export const opportunitySlice = createSlice({
  name: 'opportunity',
  initialState,
  reducers: {
    clearCreateStatus: (state) => {
      state.isCreating = false;
      state.createSuccess = false;
      state.createError = null;
      state.createErrorCode = null;
      state.validationErrors = {};
    },
    clearUpdateStatus: (state) => {
      state.isUpdating = false;
      state.updateSuccess = false;
      state.updateError = null;
      state.updateErrorCode = null;
      state.validationErrors = {};
    },
    clearTransitionStatus: (state) => {
      state.isTransitioning = false;
      state.transitionError = null;
      state.transitionErrorCode = null;
    },
    setSelectedOpportunity: (state, action: PayloadAction<OpportunityItem | null>) => {
      state.selectedOpportunity = action.payload;
    },
    setMockOpportunities: (state, action: PayloadAction<OpportunityItem[]>) => {
      state.opportunities = action.payload;
    },
    markOpportunityApplied: (state, action: PayloadAction<number>) => {
      const oppId = action.payload;
      if (state.selectedOpportunity?.id === oppId) {
        state.selectedOpportunity.already_applied = true;
        state.selectedOpportunity.applied = true;
      }
      const index = state.opportunities.findIndex((opp) => opp.id === oppId);
      if (index !== -1) {
        state.opportunities[index].already_applied = true;
        state.opportunities[index].applied = true;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch list
      .addCase(fetchOpportunities.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOpportunities.fulfilled, (state, action) => {
        state.isLoading = false;
        state.opportunities = action.payload.data;
        state.pagination = action.payload.meta;
      })
      .addCase(fetchOpportunities.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to load opportunities';
      })
      // Fetch by ID
      .addCase(fetchOpportunityById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOpportunityById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        state.selectedOpportunity = action.payload;
        const index = state.opportunities.findIndex((opp) => opp.id === action.payload.id);
        if (index !== -1) {
          state.opportunities[index] = action.payload;
        }
      })
      .addCase(fetchOpportunityById.rejected, (state, action) => {
        state.isLoading = false;
        state.selectedOpportunity = null;
        state.error = action.payload ?? 'Failed to load opportunity';
      })
      // Create
      .addCase(createOpportunity.pending, (state) => {
        state.isCreating = true;
        state.createSuccess = false;
        state.createError = null;
        state.createErrorCode = null;
        state.validationErrors = {};
      })
      .addCase(createOpportunity.fulfilled, (state) => {
        state.isCreating = false;
        state.createSuccess = true;
        state.createError = null;
        state.createErrorCode = null;
        state.validationErrors = {};
        // List is refreshed via fetchOpportunities after dialog closes
      })
      .addCase(createOpportunity.rejected, (state, action) => {
        state.isCreating = false;
        state.createSuccess = false;
        state.createError = action.payload?.message || 'Failed to create opportunity';
        state.createErrorCode = action.payload?.error_code || null;
        state.validationErrors = action.payload?.errors || {};
      })
      // Update
      .addCase(updateOpportunity.pending, (state) => {
        state.isUpdating = true;
        state.updateSuccess = false;
        state.updateError = null;
        state.updateErrorCode = null;
        state.validationErrors = {};
      })
      .addCase(updateOpportunity.fulfilled, (state, action) => {
        state.isUpdating = false;
        state.updateSuccess = true;
        state.updateError = null;
        state.updateErrorCode = null;
        state.validationErrors = {};
        const index = state.opportunities.findIndex((opp) => opp.id === action.payload.id);
        if (index !== -1) {
          state.opportunities[index] = action.payload;
        }
        if (state.selectedOpportunity?.id === action.payload.id) {
          state.selectedOpportunity = action.payload;
        }
      })
      .addCase(updateOpportunity.rejected, (state, action) => {
        state.isUpdating = false;
        state.updateSuccess = false;
        state.updateError = action.payload?.message || 'Failed to update opportunity';
        state.updateErrorCode = action.payload?.error_code || null;
        state.validationErrors = action.payload?.errors || {};
      })
      // Transition
      .addCase(transitionOpportunity.pending, (state) => {
        state.isTransitioning = true;
        state.transitionError = null;
        state.transitionErrorCode = null;
      })
      .addCase(transitionOpportunity.fulfilled, (state, action) => {
        state.isTransitioning = false;
        state.transitionError = null;
        state.transitionErrorCode = null;
        const index = state.opportunities.findIndex((opp) => opp.id === action.payload.id);
        if (index !== -1) {
          state.opportunities[index] = action.payload;
        }
        if (state.selectedOpportunity?.id === action.payload.id) {
          state.selectedOpportunity = action.payload;
        }
      })
      .addCase(transitionOpportunity.rejected, (state, action) => {
        state.isTransitioning = false;
        state.transitionError =
          action.payload?.message || 'Failed to transition opportunity status';
        state.transitionErrorCode = action.payload?.error_code || null;
      });
  },
});

export const {
  clearCreateStatus,
  clearUpdateStatus,
  clearTransitionStatus,
  setSelectedOpportunity,
  setMockOpportunities,
  markOpportunityApplied,
} = opportunitySlice.actions;

export default opportunitySlice.reducer;
