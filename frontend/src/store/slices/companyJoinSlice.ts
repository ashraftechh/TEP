import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api, primeCsrfCookie } from '@/lib/api';
import type { User, ApiAuthError } from './authSlice';
import axios from 'axios';

export interface CompanyJoinDetails {
  company_id: number;
  company_name: string;
  contact_email?: string;
  /** Pre-filled representative email from the invite URL (editable by user) */
  email: string;
}

export interface CompanyJoinState {
  /** Invite inspection state */
  inspectStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  joinDetails: CompanyJoinDetails | null;
  inspectError: string | null;
  inspectErrorCode: string | null;

  /** Registration submission state */
  submitStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  submitError: string | null;
  submitErrorCode: string | null;
  submitValidationErrors: Record<string, string[]> | null;
}

const initialState: CompanyJoinState = {
  inspectStatus: 'idle',
  joinDetails: null,
  inspectError: null,
  inspectErrorCode: null,

  submitStatus: 'idle',
  submitError: null,
  submitErrorCode: null,
  submitValidationErrors: null,
};

/**
 * Inspect company join invite: GET /companies/join/{company}?email=...&signature=...&expires=...
 * The full query string (including signature/expiry) must be forwarded as-is.
 */
export const inspectCompanyJoinInvite = createAsyncThunk<
  { data: CompanyJoinDetails; message: string },
  { companyId: string; queryString: string },
  { rejectValue: ApiAuthError }
>('companyJoin/inspect', async ({ companyId, queryString }, { rejectWithValue }) => {
  try {
    const response = await api.get<{ data: CompanyJoinDetails; message: string }>(
      `/companies/join/${companyId}${queryString}`
    );
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Invite inspection failed',
        error_code: err.response.data?.error_code,
        status: err.response.status,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Network error',
    });
  }
});

export interface CompanyJoinRegisterPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  password_confirmation: string;
}

/**
 * Register new user via company join: POST /companies/join/{company}/register?...
 */
export const companyJoinRegister = createAsyncThunk<
  { data: User; message: string },
  { companyId: string; queryString: string; formData: CompanyJoinRegisterPayload },
  { rejectValue: ApiAuthError }
>('companyJoin/register', async ({ companyId, queryString, formData }, { rejectWithValue }) => {
  try {
    await primeCsrfCookie();
    const response = await api.post<{ data: User; message: string }>(
      `/companies/join/${companyId}/register${queryString}`,
      formData
    );
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Registration failed',
        error_code: err.response.data?.error_code,
        errors: err.response.data?.errors,
        status: err.response.status,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Network error',
    });
  }
});

const companyJoinSlice = createSlice({
  name: 'companyJoin',
  initialState,
  reducers: {
    resetCompanyJoinState(state) {
      state.inspectStatus = 'idle';
      state.joinDetails = null;
      state.inspectError = null;
      state.inspectErrorCode = null;
      state.submitStatus = 'idle';
      state.submitError = null;
      state.submitErrorCode = null;
      state.submitValidationErrors = null;
    },
    clearCompanyJoinSubmitError(state) {
      state.submitError = null;
      state.submitErrorCode = null;
      state.submitValidationErrors = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // inspectCompanyJoinInvite
      .addCase(inspectCompanyJoinInvite.pending, (state) => {
        state.inspectStatus = 'loading';
        state.inspectError = null;
        state.inspectErrorCode = null;
        state.joinDetails = null;
      })
      .addCase(inspectCompanyJoinInvite.fulfilled, (state, action) => {
        state.inspectStatus = 'succeeded';
        state.joinDetails = action.payload.data;
        state.inspectError = null;
      })
      .addCase(inspectCompanyJoinInvite.rejected, (state, action) => {
        state.inspectStatus = 'failed';
        state.inspectError = action.payload?.message || 'Failed to inspect invite';
        state.inspectErrorCode = action.payload?.error_code || null;
      })
      // companyJoinRegister
      .addCase(companyJoinRegister.pending, (state) => {
        state.submitStatus = 'loading';
        state.submitError = null;
        state.submitErrorCode = null;
        state.submitValidationErrors = null;
      })
      .addCase(companyJoinRegister.fulfilled, (state) => {
        state.submitStatus = 'succeeded';
        state.submitError = null;
        state.submitErrorCode = null;
        state.submitValidationErrors = null;
      })
      .addCase(companyJoinRegister.rejected, (state, action) => {
        state.submitStatus = 'failed';
        state.submitError = action.payload?.message || 'Registration failed';
        state.submitErrorCode = action.payload?.error_code || null;
        state.submitValidationErrors = action.payload?.errors || null;
      });
  },
});

export const { resetCompanyJoinState, clearCompanyJoinSubmitError } = companyJoinSlice.actions;
export default companyJoinSlice.reducer;
