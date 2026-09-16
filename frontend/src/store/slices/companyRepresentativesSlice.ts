import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/lib/api';
import axios from 'axios';
import type {
  CompanyRepresentativeItem,
  RepresentativesResponse,
  InviteRepresentativePayload,
  UpdateRepresentativePayload,
  CompanyRepresentativesState,
} from '@/types/representative';

const initialState: CompanyRepresentativesState = {
  representatives: [],
  isAdmin: false,
  status: 'idle',
  inviteStatus: 'idle',
  updateStatus: 'idle',
  removeStatus: 'idle',
  error: null,
  validationErrors: null,
};

export const fetchCompanyRepresentatives = createAsyncThunk<
  RepresentativesResponse,
  void,
  { rejectValue: { message: string; error_code?: string } }
>('companyRepresentatives/fetch', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<RepresentativesResponse>('/company/representatives');
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message ?? 'errors.serverError',
        error_code: err.response.data?.error_code,
      });
    }
    return rejectWithValue({ message: 'errors.serverError' });
  }
});

export const inviteCompanyRepresentative = createAsyncThunk<
  { invite_url: string; message: string },
  InviteRepresentativePayload,
  { rejectValue: { message: string; errors?: Record<string, string[]>; error_code?: string } }
>('companyRepresentatives/invite', async (payload, { rejectWithValue }) => {
  try {
    const response = await api.post<{ data: { invite_url: string }; message: string }>(
      '/company/representatives/invite',
      payload
    );
    return {
      invite_url: response.data.data.invite_url,
      message: response.data.message,
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message ?? 'errors.serverError',
        errors: err.response.data?.errors,
        error_code: err.response.data?.error_code,
      });
    }
    return rejectWithValue({ message: 'errors.serverError' });
  }
});

export const updateCompanyRepresentativeMe = createAsyncThunk<
  { data: CompanyRepresentativeItem; message: string },
  { job_title: string | null },
  { rejectValue: { message: string; errors?: Record<string, string[]> } }
>('companyRepresentatives/updateMe', async (payload, { rejectWithValue }) => {
  try {
    const response = await api.patch<{ data: CompanyRepresentativeItem; message: string }>(
      '/company/representatives/me',
      payload
    );
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message ?? 'errors.serverError',
        errors: err.response.data?.errors,
      });
    }
    return rejectWithValue({ message: 'errors.serverError' });
  }
});

export const updateCompanyRepresentative = createAsyncThunk<
  { data: CompanyRepresentativeItem; message: string },
  UpdateRepresentativePayload,
  { rejectValue: { message: string; errors?: Record<string, string[]>; error_code?: string } }
>('companyRepresentatives/update', async ({ id, job_title }, { rejectWithValue }) => {
  try {
    const response = await api.patch<{ data: CompanyRepresentativeItem; message: string }>(
      `/company/representatives/${id}`,
      { job_title }
    );
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message ?? 'errors.serverError',
        errors: err.response.data?.errors,
        error_code: err.response.data?.error_code,
      });
    }
    return rejectWithValue({ message: 'errors.serverError' });
  }
});

export const removeCompanyRepresentative = createAsyncThunk<
  { id: number; message: string },
  number,
  { rejectValue: { message: string; error_code?: string } }
>('companyRepresentatives/remove', async (id, { rejectWithValue }) => {
  try {
    const response = await api.delete<{ message: string }>(`/company/representatives/${id}`);
    return { id, message: response.data.message };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message ?? 'errors.serverError',
        error_code: err.response.data?.error_code,
      });
    }
    return rejectWithValue({ message: 'errors.serverError' });
  }
});

const companyRepresentativesSlice = createSlice({
  name: 'companyRepresentatives',
  initialState,
  reducers: {
    resetRepresentativesState(state) {
      state.status = 'idle';
      state.inviteStatus = 'idle';
      state.updateStatus = 'idle';
      state.removeStatus = 'idle';
      state.error = null;
      state.validationErrors = null;
    },
    clearRepresentativeErrors(state) {
      state.error = null;
      state.validationErrors = null;
    },
  },
  extraReducers: (builder) => {
    // ── Fetch Representatives ──
    builder
      .addCase(fetchCompanyRepresentatives.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(
        fetchCompanyRepresentatives.fulfilled,
        (state, action: PayloadAction<RepresentativesResponse>) => {
          state.status = 'succeeded';
          state.representatives = action.payload.data;
          state.isAdmin = action.payload.is_admin;
          state.error = null;
        }
      )
      .addCase(fetchCompanyRepresentatives.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message ?? 'errors.serverError';
      });

    // ── Invite Representative ──
    builder
      .addCase(inviteCompanyRepresentative.pending, (state) => {
        state.inviteStatus = 'loading';
        state.error = null;
        state.validationErrors = null;
      })
      .addCase(inviteCompanyRepresentative.fulfilled, (state) => {
        state.inviteStatus = 'succeeded';
        state.error = null;
        state.validationErrors = null;
      })
      .addCase(inviteCompanyRepresentative.rejected, (state, action) => {
        state.inviteStatus = 'failed';
        state.error = action.payload?.message ?? 'errors.serverError';
        state.validationErrors = action.payload?.errors ?? null;
      });

    // ── Update Me ──
    builder
      .addCase(updateCompanyRepresentativeMe.pending, (state) => {
        state.updateStatus = 'loading';
        state.error = null;
        state.validationErrors = null;
      })
      .addCase(updateCompanyRepresentativeMe.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        const updated = action.payload.data;
        const index = state.representatives.findIndex((r) => r.id === updated.id);
        if (index !== -1) {
          state.representatives[index] = { ...state.representatives[index], ...updated };
        }
      })
      .addCase(updateCompanyRepresentativeMe.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.error = action.payload?.message ?? 'errors.serverError';
        state.validationErrors = action.payload?.errors ?? null;
      });

    // ── Update Colleague ──
    builder
      .addCase(updateCompanyRepresentative.pending, (state) => {
        state.updateStatus = 'loading';
        state.error = null;
        state.validationErrors = null;
      })
      .addCase(updateCompanyRepresentative.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        const updated = action.payload.data;
        const index = state.representatives.findIndex((r) => r.id === updated.id);
        if (index !== -1) {
          state.representatives[index] = { ...state.representatives[index], ...updated };
        }
      })
      .addCase(updateCompanyRepresentative.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.error = action.payload?.message ?? 'errors.serverError';
        state.validationErrors = action.payload?.errors ?? null;
      });

    // ── Remove Representative ──
    builder
      .addCase(removeCompanyRepresentative.pending, (state) => {
        state.removeStatus = 'loading';
        state.error = null;
      })
      .addCase(removeCompanyRepresentative.fulfilled, (state, action) => {
        state.removeStatus = 'succeeded';
        state.representatives = state.representatives.filter((r) => r.id !== action.payload.id);
      })
      .addCase(removeCompanyRepresentative.rejected, (state, action) => {
        state.removeStatus = 'failed';
        state.error = action.payload?.message ?? 'errors.serverError';
      });
  },
});

export const { resetRepresentativesState, clearRepresentativeErrors } =
  companyRepresentativesSlice.actions;

export default companyRepresentativesSlice.reducer;
