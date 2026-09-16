import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/lib/api';
import axios from 'axios';
import type { PaginationMeta } from '@/store/slices/opportunitySlice';
import type {
  ApplicationItem,
  ApplicationCvFile,
  ApplicationTransitionItem,
  ApplyOpportunityPayload,
  ApplyErrorResponse,
  CompanyApplicationsParams,
  DecisionErrorResponse,
} from '@/types/application';

export interface ApplicationState {
  // ── Submit / upload (TEP-631) ──────────────────────────────────────────────
  isSubmitting: boolean;
  submitSuccess: boolean;
  isUploadingCv: boolean;
  uploadedCv: ApplicationCvFile | null;
  lastSubmittedApplication: ApplicationItem | null;
  error: string | null;
  errorCode: string | null;
  validationErrors: Record<string, string[]>;

  // ── My Applications list (TEP-636) ────────────────────────────────────────
  myApplications: ApplicationItem[];
  myApplicationsPagination: PaginationMeta | null;
  isFetchingMyApplications: boolean;
  fetchMyApplicationsError: string | null;

  // ── Withdraw Application (TEP-640/641) ─────────────────────────────────────
  isWithdrawing: boolean;
  withdrawError: string | null;

  // ── Company Applications review list (TEP-644/645) ─────────────────────────
  companyApplications: ApplicationItem[];
  companyApplicationsPagination: PaginationMeta | null;
  isFetchingCompanyApplications: boolean;
  fetchCompanyApplicationsError: string | null;

  // ── Accept / Reject Application (TEP-648/649/650) ───────────────────────────
  isAccepting: boolean;
  acceptError: string | null;
  acceptErrorCode: string | null;
  acceptCapacityInfo: { acceptedCount: number; capacity: number } | null;
  isRejecting: boolean;
  rejectError: string | null;
  rejectErrorCode: string | null;

  // ── Schedule Interview (TEP-653/654) ────────────────────────────────────────
  isSchedulingInterview: boolean;
  scheduleInterviewError: string | null;
  scheduleInterviewErrorCode: string | null;

  // ── Review Application (TEP-652) ───────────────────────────────────────────
  isReviewing: boolean;
  reviewError: string | null;
  reviewErrorCode: string | null;

  // ── Application Transition History (TEP-657/658) ────────────────────────────
  // applicationTransitionsAppId tags which application the loaded list belongs
  // to, so a stale list from a previously-viewed application is never shown
  // for a different one while the new fetch is in flight.
  applicationTransitions: ApplicationTransitionItem[];
  applicationTransitionsAppId: number | null;
  isFetchingApplicationTransitions: boolean;
  fetchApplicationTransitionsError: string | null;
}

const initialState: ApplicationState = {
  // ── Submit / upload (TEP-631) ──────────────────────────────────────────────
  isSubmitting: false,
  submitSuccess: false,
  isUploadingCv: false,
  uploadedCv: null,
  lastSubmittedApplication: null,
  error: null,
  errorCode: null,
  validationErrors: {},

  // ── My Applications list (TEP-636) ────────────────────────────────────────
  myApplications: [],
  myApplicationsPagination: null,
  isFetchingMyApplications: false,
  fetchMyApplicationsError: null,

  // ── Withdraw Application (TEP-640/641) ─────────────────────────────────────
  isWithdrawing: false,
  withdrawError: null,

  // ── Company Applications review list (TEP-644/645) ─────────────────────────
  companyApplications: [],
  companyApplicationsPagination: null,
  isFetchingCompanyApplications: false,
  fetchCompanyApplicationsError: null,

  // ── Accept / Reject Application (TEP-648/649/650) ───────────────────────────
  isAccepting: false,
  acceptError: null,
  acceptErrorCode: null,
  acceptCapacityInfo: null,
  isRejecting: false,
  rejectError: null,
  rejectErrorCode: null,

  // ── Schedule Interview (TEP-653/654) ────────────────────────────────────────
  isSchedulingInterview: false,
  scheduleInterviewError: null,
  scheduleInterviewErrorCode: null,

  // ── Review Application (TEP-652) ───────────────────────────────────────────
  isReviewing: false,
  reviewError: null,
  reviewErrorCode: null,

  // ── Application Transition History (TEP-657/658) ────────────────────────────
  applicationTransitions: [],
  applicationTransitionsAppId: null,
  isFetchingApplicationTransitions: false,
  fetchApplicationTransitionsError: null,
};

export interface RejectedApplyPayload {
  message: string;
  errorCode?: string;
  validationErrors?: Record<string, string[]>;
}

/**
 * Fetch the authenticated student's own applications.
 *
 * TEP-636 — GET /api/v1/my/applications
 * Supports optional { status, page, per_page } params.
 * Pagination shape mirrors fetchOpportunities.
 */
export const fetchMyApplications = createAsyncThunk<
  { data: ApplicationItem[]; meta: PaginationMeta | null },
  { status?: string; page?: number; per_page?: number } | void,
  { rejectValue: string }
>('application/fetchMyApplications', async (params, { rejectWithValue }) => {
  try {
    const response = await api.get<{
      data: ApplicationItem[];
      meta?: PaginationMeta;
    }>('/my/applications', {
      params: params || undefined,
    });

    return {
      data: response.data.data ?? [],
      meta: response.data.meta ?? null,
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue(err.response.data?.message || 'Failed to load your applications');
    }
    return rejectWithValue(err instanceof Error ? err.message : 'Unknown error occurred');
  }
});

/**
 * Fetch applications submitted to the acting company representative's own
 * company's opportunities.
 *
 * TEP-644 — GET /api/v1/company/applications
 * Supports optional { opportunity_id, status, sort_by, sort_dir, page,
 * per_page } params. Pagination shape mirrors fetchOpportunities /
 * fetchMyApplications.
 */
export const fetchCompanyApplications = createAsyncThunk<
  { data: ApplicationItem[]; meta: PaginationMeta | null },
  CompanyApplicationsParams | void,
  { rejectValue: string }
>('application/fetchCompanyApplications', async (params, { rejectWithValue }) => {
  try {
    const response = await api.get<{
      data: ApplicationItem[];
      meta?: PaginationMeta;
    }>('/company/applications', {
      params: params || undefined,
    });

    return {
      data: response.data.data ?? [],
      meta: response.data.meta ?? null,
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue(err.response.data?.message || 'Failed to load company applications');
    }
    return rejectWithValue(err instanceof Error ? err.message : 'Unknown error occurred');
  }
});

/**
 * Fetch the full, ordered status transition history for one application.
 *
 * TEP-657/658 — GET /api/v1/applications/{application}/transitions
 * Viewable by either the owning student or the owning company's
 * representative (enforced server-side); the frontend doesn't need to know
 * which side the current user is on — it just renders whatever comes back.
 */
export const fetchApplicationTransitions = createAsyncThunk<
  { applicationId: number; transitions: ApplicationTransitionItem[] },
  number,
  { rejectValue: string }
>('application/fetchApplicationTransitions', async (applicationId, { rejectWithValue }) => {
  try {
    const response = await api.get<{ data: ApplicationTransitionItem[] }>(
      `/applications/${applicationId}/transitions`
    );

    return {
      applicationId,
      transitions: response.data.data ?? [],
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue(err.response.data?.message || 'Failed to load application history');
    }
    return rejectWithValue(err instanceof Error ? err.message : 'Unknown error occurred');
  }
});

/**
 * Withdraw the authenticated student's own application.
 *
 * TEP-640/641 — POST /api/v1/applications/{application}/withdraw
 * `reason` is optional (backend validates max 500 chars).
 */
export const withdrawApplication = createAsyncThunk<
  { application: ApplicationItem; message: string },
  { applicationId: number; reason?: string },
  { rejectValue: string }
>('application/withdrawApplication', async ({ applicationId, reason }, { rejectWithValue }) => {
  try {
    const response = await api.post<{
      data: ApplicationItem;
      message: string;
    }>(`/applications/${applicationId}/withdraw`, {
      reason: reason || undefined,
    });

    return {
      application: response.data.data,
      message: response.data.message || 'Your application has been withdrawn.',
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue(err.response.data?.message || 'Failed to withdraw application');
    }
    return rejectWithValue(err instanceof Error ? err.message : 'Unknown error occurred');
  }
});

/**
 * Accept a student's application to the acting representative's own
 * company's opportunity.
 *
 * TEP-648/650 — POST /api/v1/applications/{application}/accept
 * A 409 (`capacity_reached`) carries `accepted_count`/`capacity` so the UI
 * can explain the constraint precisely, rather than a generic error.
 */
export const acceptApplication = createAsyncThunk<
  { application: ApplicationItem; message: string },
  { applicationId: number },
  { rejectValue: DecisionErrorResponse }
>('application/acceptApplication', async ({ applicationId }, { rejectWithValue }) => {
  try {
    const response = await api.post<{
      data: ApplicationItem;
      message: string;
    }>(`/applications/${applicationId}/accept`);

    return {
      application: response.data.data,
      message: response.data.message || 'Decision recorded successfully.',
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      const respData = err.response.data as DecisionErrorResponse;
      return rejectWithValue({
        message: respData?.message || 'Failed to accept application',
        error_code: respData?.error_code,
        accepted_count: respData?.accepted_count,
        capacity: respData?.capacity,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  }
});

/**
 * Reject a student's application to the acting representative's own
 * company's opportunity.
 *
 * TEP-649/650 — POST /api/v1/applications/{application}/reject
 * `reason` is REQUIRED (backend validates max 1000 chars) — unlike
 * withdrawal, the company owes the student a concrete explanation.
 */
export const rejectApplication = createAsyncThunk<
  { application: ApplicationItem; message: string },
  { applicationId: number; reason: string },
  { rejectValue: DecisionErrorResponse }
>('application/rejectApplication', async ({ applicationId, reason }, { rejectWithValue }) => {
  try {
    const response = await api.post<{
      data: ApplicationItem;
      message: string;
    }>(`/applications/${applicationId}/reject`, { reason });

    return {
      application: response.data.data,
      message: response.data.message || 'Decision recorded successfully.',
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      const respData = err.response.data as DecisionErrorResponse;
      return rejectWithValue({
        message: respData?.message || 'Failed to reject application',
        error_code: respData?.error_code,
        errors: respData?.errors,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  }
});

/**
 * Schedule (or reschedule) an interview for a student's application to the
 * acting representative's own company's opportunity.
 *
 * TEP-653/654 — POST /api/v1/applications/{application}/interview
 * `interview_at` is REQUIRED and must be a future ISO datetime (backend
 * validates `after:now`). Re-calling this while the application is already
 * `interview_scheduled` reschedules it in place — same endpoint, same
 * payload shape, no separate "reschedule" action.
 */
export const scheduleInterview = createAsyncThunk<
  { application: ApplicationItem; message: string },
  { applicationId: number; interviewAt: string },
  { rejectValue: DecisionErrorResponse }
>('application/scheduleInterview', async ({ applicationId, interviewAt }, { rejectWithValue }) => {
  try {
    const response = await api.post<{
      data: ApplicationItem;
      message: string;
    }>(`/applications/${applicationId}/interview`, { interview_at: interviewAt });

    return {
      application: response.data.data,
      message: response.data.message || 'Interview scheduled successfully.',
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      const respData = err.response.data as DecisionErrorResponse;
      return rejectWithValue({
        message: respData?.message || 'Failed to schedule interview',
        error_code: respData?.error_code,
        errors: respData?.errors,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  }
});

/**
 * Mark a student's application as under review by the acting representative's company.
 *
 * TEP-652 — POST /api/v1/applications/{application}/review
 */
export const reviewApplication = createAsyncThunk<
  { application: ApplicationItem; message: string },
  { applicationId: number },
  { rejectValue: DecisionErrorResponse }
>('application/reviewApplication', async ({ applicationId }, { rejectWithValue }) => {
  try {
    const response = await api.post<{
      data: ApplicationItem;
      message: string;
    }>(`/applications/${applicationId}/review`);

    return {
      application: response.data.data,
      message: response.data.message || 'Application is now under review.',
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      const respData = err.response.data as DecisionErrorResponse;
      return rejectWithValue({
        message: respData?.message || 'Failed to review application',
        error_code: respData?.error_code,
        errors: respData?.errors,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  }
});

export const applyToOpportunity = createAsyncThunk<
  { application: ApplicationItem; message: string; opportunityId: number },
  ApplyOpportunityPayload,
  { rejectValue: RejectedApplyPayload }
>('application/applyToOpportunity', async (payload, { rejectWithValue }) => {
  try {
    const response = await api.post<{
      data: ApplicationItem;
      message: string;
    }>(`/opportunities/${payload.opportunityId}/applications`, {
      cv_file_id: payload.cv_file_id,
      cover_note: payload.cover_note || undefined,
    });

    return {
      application: response.data.data,
      message: response.data.message || 'Application submitted successfully',
      opportunityId: payload.opportunityId,
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      const respData = err.response.data as ApplyErrorResponse;
      return rejectWithValue({
        message: respData?.message || 'Failed to submit application',
        errorCode: respData?.error_code,
        validationErrors: respData?.errors || {},
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Unknown error occurred',
    });
  }
});

export const uploadCvDocument = createAsyncThunk<ApplicationCvFile, File, { rejectValue: string }>(
  'application/uploadCvDocument',
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'cv');

      const response = await api.post<{
        data: ApplicationCvFile;
        message: string;
      }>('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        return rejectWithValue(err.response.data?.message || 'Failed to upload CV file');
      }
      return rejectWithValue(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  }
);

export const uploadProfileCv = createAsyncThunk<ApplicationCvFile, File, { rejectValue: string }>(
  'application/uploadProfileCv',
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('cv', file);

      const response = await api.post<{
        file?: ApplicationCvFile;
        message: string;
      }>('/profile/cv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.file) {
        return response.data.file;
      }
      throw new Error('CV file details missing from response');
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        return rejectWithValue(err.response.data?.message || 'Failed to update profile CV');
      }
      return rejectWithValue(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  }
);

export const applicationSlice = createSlice({
  name: 'application',
  initialState,
  reducers: {
    clearApplicationErrors: (state) => {
      state.error = null;
      state.errorCode = null;
      state.validationErrors = {};
    },
    resetApplicationState: (state) => {
      state.isSubmitting = false;
      state.submitSuccess = false;
      state.error = null;
      state.errorCode = null;
      state.validationErrors = {};
      state.uploadedCv = null;
    },
    setUploadedCv: (state, action: PayloadAction<ApplicationCvFile | null>) => {
      state.uploadedCv = action.payload;
    },
    // Reset the My Applications list state (call on page unmount)
    clearMyApplications: (state) => {
      state.myApplications = [];
      state.myApplicationsPagination = null;
      state.fetchMyApplicationsError = null;
    },
    // Reset the transition history state (call on history page/dialog unmount)
    clearApplicationTransitions: (state) => {
      state.applicationTransitions = [];
      state.applicationTransitionsAppId = null;
      state.fetchApplicationTransitionsError = null;
    },
    // Clear withdraw error (e.g. when the confirmation dialog closes/reopens)
    clearWithdrawError: (state) => {
      state.withdrawError = null;
    },
    // Clear accept error/capacity info (e.g. when the confirmation dialog closes/reopens)
    clearAcceptError: (state) => {
      state.acceptError = null;
      state.acceptErrorCode = null;
      state.acceptCapacityInfo = null;
    },
    // Clear reject error (e.g. when the confirmation dialog closes/reopens)
    clearRejectError: (state) => {
      state.rejectError = null;
      state.rejectErrorCode = null;
    },
    // Clear schedule-interview error (e.g. when the dialog closes/reopens)
    clearScheduleInterviewError: (state) => {
      state.scheduleInterviewError = null;
      state.scheduleInterviewErrorCode = null;
    },
    // Clear review error (e.g. when the dialog closes/reopens)
    clearReviewError: (state) => {
      state.reviewError = null;
      state.reviewErrorCode = null;
    },
    // Reset the Company Applications list state (call on page unmount)
    clearCompanyApplications: (state) => {
      state.companyApplications = [];
      state.companyApplicationsPagination = null;
      state.fetchCompanyApplicationsError = null;
    },
  },
  extraReducers: (builder) => {
    // applyToOpportunity
    builder.addCase(applyToOpportunity.pending, (state) => {
      state.isSubmitting = true;
      state.submitSuccess = false;
      state.error = null;
      state.errorCode = null;
      state.validationErrors = {};
    });
    builder.addCase(applyToOpportunity.fulfilled, (state, action) => {
      state.isSubmitting = false;
      state.submitSuccess = true;
      state.lastSubmittedApplication = action.payload.application;
      state.error = null;
      state.errorCode = null;
      state.validationErrors = {};
    });
    builder.addCase(applyToOpportunity.rejected, (state, action) => {
      state.isSubmitting = false;
      state.submitSuccess = false;
      state.error = action.payload?.message || 'Failed to submit application';
      state.errorCode = action.payload?.errorCode || null;
      state.validationErrors = action.payload?.validationErrors || {};
    });

    // uploadCvDocument
    builder.addCase(uploadCvDocument.pending, (state) => {
      state.isUploadingCv = true;
      state.error = null;
    });
    builder.addCase(uploadCvDocument.fulfilled, (state, action) => {
      state.isUploadingCv = false;
      state.uploadedCv = action.payload;
    });
    builder.addCase(uploadCvDocument.rejected, (state, action) => {
      state.isUploadingCv = false;
      state.error = action.payload || 'Failed to upload CV';
    });

    // uploadProfileCv
    builder.addCase(uploadProfileCv.pending, (state) => {
      state.isUploadingCv = true;
      state.error = null;
    });
    builder.addCase(uploadProfileCv.fulfilled, (state, action) => {
      state.isUploadingCv = false;
      state.uploadedCv = action.payload;
    });
    builder.addCase(uploadProfileCv.rejected, (state, action) => {
      state.isUploadingCv = false;
      state.error = action.payload || 'Failed to upload profile CV';
    });

    // fetchMyApplications (TEP-636)
    builder.addCase(fetchMyApplications.pending, (state) => {
      state.isFetchingMyApplications = true;
      state.fetchMyApplicationsError = null;
    });
    builder.addCase(fetchMyApplications.fulfilled, (state, action) => {
      state.isFetchingMyApplications = false;
      state.myApplications = action.payload.data;
      state.myApplicationsPagination = action.payload.meta;
      state.fetchMyApplicationsError = null;
    });
    builder.addCase(fetchMyApplications.rejected, (state, action) => {
      state.isFetchingMyApplications = false;
      state.fetchMyApplicationsError = action.payload ?? 'Failed to load your applications';
    });

    // withdrawApplication (TEP-640/641)
    builder.addCase(withdrawApplication.pending, (state) => {
      state.isWithdrawing = true;
      state.withdrawError = null;
    });
    builder.addCase(withdrawApplication.fulfilled, (state, action) => {
      state.isWithdrawing = false;
      state.withdrawError = null;
      // Reflect the withdrawal in the already-loaded list without refetching.
      const index = state.myApplications.findIndex(
        (app) => app.id === action.payload.application.id
      );
      if (index !== -1) {
        state.myApplications[index] = action.payload.application;
      }
    });
    builder.addCase(withdrawApplication.rejected, (state, action) => {
      state.isWithdrawing = false;
      state.withdrawError = action.payload ?? 'Failed to withdraw application';
    });

    // acceptApplication (TEP-648/650)
    builder.addCase(acceptApplication.pending, (state) => {
      state.isAccepting = true;
      state.acceptError = null;
      state.acceptErrorCode = null;
      state.acceptCapacityInfo = null;
    });
    builder.addCase(acceptApplication.fulfilled, (state, action) => {
      state.isAccepting = false;
      state.acceptError = null;
      state.acceptErrorCode = null;
      state.acceptCapacityInfo = null;
      // Reflect the decision in the already-loaded company list without refetching.
      const index = state.companyApplications.findIndex(
        (app) => app.id === action.payload.application.id
      );
      if (index !== -1) {
        const existing = state.companyApplications[index];
        state.companyApplications[index] = {
          ...existing,
          ...action.payload.application,
          student_profile: action.payload.application.student_profile
            ? {
                ...existing.student_profile,
                ...action.payload.application.student_profile,
                major:
                  action.payload.application.student_profile.major ??
                  existing.student_profile?.major,
                user:
                  action.payload.application.student_profile.user ??
                  existing.student_profile?.user ??
                  null,
                skills:
                  action.payload.application.student_profile.skills ??
                  existing.student_profile?.skills,
                avatar_url:
                  action.payload.application.student_profile.avatar_url ??
                  existing.student_profile?.avatar_url,
              }
            : existing.student_profile,
          opportunity: action.payload.application.opportunity ?? existing.opportunity,
        };
      }
    });
    builder.addCase(acceptApplication.rejected, (state, action) => {
      state.isAccepting = false;
      state.acceptError = action.payload?.message ?? 'Failed to accept application';
      state.acceptErrorCode = action.payload?.error_code ?? null;
      state.acceptCapacityInfo =
        action.payload?.error_code === 'capacity_reached' &&
        action.payload?.accepted_count !== undefined &&
        action.payload?.capacity !== undefined
          ? { acceptedCount: action.payload.accepted_count, capacity: action.payload.capacity }
          : null;
    });

    // rejectApplication (TEP-649/650)
    builder.addCase(rejectApplication.pending, (state) => {
      state.isRejecting = true;
      state.rejectError = null;
      state.rejectErrorCode = null;
    });
    builder.addCase(rejectApplication.fulfilled, (state, action) => {
      state.isRejecting = false;
      state.rejectError = null;
      state.rejectErrorCode = null;
      const index = state.companyApplications.findIndex(
        (app) => app.id === action.payload.application.id
      );
      if (index !== -1) {
        const existing = state.companyApplications[index];
        state.companyApplications[index] = {
          ...existing,
          ...action.payload.application,
          student_profile: action.payload.application.student_profile
            ? {
                ...existing.student_profile,
                ...action.payload.application.student_profile,
                major:
                  action.payload.application.student_profile.major ??
                  existing.student_profile?.major,
                user:
                  action.payload.application.student_profile.user ??
                  existing.student_profile?.user ??
                  null,
                skills:
                  action.payload.application.student_profile.skills ??
                  existing.student_profile?.skills,
                avatar_url:
                  action.payload.application.student_profile.avatar_url ??
                  existing.student_profile?.avatar_url,
              }
            : existing.student_profile,
          opportunity: action.payload.application.opportunity ?? existing.opportunity,
        };
      }
    });
    builder.addCase(rejectApplication.rejected, (state, action) => {
      state.isRejecting = false;
      state.rejectError = action.payload?.message ?? 'Failed to reject application';
      state.rejectErrorCode = action.payload?.error_code ?? null;
    });

    // scheduleInterview (TEP-653/654)
    builder.addCase(scheduleInterview.pending, (state) => {
      state.isSchedulingInterview = true;
      state.scheduleInterviewError = null;
      state.scheduleInterviewErrorCode = null;
    });
    builder.addCase(scheduleInterview.fulfilled, (state, action) => {
      state.isSchedulingInterview = false;
      state.scheduleInterviewError = null;
      state.scheduleInterviewErrorCode = null;
      // Reflect the schedule/reschedule in the already-loaded company list
      // without refetching — same merge shape as accept/reject above.
      const index = state.companyApplications.findIndex(
        (app) => app.id === action.payload.application.id
      );
      if (index !== -1) {
        const existing = state.companyApplications[index];
        state.companyApplications[index] = {
          ...existing,
          ...action.payload.application,
          student_profile: action.payload.application.student_profile
            ? {
                ...existing.student_profile,
                ...action.payload.application.student_profile,
                major:
                  action.payload.application.student_profile.major ??
                  existing.student_profile?.major,
                user:
                  action.payload.application.student_profile.user ??
                  existing.student_profile?.user ??
                  null,
                skills:
                  action.payload.application.student_profile.skills ??
                  existing.student_profile?.skills,
                avatar_url:
                  action.payload.application.student_profile.avatar_url ??
                  existing.student_profile?.avatar_url,
              }
            : existing.student_profile,
          opportunity: action.payload.application.opportunity ?? existing.opportunity,
        };
      }
    });
    builder.addCase(scheduleInterview.rejected, (state, action) => {
      state.isSchedulingInterview = false;
      state.scheduleInterviewError = action.payload?.message ?? 'Failed to schedule interview';
      state.scheduleInterviewErrorCode = action.payload?.error_code ?? null;
    });

    // reviewApplication (TEP-652)
    builder.addCase(reviewApplication.pending, (state) => {
      state.isReviewing = true;
      state.reviewError = null;
      state.reviewErrorCode = null;
    });
    builder.addCase(reviewApplication.fulfilled, (state, action) => {
      state.isReviewing = false;
      state.reviewError = null;
      state.reviewErrorCode = null;
      const index = state.companyApplications.findIndex(
        (app) => app.id === action.payload.application.id
      );
      if (index !== -1) {
        const existing = state.companyApplications[index];
        state.companyApplications[index] = {
          ...existing,
          ...action.payload.application,
          student_profile: action.payload.application.student_profile
            ? {
                ...existing.student_profile,
                ...action.payload.application.student_profile,
                major:
                  action.payload.application.student_profile.major ??
                  existing.student_profile?.major,
                user:
                  action.payload.application.student_profile.user ??
                  existing.student_profile?.user ??
                  null,
                skills:
                  action.payload.application.student_profile.skills ??
                  existing.student_profile?.skills,
                avatar_url:
                  action.payload.application.student_profile.avatar_url ??
                  existing.student_profile?.avatar_url,
              }
            : existing.student_profile,
          opportunity: action.payload.application.opportunity ?? existing.opportunity,
        };
      }
    });
    builder.addCase(reviewApplication.rejected, (state, action) => {
      state.isReviewing = false;
      state.reviewError = action.payload?.message ?? 'Failed to review application';
      state.reviewErrorCode = action.payload?.error_code ?? null;
    });

    // fetchCompanyApplications (TEP-644/645)
    builder.addCase(fetchCompanyApplications.pending, (state) => {
      state.isFetchingCompanyApplications = true;
      state.fetchCompanyApplicationsError = null;
    });
    builder.addCase(fetchCompanyApplications.fulfilled, (state, action) => {
      state.isFetchingCompanyApplications = false;
      state.companyApplications = action.payload.data;
      state.companyApplicationsPagination = action.payload.meta;
      state.fetchCompanyApplicationsError = null;
    });
    builder.addCase(fetchCompanyApplications.rejected, (state, action) => {
      state.isFetchingCompanyApplications = false;
      state.fetchCompanyApplicationsError = action.payload ?? 'Failed to load company applications';
    });

    // fetchApplicationTransitions (TEP-657/658)
    builder.addCase(fetchApplicationTransitions.pending, (state) => {
      state.isFetchingApplicationTransitions = true;
      state.fetchApplicationTransitionsError = null;
    });
    builder.addCase(fetchApplicationTransitions.fulfilled, (state, action) => {
      state.isFetchingApplicationTransitions = false;
      state.applicationTransitions = action.payload.transitions;
      state.applicationTransitionsAppId = action.payload.applicationId;
    });
    builder.addCase(fetchApplicationTransitions.rejected, (state, action) => {
      state.isFetchingApplicationTransitions = false;
      state.fetchApplicationTransitionsError =
        action.payload ?? 'Failed to load application history';
    });
  },
});

export const {
  clearApplicationErrors,
  resetApplicationState,
  setUploadedCv,
  clearMyApplications,
  clearApplicationTransitions,
  clearWithdrawError,
  clearAcceptError,
  clearRejectError,
  clearScheduleInterviewError,
  clearReviewError,
  clearCompanyApplications,
} = applicationSlice.actions;
export default applicationSlice.reducer;
