import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';
import axios from 'axios';
import type {
  ReportItem,
  CreateReportPayload,
  UpdateReportPayload,
  ReviewReportPayload,
  ReportReviewRecord,
} from '@/types/reports';

export interface FetchReportsParams {
  status?: string;
  report_type_id?: number;
  student_id?: number;
  q?: string;
}

export interface ReportState {
  reports: ReportItem[];

  isLoadingReports: boolean;
  fetchError: string | null;

  isCreating: boolean;
  createError: string | null;
  createErrorCode: string | null;

  isUpdating: boolean;
  updateError: string | null;
  updateErrorCode: string | null;

  isSubmitting: boolean;
  submitError: string | null;
  submitErrorCode: string | null;

  isReviewing: boolean;
  reviewError: string | null;
  reviewErrorCode: string | null;

  isLoadingReviews: boolean;
  reviewsError: string | null;
  reportReviews: Record<number, ReportReviewRecord[]>;

  validationErrors: Record<string, string[]> | null;
}

const initialState: ReportState = {
  reports: [],

  isLoadingReports: false,
  fetchError: null,

  isCreating: false,
  createError: null,
  createErrorCode: null,

  isUpdating: false,
  updateError: null,
  updateErrorCode: null,

  isSubmitting: false,
  submitError: null,
  submitErrorCode: null,

  isReviewing: false,
  reviewError: null,
  reviewErrorCode: null,

  isLoadingReviews: false,
  reviewsError: null,
  reportReviews: {},

  validationErrors: null,
};

/**
 * Upload a single file as a report attachment.
 * Returns file metadata (including id) to be passed in file_ids[].
 * TEP-674 — POST /api/v1/files/upload
 */
export const uploadReportFile = createAsyncThunk<
  { id: number; original_name: string; url: string; mime_type: string; size_bytes: number },
  File,
  { rejectValue: { message: string } }
>('reports/uploadReportFile', async (file, { rejectWithValue }) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', 'report_attachment');
    const response = await api.post<{
      data: {
        id: number;
        original_name: string;
        url: string;
        mime_type: string;
        size_bytes: number;
      };
    }>('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({ message: err.response.data?.message || 'Failed to upload file' });
    }
    return rejectWithValue({ message: err instanceof Error ? err.message : 'Unknown error' });
  }
});

/**
 * Fetch reports for the authenticated student or assigned supervisor.
 * TEP-674/TEP-682 — GET /api/v1/reports
 */
export const fetchReports = createAsyncThunk<
  ReportItem[],
  FetchReportsParams | void,
  { rejectValue: { message: string } }
>('reports/fetchReports', async (params, { rejectWithValue }) => {
  try {
    const response = await api.get<{ data: ReportItem[] }>('/reports', {
      params: params || undefined,
    });
    return response.data.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Failed to fetch reports',
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  }
});

/**
 * Create a report draft for the student's own active training assignment.
 * TEP-674 — POST /api/v1/reports
 */
export const createReport = createAsyncThunk<
  ReportItem,
  CreateReportPayload,
  { rejectValue: { message: string; errorCode?: string; errors?: Record<string, string[]> } }
>('reports/createReport', async (payload, { rejectWithValue }) => {
  try {
    const response = await api.post<{ data: ReportItem }>('/reports', payload);

    return response.data.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Failed to create report',
        errorCode: err.response.data?.error_code,
        errors: err.response.data?.errors,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  }
});

/**
 * Update a report draft. Only allowed while status = 'draft'.
 * TEP-674 — PATCH /api/v1/reports/{report}
 */
export const updateReport = createAsyncThunk<
  ReportItem,
  { reportId: number; payload: UpdateReportPayload },
  { rejectValue: { message: string; errorCode?: string; errors?: Record<string, string[]> } }
>('reports/updateReport', async ({ reportId, payload }, { rejectWithValue }) => {
  try {
    const response = await api.patch<{ data: ReportItem }>(`/reports/${reportId}`, payload);

    return response.data.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Failed to update report',
        errorCode: err.response.data?.error_code,
        errors: err.response.data?.errors,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  }
});

/**
 * Submit a report draft or resubmit a revision-requested report.
 * TEP-678 — POST /api/v1/reports/{report}/submit
 */
export const submitReport = createAsyncThunk<
  ReportItem,
  number,
  { rejectValue: { message: string; errorCode?: string } }
>('reports/submitReport', async (reportId, { rejectWithValue }) => {
  try {
    const response = await api.post<{ data: ReportItem }>(`/reports/${reportId}/submit`);

    return response.data.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Failed to submit report',
        errorCode: err.response.data?.error_code,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  }
});

/**
 * Review a submitted report (approve, reject, or request revision).
 * TEP-682 — POST /api/v1/reports/{report}/review
 */
export const reviewReport = createAsyncThunk<
  ReportItem,
  { reportId: number; payload: ReviewReportPayload },
  { rejectValue: { message: string; errorCode?: string; errors?: Record<string, string[]> } }
>('reports/reviewReport', async ({ reportId, payload }, { rejectWithValue }) => {
  try {
    const response = await api.post<{ data: ReportItem }>(`/reports/${reportId}/review`, payload);

    return response.data.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Failed to review report',
        errorCode: err.response.data?.error_code,
        errors: err.response.data?.errors,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  }
});

/**
 * Fetch review history for a report.
 * TEP-682 — GET /api/v1/reports/{report}/reviews
 */
export const fetchReportReviews = createAsyncThunk<
  { reportId: number; reviews: ReportReviewRecord[] },
  number,
  { rejectValue: { message: string } }
>('reports/fetchReportReviews', async (reportId, { rejectWithValue }) => {
  try {
    const response = await api.get<{ data: ReportReviewRecord[] }>(`/reports/${reportId}/reviews`);

    return { reportId, reviews: response.data.data };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Failed to fetch reviews',
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  }
});

export const reportSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearReportErrors: (state) => {
      state.fetchError = null;
      state.createError = null;
      state.createErrorCode = null;
      state.updateError = null;
      state.updateErrorCode = null;
      state.submitError = null;
      state.submitErrorCode = null;
      state.reviewError = null;
      state.reviewErrorCode = null;
      state.reviewsError = null;
      state.validationErrors = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch
    builder
      .addCase(fetchReports.pending, (state) => {
        state.isLoadingReports = true;
        state.fetchError = null;
      })
      .addCase(fetchReports.fulfilled, (state, action) => {
        state.isLoadingReports = false;
        state.reports = action.payload;
      })
      .addCase(fetchReports.rejected, (state, action) => {
        state.isLoadingReports = false;
        state.fetchError = action.payload?.message || 'Failed to fetch reports';
      });

    // Create
    builder
      .addCase(createReport.pending, (state) => {
        state.isCreating = true;
        state.createError = null;
        state.createErrorCode = null;
        state.validationErrors = null;
      })
      .addCase(createReport.fulfilled, (state, action) => {
        state.isCreating = false;
        state.validationErrors = null;
        state.reports.unshift(action.payload);
      })
      .addCase(createReport.rejected, (state, action) => {
        state.isCreating = false;
        state.createError = action.payload?.message || 'Failed to create report';
        state.createErrorCode = action.payload?.errorCode || null;
        state.validationErrors = action.payload?.errors || null;
      });

    // Update
    builder
      .addCase(updateReport.pending, (state) => {
        state.isUpdating = true;
        state.updateError = null;
        state.updateErrorCode = null;
        state.validationErrors = null;
      })
      .addCase(updateReport.fulfilled, (state, action) => {
        state.isUpdating = false;
        state.validationErrors = null;
        const index = state.reports.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.reports[index] = action.payload;
        } else {
          state.reports.unshift(action.payload);
        }
      })
      .addCase(updateReport.rejected, (state, action) => {
        state.isUpdating = false;
        state.updateError = action.payload?.message || 'Failed to update report';
        state.updateErrorCode = action.payload?.errorCode || null;
        state.validationErrors = action.payload?.errors || null;
      });

    // Submit
    builder
      .addCase(submitReport.pending, (state) => {
        state.isSubmitting = true;
        state.submitError = null;
        state.submitErrorCode = null;
      })
      .addCase(submitReport.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const index = state.reports.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.reports[index] = action.payload;
        } else {
          state.reports.unshift(action.payload);
        }
      })
      .addCase(submitReport.rejected, (state, action) => {
        state.isSubmitting = false;
        state.submitError = action.payload?.message || 'Failed to submit report';
        state.submitErrorCode = action.payload?.errorCode || null;
      });

    // Review
    builder
      .addCase(reviewReport.pending, (state) => {
        state.isReviewing = true;
        state.reviewError = null;
        state.reviewErrorCode = null;
        state.validationErrors = null;
      })
      .addCase(reviewReport.fulfilled, (state, action) => {
        state.isReviewing = false;
        state.validationErrors = null;
        const index = state.reports.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) {
          state.reports[index] = action.payload;
        } else {
          state.reports.unshift(action.payload);
        }
      })
      .addCase(reviewReport.rejected, (state, action) => {
        state.isReviewing = false;
        state.reviewError = action.payload?.message || 'Failed to review report';
        state.reviewErrorCode = action.payload?.errorCode || null;
        state.validationErrors = action.payload?.errors || null;
      });

    // Reviews history
    builder
      .addCase(fetchReportReviews.pending, (state) => {
        state.isLoadingReviews = true;
        state.reviewsError = null;
      })
      .addCase(fetchReportReviews.fulfilled, (state, action) => {
        state.isLoadingReviews = false;
        state.reportReviews[action.payload.reportId] = action.payload.reviews;
      })
      .addCase(fetchReportReviews.rejected, (state, action) => {
        state.isLoadingReviews = false;
        state.reviewsError = action.payload?.message || 'Failed to fetch reviews';
      });
  },
});

export const { clearReportErrors } = reportSlice.actions;

export default reportSlice.reducer;
