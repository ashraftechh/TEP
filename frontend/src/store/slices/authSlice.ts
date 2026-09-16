import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { ApplicationCvFile } from '@/types/application';
import { api, primeCsrfCookie } from '@/lib/api';
import type {
  RegisterFormValues,
  LoginFormValues,
  CompleteRegistrationFormValues,
  ForgotPasswordFormValues,
  ResetPasswordFormValues,
} from '@/lib/validations/auth';
import { resetProfileState } from './profileSlice';
import axios from 'axios';

export interface RoleItem {
  id: number;
  name: string;
  label?: { ar?: string; en?: string };
  scope_type?: string | null;
  scope_id?: number | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  avatar_url?: string | null;
  status: 'active' | 'pending' | 'incomplete' | 'suspended';
  email_verified_at?: string | null;
  roles?: RoleItem[];
  permissions?: string[];
  student_profile?: Record<string, unknown> | null;
  company_representative?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

export interface ApiAuthError {
  message: string;
  error_code?:
    | 'email_not_verified'
    | 'account_suspended'
    | 'registration_incomplete'
    | 'registration_already_complete'
    | string;
  errors?: Record<string, string[]>;
  status?: number;
}

export interface VerifyEmailPayload {
  id: string | number;
  hash: string;
  expires?: string | null;
  signature?: string | null;
}

export interface CompleteRegistrationPayload {
  account_type: 'student';
  major_id: number | string;
}

export interface AuthState {
  user: User | null;
  registeredEmail: string | null;
  /**
   * True while the app is performing its initial /auth/me session check on startup.
   * Route guards must block rendering until this is false to prevent protected-page flash.
   */
  isInitializing: boolean;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  errorCode?: string | null;
  validationErrors: Record<string, string[]> | null;
  // Email verification state
  verificationStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  verificationError: string | null;
  verificationMessage: string | null;
  isLoginRequiredForVerification: boolean;
  // Resend verification state
  resendStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  resendMessage: string | null;
  resendError: string | null;
}

const initialState: AuthState = {
  user: null,
  registeredEmail: null,
  isInitializing: true, // true until the startup /auth/me check completes
  status: 'idle',
  error: null,
  errorCode: null,
  validationErrors: null,
  verificationStatus: 'idle',
  verificationError: null,
  verificationMessage: null,
  isLoginRequiredForVerification: false,
  resendStatus: 'idle',
  resendMessage: null,
  resendError: null,
};

export const registerUser = createAsyncThunk<
  { data: User; message?: string },
  RegisterFormValues,
  { rejectValue: ApiAuthError }
>('auth/registerUser', async (formData, { rejectWithValue }) => {
  try {
    // Prime CSRF cookie before making state-changing request
    await primeCsrfCookie();

    const response = await api.post<{ data: User; message?: string }>('/auth/register', formData);
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Validation failed',
        errors: err.response.data?.errors,
        status: err.response.status,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Network error during registration',
    });
  }
});

export const loginUser = createAsyncThunk<
  { data: User; message?: string },
  LoginFormValues,
  { rejectValue: ApiAuthError }
>('auth/loginUser', async (credentials, { rejectWithValue }) => {
  try {
    // Prime CSRF cookie before authentication request
    await primeCsrfCookie();

    const response = await api.post<{ data: User; message?: string }>('/auth/login', credentials);
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      let errorCode = err.response.data?.error_code;
      if (!errorCode) {
        if (err.response.status === 401) {
          errorCode = 'invalid_credentials';
        } else if (err.response.status >= 500) {
          errorCode = 'server_error';
        }
      }

      return rejectWithValue({
        message:
          err.response.data?.message ||
          (err.response.status === 401
            ? 'These credentials do not match our records.'
            : 'Login failed'),
        error_code: errorCode,
        errors: err.response.data?.errors,
        status: err.response.status,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Network error during login',
      error_code: 'network_error',
    });
  }
});

export const completeRegistration = createAsyncThunk<
  { data: User; message?: string },
  CompleteRegistrationPayload | CompleteRegistrationFormValues,
  { rejectValue: ApiAuthError }
>('auth/completeRegistration', async (payload, { rejectWithValue }) => {
  try {
    await primeCsrfCookie();

    const response = await api.post<{ data: User; message?: string }>(
      '/auth/complete-registration',
      payload
    );
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Failed to complete registration',
        error_code: err.response.data?.error_code,
        errors: err.response.data?.errors,
        status: err.response.status,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Network error during registration completion',
    });
  }
});

export const fetchCurrentUser = createAsyncThunk<
  { data: User },
  void,
  { rejectValue: ApiAuthError }
>('auth/fetchCurrentUser', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<{ data: User }>('/auth/me');
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Failed to fetch user',
        error_code: err.response.data?.error_code,
        status: err.response.status,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Network error',
    });
  }
});

export const resendVerificationEmail = createAsyncThunk<
  { message: string },
  void,
  { rejectValue: { message: string; status?: number } }
>('auth/resendVerificationEmail', async (_, { rejectWithValue }) => {
  try {
    await primeCsrfCookie();
    const response = await api.post<{ message: string }>('/auth/email/resend');
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Failed to resend verification email',
        status: err.response.status,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Network error',
    });
  }
});

export const verifyEmail = createAsyncThunk<
  { data?: User; message: string },
  VerifyEmailPayload,
  { rejectValue: { message: string; status?: number } }
>('auth/verifyEmail', async ({ id, hash, expires, signature }, { rejectWithValue }) => {
  try {
    const params: Record<string, string> = {};
    if (expires) params.expires = expires;
    if (signature) params.signature = signature;

    const response = await api.get<{ data?: User; message: string }>(
      `/auth/verify-email/${id}/${hash}`,
      { params }
    );
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Email verification failed',
        status: err.response.status,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Network error during verification',
    });
  }
});

export const forgotPassword = createAsyncThunk<
  { message: string },
  ForgotPasswordFormValues,
  { rejectValue: ApiAuthError }
>('auth/forgotPassword', async ({ email }, { rejectWithValue }) => {
  try {
    await primeCsrfCookie();
    const response = await api.post<{ message: string }>('/auth/forgot-password', { email });
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Failed to send password reset link',
        errors: err.response.data?.errors,
        status: err.response.status,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Network error during password reset request',
    });
  }
});

export const resetPassword = createAsyncThunk<
  { message: string },
  ResetPasswordFormValues,
  { rejectValue: ApiAuthError }
>('auth/resetPassword', async (payload, { rejectWithValue }) => {
  try {
    await primeCsrfCookie();
    const response = await api.post<{ message: string }>('/auth/reset-password', payload);
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Password reset failed',
        errors: err.response.data?.errors,
        status: err.response.status,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Network error during password reset',
    });
  }
});

export const logoutUser = createAsyncThunk<void, void, { rejectValue: ApiAuthError }>(
  'auth/logoutUser',
  async (_, { dispatch }) => {
    try {
      await api.post('/auth/logout');
    } catch (err: unknown) {
      // Log for debugging but do not block client-side logout
      console.error('Logout request failed on server:', err);
    } finally {
      // Always guarantee local Redux auth and profile states are completely purged
      dispatch(authSlice.actions.resetAuthState());
      dispatch(resetProfileState());
    }
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
      state.errorCode = null;
      state.validationErrors = null;
    },
    /** Manually set the initializing flag — used by AuthInitializer after startup check. */
    setInitializing: (state, action: PayloadAction<boolean>) => {
      state.isInitializing = action.payload;
    },
    resetAuthState: (state) => {
      state.user = null;
      state.registeredEmail = null;
      state.isInitializing = false; // after logout, session check is done
      state.status = 'idle';
      state.error = null;
      state.errorCode = null;
      state.validationErrors = null;
      state.verificationStatus = 'idle';
      state.verificationError = null;
      state.verificationMessage = null;
      state.isLoginRequiredForVerification = false;
      state.resendStatus = 'idle';
      state.resendMessage = null;
      state.resendError = null;
    },
    resetVerificationState: (state) => {
      state.verificationStatus = 'idle';
      state.verificationError = null;
      state.verificationMessage = null;
      state.isLoginRequiredForVerification = false;
    },
    resetResendState: (state) => {
      state.resendStatus = 'idle';
      state.resendMessage = null;
      state.resendError = null;
    },
    setRegisteredEmail: (state, action: PayloadAction<string | null>) => {
      state.registeredEmail = action.payload;
    },
    setAuthenticatedUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.registeredEmail = action.payload.email;
      state.status = 'succeeded';
      state.error = null;
      state.errorCode = null;
      state.validationErrors = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // registerUser
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.errorCode = null;
        state.validationErrors = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.data;
        state.registeredEmail = action.payload.data.email;
        state.error = null;
        state.errorCode = null;
        state.validationErrors = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message || 'Registration failed';
        state.errorCode = action.payload?.error_code || null;
        state.validationErrors = action.payload?.errors || null;
      })
      // loginUser
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.errorCode = null;
        state.validationErrors = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.data;
        state.error = null;
        state.errorCode = null;
        state.validationErrors = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message || 'Login failed';
        state.errorCode = action.payload?.error_code || null;
        state.validationErrors = action.payload?.errors || null;
      })
      // completeRegistration
      .addCase(completeRegistration.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.errorCode = null;
        state.validationErrors = null;
      })
      .addCase(completeRegistration.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.data;
        state.error = null;
        state.errorCode = null;
        state.validationErrors = null;
      })
      .addCase(completeRegistration.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message || 'Failed to complete registration';
        state.errorCode = action.payload?.error_code || null;
        state.validationErrors = action.payload?.errors || null;
      })
      // fetchCurrentUser
      .addCase(fetchCurrentUser.pending, () => {
        // isInitializing stays true until fulfilled/rejected
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload.data;
        state.status = 'succeeded';
        state.isInitializing = false;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.isInitializing = false;
      })
      // resendVerificationEmail
      .addCase(resendVerificationEmail.pending, (state) => {
        state.resendStatus = 'loading';
        state.resendError = null;
        state.resendMessage = null;
      })
      .addCase(resendVerificationEmail.fulfilled, (state, action) => {
        state.resendStatus = 'succeeded';
        state.resendMessage = action.payload.message;
        state.resendError = null;
      })
      .addCase(resendVerificationEmail.rejected, (state, action) => {
        state.resendStatus = 'failed';
        state.resendError = action.payload?.message || 'Failed to resend verification email';
      })
      // verifyEmail
      .addCase(verifyEmail.pending, (state) => {
        state.verificationStatus = 'loading';
        state.verificationError = null;
        state.verificationMessage = null;
        state.isLoginRequiredForVerification = false;
      })
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.verificationStatus = 'succeeded';
        if (action.payload.data) {
          state.user = {
            ...state.user,
            ...action.payload.data,
            roles: action.payload.data.roles || state.user?.roles,
            permissions: action.payload.data.permissions || state.user?.permissions,
            student_profile: action.payload.data.student_profile || state.user?.student_profile,
            company_representative:
              action.payload.data.company_representative || state.user?.company_representative,
          };
        }
        state.verificationMessage = action.payload.message;
        state.verificationError = null;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.verificationStatus = 'failed';
        state.verificationError = action.payload?.message || 'Verification failed';
        state.isLoginRequiredForVerification = action.payload?.status === 401;
      })
      // forgotPassword
      .addCase(forgotPassword.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.errorCode = null;
        state.validationErrors = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.status = 'succeeded';
        state.error = null;
        state.errorCode = null;
        state.validationErrors = null;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message || 'Failed to send password reset link';
        state.errorCode = action.payload?.error_code || null;
        state.validationErrors = action.payload?.errors || null;
      })
      // resetPassword
      .addCase(resetPassword.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.errorCode = null;
        state.validationErrors = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.status = 'succeeded';
        state.error = null;
        state.errorCode = null;
        state.validationErrors = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message || 'Password reset failed';
        state.errorCode = action.payload?.error_code || null;
        state.validationErrors = action.payload?.errors || null;
      })
      // logoutUser
      .addCase(logoutUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.registeredEmail = null;
        state.status = 'idle';
        state.error = null;
        state.errorCode = null;
        state.validationErrors = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.user = null;
        state.registeredEmail = null;
        state.status = 'idle';
        state.error = null;
        state.errorCode = null;
        state.validationErrors = null;
      })
      .addMatcher(
        (action): action is PayloadAction<ApplicationCvFile> =>
          action.type === 'application/uploadProfileCv/fulfilled',
        (state, action) => {
          if (state.user && state.user.student_profile) {
            state.user.student_profile = {
              ...state.user.student_profile,
              cv_file_id: action.payload.id,
              cv_file: action.payload,
            };
          }
        }
      );
  },
});

export const {
  clearAuthError,
  setInitializing,
  resetAuthState,
  resetVerificationState,
  resetResendState,
  setRegisteredEmail,
  setAuthenticatedUser,
} = authSlice.actions;

export default authSlice.reducer;
