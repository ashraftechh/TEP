import { describe, it, expect } from 'vitest';
import authReducer, {
  clearAuthError,
  resetAuthState,
  setRegisteredEmail,
  registerUser,
  loginUser,
  completeRegistration,
  fetchCurrentUser,
  resendVerificationEmail,
  verifyEmail,
  forgotPassword,
  resetPassword,
  logoutUser,
  type AuthState,
  type User,
} from '../authSlice';

describe('authSlice Reducer & Actions', () => {
  const initialState: AuthState = {
    user: null,
    registeredEmail: null,
    isInitializing: true,
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

  const mockUser: User = {
    id: 10,
    name: 'Ahmed Student',
    email: 'ahmed@example.com',
    status: 'active',
    roles: [{ id: 1, name: 'student' }],
  };

  it('should return initial state when passed an empty action', () => {
    expect(authReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle setRegisteredEmail', () => {
    const nextState = authReducer(initialState, setRegisteredEmail('test@example.com'));
    expect(nextState.registeredEmail).toBe('test@example.com');
  });

  it('should handle clearAuthError', () => {
    const errorState: AuthState = {
      ...initialState,
      error: 'Some error',
      errorCode: 'email_not_verified',
      validationErrors: { email: ['Email taken'] },
    };
    const nextState = authReducer(errorState, clearAuthError());
    expect(nextState.error).toBeNull();
    expect(nextState.errorCode).toBeNull();
    expect(nextState.validationErrors).toBeNull();
  });

  it('should handle resetAuthState', () => {
    const activeState: AuthState = {
      user: mockUser,
      registeredEmail: 'ahmed@example.com',
      isInitializing: false,
      status: 'succeeded',
      error: null,
      errorCode: null,
      validationErrors: null,
      verificationStatus: 'succeeded',
      verificationError: null,
      verificationMessage: 'Verified',
      isLoginRequiredForVerification: false,
      resendStatus: 'succeeded',
      resendMessage: 'Sent',
      resendError: null,
    };
    const nextState = authReducer(activeState, resetAuthState());
    expect(nextState).toEqual({ ...initialState, isInitializing: false });
  });

  it('should handle registerUser.pending', () => {
    const nextState = authReducer(initialState, { type: registerUser.pending.type });
    expect(nextState.status).toBe('loading');
    expect(nextState.error).toBeNull();
    expect(nextState.validationErrors).toBeNull();
  });

  it('should handle registerUser.fulfilled', () => {
    const nextState = authReducer(
      { ...initialState, status: 'loading' },
      {
        type: registerUser.fulfilled.type,
        payload: { data: mockUser, message: 'Success' },
      }
    );
    expect(nextState.status).toBe('succeeded');
    expect(nextState.user).toEqual(mockUser);
    expect(nextState.registeredEmail).toBe('ahmed@example.com');
    expect(nextState.error).toBeNull();
  });

  it('should handle registerUser.rejected with validation errors (422)', () => {
    const validationErrors = {
      email: ['The email has already been taken.'],
      password: ['Password must be at least 8 characters.'],
    };

    const nextState = authReducer(
      { ...initialState, status: 'loading' },
      {
        type: registerUser.rejected.type,
        payload: { message: 'Validation failed', errors: validationErrors, status: 422 },
      }
    );

    expect(nextState.status).toBe('failed');
    expect(nextState.error).toBe('Validation failed');
    expect(nextState.validationErrors).toEqual(validationErrors);
  });

  // LoginUser tests
  it('should handle loginUser.pending', () => {
    const nextState = authReducer(initialState, { type: loginUser.pending.type });
    expect(nextState.status).toBe('loading');
    expect(nextState.error).toBeNull();
    expect(nextState.errorCode).toBeNull();
  });

  it('should handle loginUser.fulfilled', () => {
    const nextState = authReducer(
      { ...initialState, status: 'loading' },
      {
        type: loginUser.fulfilled.type,
        payload: { data: mockUser, message: 'Welcome back.' },
      }
    );
    expect(nextState.status).toBe('succeeded');
    expect(nextState.user).toEqual(mockUser);
    expect(nextState.error).toBeNull();
    expect(nextState.errorCode).toBeNull();
  });

  it('should handle loginUser.rejected with error_code', () => {
    const nextState = authReducer(
      { ...initialState, status: 'loading' },
      {
        type: loginUser.rejected.type,
        payload: {
          message: 'Please verify your email address to activate your account.',
          error_code: 'email_not_verified',
          status: 403,
        },
      }
    );

    expect(nextState.status).toBe('failed');
    expect(nextState.error).toBe('Please verify your email address to activate your account.');
    expect(nextState.errorCode).toBe('email_not_verified');
  });

  // completeRegistration tests
  it('should handle completeRegistration.pending', () => {
    const nextState = authReducer(initialState, { type: completeRegistration.pending.type });
    expect(nextState.status).toBe('loading');
    expect(nextState.error).toBeNull();
    expect(nextState.errorCode).toBeNull();
  });

  it('should handle completeRegistration.fulfilled', () => {
    const nextState = authReducer(
      { ...initialState, status: 'loading' },
      {
        type: completeRegistration.fulfilled.type,
        payload: { data: mockUser, message: 'Registration completed successfully.' },
      }
    );
    expect(nextState.status).toBe('succeeded');
    expect(nextState.user).toEqual(mockUser);
    expect(nextState.error).toBeNull();
    expect(nextState.errorCode).toBeNull();
  });

  it('should handle completeRegistration.rejected', () => {
    const nextState = authReducer(
      { ...initialState, status: 'loading' },
      {
        type: completeRegistration.rejected.type,
        payload: {
          message: 'Failed to complete registration',
          error_code: 'registration_already_complete',
          status: 403,
        },
      }
    );
    expect(nextState.status).toBe('failed');
    expect(nextState.error).toBe('Failed to complete registration');
    expect(nextState.errorCode).toBe('registration_already_complete');
  });

  // fetchCurrentUser tests
  it('should handle fetchCurrentUser.fulfilled', () => {
    const nextState = authReducer(initialState, {
      type: fetchCurrentUser.fulfilled.type,
      payload: { data: mockUser },
    });
    expect(nextState.user).toEqual(mockUser);
    expect(nextState.status).toBe('succeeded');
  });

  it('should handle resendVerificationEmail lifecycle', () => {
    let state = authReducer(initialState, { type: resendVerificationEmail.pending.type });
    expect(state.resendStatus).toBe('loading');

    state = authReducer(state, {
      type: resendVerificationEmail.fulfilled.type,
      payload: { message: 'Link sent' },
    });
    expect(state.resendStatus).toBe('succeeded');
    expect(state.resendMessage).toBe('Link sent');

    state = authReducer(state, {
      type: resendVerificationEmail.rejected.type,
      payload: { message: 'Too many requests', status: 429 },
    });
    expect(state.resendStatus).toBe('failed');
    expect(state.resendError).toBe('Too many requests');
  });

  it('should handle verifyEmail lifecycle', () => {
    let state = authReducer(initialState, { type: verifyEmail.pending.type });
    expect(state.verificationStatus).toBe('loading');

    state = authReducer(state, {
      type: verifyEmail.fulfilled.type,
      payload: { data: mockUser, message: 'Email verified' },
    });
    expect(state.verificationStatus).toBe('succeeded');
    expect(state.verificationMessage).toBe('Email verified');

    state = authReducer(state, {
      type: verifyEmail.rejected.type,
      payload: { message: 'Invalid token', status: 403 },
    });
    expect(state.verificationStatus).toBe('failed');
    expect(state.verificationError).toBe('Invalid token');
  });

  // forgotPassword tests
  it('should handle forgotPassword lifecycle', () => {
    let state = authReducer(initialState, { type: forgotPassword.pending.type });
    expect(state.status).toBe('loading');
    expect(state.error).toBeNull();

    state = authReducer(state, {
      type: forgotPassword.fulfilled.type,
      payload: { message: 'Link sent' },
    });
    expect(state.status).toBe('succeeded');
    expect(state.error).toBeNull();

    state = authReducer(state, {
      type: forgotPassword.rejected.type,
      payload: {
        message: 'Validation failed',
        errors: { email: ['The email field must be a valid email address.'] },
      },
    });
    expect(state.status).toBe('failed');
    expect(state.error).toBe('Validation failed');
    expect(state.validationErrors).toEqual({
      email: ['The email field must be a valid email address.'],
    });
  });

  // resetPassword tests
  it('should handle resetPassword lifecycle', () => {
    let state = authReducer(initialState, { type: resetPassword.pending.type });
    expect(state.status).toBe('loading');
    expect(state.error).toBeNull();

    state = authReducer(state, {
      type: resetPassword.fulfilled.type,
      payload: { message: 'Password reset successful' },
    });
    expect(state.status).toBe('succeeded');
    expect(state.error).toBeNull();

    state = authReducer(state, {
      type: resetPassword.rejected.type,
      payload: {
        message: 'This password reset token is invalid.',
        errors: { email: ['This password reset token is invalid.'] },
      },
    });
    expect(state.status).toBe('failed');
    expect(state.error).toBe('This password reset token is invalid.');
    expect(state.validationErrors).toEqual({
      email: ['This password reset token is invalid.'],
    });
  });

  // logoutUser tests
  it('should handle logoutUser lifecycle and purge auth state', () => {
    const loggedInState: AuthState = {
      ...initialState,
      user: mockUser,
      registeredEmail: 'salem@example.com',
      status: 'succeeded',
    };

    let state = authReducer(loggedInState, { type: logoutUser.pending.type });
    expect(state.status).toBe('loading');

    state = authReducer(state, { type: logoutUser.fulfilled.type });
    expect(state.status).toBe('idle');
    expect(state.user).toBeNull();
    expect(state.registeredEmail).toBeNull();

    // Even if rejected, state is reset to clean unauthenticated state
    state = authReducer(
      { ...loggedInState, status: 'loading' },
      { type: logoutUser.rejected.type }
    );
    expect(state.status).toBe('idle');
    expect(state.user).toBeNull();
    expect(state.registeredEmail).toBeNull();
  });
});
