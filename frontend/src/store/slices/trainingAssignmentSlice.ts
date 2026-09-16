import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';
import axios from 'axios';
import type { PaginationMeta } from '@/store/slices/opportunitySlice';
import type {
  TrainingAssignmentItem,
  TrainingAssignmentListParams,
} from '@/types/trainingAssignment';

export interface TrainingAssignmentState {
  // ── List view (company_representative / academic_supervisor / coordinator) ──
  assignments: TrainingAssignmentItem[];
  pagination: PaginationMeta | null;
  isFetchingList: boolean;
  fetchListError: string | null;

  // ── Student's own single placement (TEP-665's /my/training-assignment) ──────
  myAssignment: TrainingAssignmentItem | null;
  isFetchingMyAssignment: boolean;
  fetchMyAssignmentError: string | null;
  fetchMyAssignmentErrorCode: string | null;
}

const initialState: TrainingAssignmentState = {
  assignments: [],
  pagination: null,
  isFetchingList: false,
  fetchListError: null,

  myAssignment: null,
  isFetchingMyAssignment: false,
  fetchMyAssignmentError: null,
  fetchMyAssignmentErrorCode: null,
};

/**
 * Fetch training assignments visible to the acting user's role.
 *
 * TEP-665 — GET /api/v1/training-assignments
 * The backend does the role-scoping (company/supervisor/student/
 * coordinator) — the frontend doesn't pass a role param, it just renders
 * whatever comes back for whichever view the current user's role maps to
 * (see TrainingAssignmentsPage).
 */
export const fetchTrainingAssignments = createAsyncThunk<
  { data: TrainingAssignmentItem[]; meta: PaginationMeta | null },
  TrainingAssignmentListParams | void,
  { rejectValue: string }
>('trainingAssignment/fetchTrainingAssignments', async (params, { rejectWithValue }) => {
  try {
    const response = await api.get<{
      data: TrainingAssignmentItem[];
      meta?: PaginationMeta;
    }>('/training-assignments', {
      params: params || undefined,
    });

    return {
      data: response.data.data ?? [],
      meta: response.data.meta ?? null,
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue(err.response.data?.message || 'Failed to load training assignments');
    }
    return rejectWithValue(err instanceof Error ? err.message : 'Unknown error occurred');
  }
});

/**
 * Fetch the authenticated student's own single training placement.
 *
 * TEP-665 — GET /api/v1/my/training-assignment
 * 404 (`no_active_assignment`) is a normal, expected state (student hasn't
 * been assigned yet) — not surfaced as a generic error, so the reducer
 * clears myAssignment to null on that specific error_code rather than
 * leaving fetchMyAssignmentError populated.
 */
export const fetchMyTrainingAssignment = createAsyncThunk<
  TrainingAssignmentItem | null,
  void,
  { rejectValue: { message: string; errorCode?: string } }
>('trainingAssignment/fetchMyTrainingAssignment', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<{ data: TrainingAssignmentItem }>('/my/training-assignment');

    return response.data.data ?? null;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      const errorCode = err.response.data?.error_code as string | undefined;

      if (err.response.status === 404 && errorCode === 'no_active_assignment') {
        return rejectWithValue({
          message: err.response.data?.message || 'No active training placement',
          errorCode,
        });
      }

      return rejectWithValue({
        message: err.response.data?.message || 'Failed to load your training placement',
        errorCode,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  }
});

export const trainingAssignmentSlice = createSlice({
  name: 'trainingAssignment',
  initialState,
  reducers: {
    clearTrainingAssignments: (state) => {
      state.assignments = [];
      state.pagination = null;
      state.fetchListError = null;
    },
    clearMyTrainingAssignment: (state) => {
      state.myAssignment = null;
      state.fetchMyAssignmentError = null;
      state.fetchMyAssignmentErrorCode = null;
    },
  },
  extraReducers: (builder) => {
    // fetchTrainingAssignments (TEP-665)
    builder.addCase(fetchTrainingAssignments.pending, (state) => {
      state.isFetchingList = true;
      state.fetchListError = null;
    });
    builder.addCase(fetchTrainingAssignments.fulfilled, (state, action) => {
      state.isFetchingList = false;
      state.assignments = action.payload.data;
      state.pagination = action.payload.meta;
      state.fetchListError = null;
    });
    builder.addCase(fetchTrainingAssignments.rejected, (state, action) => {
      state.isFetchingList = false;
      state.fetchListError = action.payload ?? 'Failed to load training assignments';
    });

    // fetchMyTrainingAssignment (TEP-665)
    builder.addCase(fetchMyTrainingAssignment.pending, (state) => {
      state.isFetchingMyAssignment = true;
      state.fetchMyAssignmentError = null;
      state.fetchMyAssignmentErrorCode = null;
    });
    builder.addCase(fetchMyTrainingAssignment.fulfilled, (state, action) => {
      state.isFetchingMyAssignment = false;
      state.myAssignment = action.payload;
      state.fetchMyAssignmentError = null;
      state.fetchMyAssignmentErrorCode = null;
    });
    builder.addCase(fetchMyTrainingAssignment.rejected, (state, action) => {
      state.isFetchingMyAssignment = false;
      state.myAssignment = null;
      // "No active assignment yet" is a normal empty state, not an error
      // banner — only a genuinely unexpected failure sets fetchMyAssignmentError.
      if (action.payload?.errorCode === 'no_active_assignment') {
        state.fetchMyAssignmentError = null;
      } else {
        state.fetchMyAssignmentError =
          action.payload?.message ?? 'Failed to load your training placement';
      }
      state.fetchMyAssignmentErrorCode = action.payload?.errorCode ?? null;
    });
  },
});

export const { clearTrainingAssignments, clearMyTrainingAssignment } =
  trainingAssignmentSlice.actions;
export default trainingAssignmentSlice.reducer;
