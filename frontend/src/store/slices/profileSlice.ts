import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { api, primeCsrfCookie } from '@/lib/api';
import axios from 'axios';
import { type UserProfile, type UpdateProfilePayload } from '@/types/profile';

export interface ProfileState {
  profile: UserProfile | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  updateStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  avatarStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  passwordStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  skillStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  ssoStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  validationErrors: Record<string, string[]> | null;
  successMessage: string | null;
}

const initialState: ProfileState = {
  profile: null,
  status: 'idle',
  updateStatus: 'idle',
  avatarStatus: 'idle',
  passwordStatus: 'idle',
  skillStatus: 'idle',
  ssoStatus: 'idle',
  error: null,
  validationErrors: null,
  successMessage: null,
};

export const fetchProfile = createAsyncThunk<
  UserProfile,
  void,
  { rejectValue: { message: string; status?: number } }
>('profile/fetchProfile', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get<{ data: UserProfile }>('/profile');
    return response.data.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Failed to load profile',
        status: err.response.status,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Failed to load profile',
    });
  }
});

export const updateProfile = createAsyncThunk<
  { profile: UserProfile; message?: string },
  UpdateProfilePayload,
  { rejectValue: { message: string; errors?: Record<string, string[]>; status?: number } }
>('profile/updateProfile', async (payload, { rejectWithValue }) => {
  try {
    await primeCsrfCookie();
    const response = await api.patch<{ data: UserProfile; message?: string }>('/profile', payload);
    return {
      profile: response.data.data,
      message: response.data.message,
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Failed to update profile',
        errors: err.response.data?.errors,
        status: err.response.status,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Failed to update profile',
    });
  }
});

export const attachSkill = createAsyncThunk<
  { skill_id: number; proficiency: string; message?: string },
  { skill_id: number; proficiency: string },
  { rejectValue: { message: string; errors?: Record<string, string[]>; status?: number } }
>('profile/attachSkill', async (payload, { rejectWithValue, dispatch }) => {
  try {
    await primeCsrfCookie();
    const response = await api.post<{ message: string }>('/profile/skills', payload);
    // Refresh full profile so skills with name & relations are updated
    dispatch(fetchProfile());
    return {
      skill_id: payload.skill_id,
      proficiency: payload.proficiency,
      message: response.data.message,
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Failed to attach skill',
        errors: err.response.data?.errors,
        status: err.response.status,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Failed to attach skill',
    });
  }
});

export const detachSkill = createAsyncThunk<
  { skillId: number; message?: string },
  number,
  { rejectValue: { message: string; status?: number } }
>('profile/detachSkill', async (skillId, { rejectWithValue, dispatch }) => {
  try {
    await primeCsrfCookie();
    const response = await api.delete<{ message: string }>(`/profile/skills/${skillId}`);
    dispatch(fetchProfile());
    return { skillId, message: response.data.message };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Failed to detach skill',
        status: err.response.status,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Failed to detach skill',
    });
  }
});

export const unlinkSso = createAsyncThunk<
  { provider: string; message?: string },
  string,
  { rejectValue: { message: string; status?: number } }
>('profile/unlinkSso', async (provider, { rejectWithValue, dispatch }) => {
  try {
    await primeCsrfCookie();
    const response = await api.delete<{ message: string }>(`/profile/sso/${provider}`);
    dispatch(fetchProfile());
    return { provider, message: response.data.message };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Failed to unlink SSO account',
        status: err.response.status,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Failed to unlink SSO account',
    });
  }
});

export const uploadAvatar = createAsyncThunk<
  { profile: UserProfile; message?: string },
  File,
  { rejectValue: { message: string; errors?: Record<string, string[]>; status?: number } }
>('profile/uploadAvatar', async (file, { rejectWithValue }) => {
  try {
    await primeCsrfCookie();
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await api.post<{ data: UserProfile; message?: string }>(
      '/profile/avatar',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );

    return {
      profile: response.data.data,
      message: response.data.message,
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Failed to upload avatar',
        errors: err.response.data?.errors,
        status: err.response.status,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Failed to upload avatar',
    });
  }
});

export interface ChangePasswordPayload {
  current_password?: string;
  new_password: string;
  new_password_confirmation: string;
}

export const changePassword = createAsyncThunk<
  { message: string },
  ChangePasswordPayload,
  { rejectValue: { message: string; errors?: Record<string, string[]>; status?: number } }
>('profile/changePassword', async (payload, { rejectWithValue }) => {
  try {
    await primeCsrfCookie();
    const response = await api.post<{ message: string }>('/profile/change-password', payload);
    return response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      return rejectWithValue({
        message: err.response.data?.message || 'Failed to change password',
        errors: err.response.data?.errors,
        status: err.response.status,
      });
    }
    return rejectWithValue({
      message: err instanceof Error ? err.message : 'Failed to change password',
    });
  }
});

export const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    clearProfileErrors: (state) => {
      state.error = null;
      state.validationErrors = null;
      state.successMessage = null;
    },
    resetProfileState: () => initialState,
  },
  extraReducers: (builder) => {
    // Fetch Profile
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload?.message || 'Failed to load profile';
      });

    // Update Profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.updateStatus = 'loading';
        state.error = null;
        state.validationErrors = null;
        state.successMessage = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        state.profile = action.payload.profile;
        state.successMessage = action.payload.message || 'Profile updated successfully';
        state.error = null;
        state.validationErrors = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.error = action.payload?.message || 'Failed to update profile';
        state.validationErrors = action.payload?.errors || null;
      });

    // Change Password
    builder
      .addCase(changePassword.pending, (state) => {
        state.passwordStatus = 'loading';
        state.error = null;
        state.validationErrors = null;
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.passwordStatus = 'succeeded';
        state.successMessage = action.payload.message || 'Password updated successfully';
        if (state.profile) {
          state.profile.has_password = true;
        }
        state.error = null;
        state.validationErrors = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.passwordStatus = 'failed';
        state.error = action.payload?.message || 'Failed to change password';
        state.validationErrors = action.payload?.errors || null;
      });

    // Upload Avatar
    builder
      .addCase(uploadAvatar.pending, (state) => {
        state.avatarStatus = 'loading';
        state.error = null;
        state.validationErrors = null;
      })
      .addCase(uploadAvatar.fulfilled, (state, action) => {
        state.avatarStatus = 'succeeded';
        state.profile = action.payload.profile;
        state.successMessage = action.payload.message || 'Avatar updated successfully';
        state.error = null;
        state.validationErrors = null;
      })
      .addCase(uploadAvatar.rejected, (state, action) => {
        state.avatarStatus = 'failed';
        state.error = action.payload?.message || 'Failed to upload avatar';
        state.validationErrors = action.payload?.errors || null;
      });

    // Attach Skill
    builder
      .addCase(attachSkill.pending, (state) => {
        state.skillStatus = 'loading';
        state.error = null;
      })
      .addCase(attachSkill.fulfilled, (state) => {
        state.skillStatus = 'succeeded';
        state.error = null;
      })
      .addCase(attachSkill.rejected, (state, action) => {
        state.skillStatus = 'failed';
        state.error = action.payload?.message || 'Failed to attach skill';
      });

    // Detach Skill
    builder
      .addCase(detachSkill.pending, (state) => {
        state.skillStatus = 'loading';
        state.error = null;
      })
      .addCase(detachSkill.fulfilled, (state) => {
        state.skillStatus = 'succeeded';
        state.error = null;
      })
      .addCase(detachSkill.rejected, (state, action) => {
        state.skillStatus = 'failed';
        state.error = action.payload?.message || 'Failed to detach skill';
      });

    // Unlink SSO
    builder
      .addCase(unlinkSso.pending, (state) => {
        state.ssoStatus = 'loading';
        state.error = null;
      })
      .addCase(unlinkSso.fulfilled, (state) => {
        state.ssoStatus = 'succeeded';
        state.error = null;
      })
      .addCase(unlinkSso.rejected, (state, action) => {
        state.ssoStatus = 'failed';
        state.error = action.payload?.message || 'Failed to unlink account';
      })
      .addMatcher(
        (
          action
        ): action is PayloadAction<{
          id: number;
          original_name: string;
          url: string;
          size_bytes?: number;
          mime_type?: string;
        }> => action.type === 'application/uploadProfileCv/fulfilled',
        (state, action) => {
          if (state.profile && state.profile.student_profile && action.payload) {
            state.profile.student_profile = {
              ...state.profile.student_profile,
              cv_file_id: action.payload.id,
              cv_file: action.payload,
            };
          }
        }
      );
  },
});

export const { clearProfileErrors, resetProfileState } = profileSlice.actions;
export default profileSlice.reducer;
