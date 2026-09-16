import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { api, primeCsrfCookie } from '@/lib/api';
import axios from 'axios';
import { type CompanyData, type UpdateCompanyProfilePayload } from '@/types/company';

export interface CompanyRegistrationRequestPayload {
  name: string;
  email: string;
  phone?: string;
  industry_id?: number | null;
  registration_number?: string;
  website?: string;
  description?: string;
}

export interface CompanyState {
  // Registration request state
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  successMessage: string | null;
  error: string | null;
  validationErrors: Record<string, string[]> | null;

  // Company profile state
  company: CompanyData | null;
  profileStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  profileError: string | null;

  // Update profile state
  updateStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  updateError: string | null;
  updateValidationErrors: Record<string, string[]> | null;
  updateSuccessMessage: string | null;

  // Logo upload state
  logoStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  logoError: string | null;
  logoValidationErrors: Record<string, string[]> | null;
  logoSuccessMessage: string | null;
}

const initialState: CompanyState = {
  status: 'idle',
  successMessage: null,
  error: null,
  validationErrors: null,
  company: null,
  profileStatus: 'idle',
  profileError: null,
  updateStatus: 'idle',
  updateError: null,
  updateValidationErrors: null,
  updateSuccessMessage: null,
  logoStatus: 'idle',
  logoError: null,
  logoValidationErrors: null,
  logoSuccessMessage: null,
};

export const submitCompanyRegistrationRequest = createAsyncThunk<
  string,
  CompanyRegistrationRequestPayload,
  { rejectValue: { message: string; errors?: Record<string, string[]> } }
>('company/submitRegistrationRequest', async (payload, { rejectWithValue }) => {
  try {
    await primeCsrfCookie();
    const response = await api.post<{ message: string }>('/companies/request', payload);
    return response.data.message;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message ?? 'errors.serverError',
        errors: err.response.data?.errors ?? undefined,
      });
    }
    return rejectWithValue({ message: 'errors.serverError' });
  }
});

export const fetchCompanyProfile = createAsyncThunk<
  CompanyData,
  void,
  { rejectValue: { message: string } }
>('company/fetchProfile', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<{ data: CompanyData; message?: string }>('/company');
    return response.data.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message ?? 'errors.serverError',
      });
    }
    return rejectWithValue({ message: 'errors.serverError' });
  }
});

export const updateCompanyProfile = createAsyncThunk<
  { company: CompanyData; message: string },
  UpdateCompanyProfilePayload,
  { rejectValue: { message: string; errors?: Record<string, string[]> } }
>('company/updateProfile', async (payload, { rejectWithValue }) => {
  try {
    await primeCsrfCookie();
    const response = await api.patch<{ data: CompanyData; message: string }>('/company', payload);
    return { company: response.data.data, message: response.data.message };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message ?? 'errors.serverError',
        errors: err.response.data?.errors ?? undefined,
      });
    }
    return rejectWithValue({ message: 'errors.serverError' });
  }
});

export const uploadCompanyLogo = createAsyncThunk<
  { company: CompanyData; message: string },
  File,
  { rejectValue: { message: string; errors?: Record<string, string[]> } }
>('company/uploadLogo', async (file, { rejectWithValue }) => {
  try {
    await primeCsrfCookie();
    const formData = new FormData();
    formData.append('logo', file);
    const response = await api.post<{ data: CompanyData; message: string }>(
      '/company/logo',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return { company: response.data.data, message: response.data.message };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message ?? 'errors.serverError',
        errors: err.response.data?.errors ?? undefined,
      });
    }
    return rejectWithValue({ message: 'errors.serverError' });
  }
});

const companySlice = createSlice({
  name: 'company',
  initialState,
  reducers: {
    resetCompanyRequestState(state) {
      state.status = 'idle';
      state.successMessage = null;
      state.error = null;
      state.validationErrors = null;
    },
    clearCompanyRequestError(state) {
      state.error = null;
      state.validationErrors = null;
    },
    setCompanyProfile(state, action: PayloadAction<CompanyData | null>) {
      state.company = action.payload;
    },
    clearCompanyProfileError(state) {
      state.profileError = null;
    },
    resetCompanyUpdateStatus(state) {
      state.updateStatus = 'idle';
      state.updateError = null;
      state.updateValidationErrors = null;
      state.updateSuccessMessage = null;
    },
    resetCompanyLogoStatus(state) {
      state.logoStatus = 'idle';
      state.logoError = null;
      state.logoValidationErrors = null;
      state.logoSuccessMessage = null;
    },
    clearCompanyErrors(state) {
      state.error = null;
      state.validationErrors = null;
      state.profileError = null;
      state.updateError = null;
      state.updateValidationErrors = null;
      state.logoError = null;
      state.logoValidationErrors = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Registration request
      .addCase(submitCompanyRegistrationRequest.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.validationErrors = null;
      })
      .addCase(
        submitCompanyRegistrationRequest.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.status = 'succeeded';
          state.successMessage = action.payload;
          state.error = null;
          state.validationErrors = null;
        }
      )
      .addCase(submitCompanyRegistrationRequest.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message ?? 'errors.serverError';
        state.validationErrors = action.payload?.errors ?? null;
      })
      // Fetch company profile
      .addCase(fetchCompanyProfile.pending, (state) => {
        state.profileStatus = 'loading';
        state.profileError = null;
      })
      .addCase(fetchCompanyProfile.fulfilled, (state, action: PayloadAction<CompanyData>) => {
        state.profileStatus = 'succeeded';
        state.company = action.payload;
        state.profileError = null;
      })
      .addCase(fetchCompanyProfile.rejected, (state, action) => {
        state.profileStatus = 'failed';
        state.profileError = action.payload?.message ?? 'errors.serverError';
      })
      // Update company profile
      .addCase(updateCompanyProfile.pending, (state) => {
        state.updateStatus = 'loading';
        state.updateError = null;
        state.updateValidationErrors = null;
        state.updateSuccessMessage = null;
      })
      .addCase(
        updateCompanyProfile.fulfilled,
        (state, action: PayloadAction<{ company: CompanyData; message: string }>) => {
          state.updateStatus = 'succeeded';
          state.company = action.payload.company;
          state.updateSuccessMessage = action.payload.message;
          state.updateError = null;
          state.updateValidationErrors = null;
        }
      )
      .addCase(updateCompanyProfile.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.updateError = action.payload?.message ?? 'errors.serverError';
        state.updateValidationErrors = action.payload?.errors ?? null;
      })
      // Upload company logo
      .addCase(uploadCompanyLogo.pending, (state) => {
        state.logoStatus = 'loading';
        state.logoError = null;
        state.logoValidationErrors = null;
        state.logoSuccessMessage = null;
      })
      .addCase(
        uploadCompanyLogo.fulfilled,
        (state, action: PayloadAction<{ company: CompanyData; message: string }>) => {
          state.logoStatus = 'succeeded';
          state.company = action.payload.company;
          state.logoSuccessMessage = action.payload.message;
          state.logoError = null;
          state.logoValidationErrors = null;
        }
      )
      .addCase(uploadCompanyLogo.rejected, (state, action) => {
        state.logoStatus = 'failed';
        state.logoError = action.payload?.message ?? 'errors.serverError';
        state.logoValidationErrors = action.payload?.errors ?? null;
      });
  },
});

export const {
  resetCompanyRequestState,
  clearCompanyRequestError,
  setCompanyProfile,
  clearCompanyProfileError,
  resetCompanyUpdateStatus,
  resetCompanyLogoStatus,
  clearCompanyErrors,
} = companySlice.actions;

export default companySlice.reducer;
