import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AuthInitializer } from '../AuthInitializer';
import authReducer, { type AuthState, type User } from '@/store/slices/authSlice';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
  },
  primeCsrfCookie: vi.fn().mockResolvedValue({}),
}));

const mockUser: User = {
  id: 1,
  name: 'Salem Student',
  email: 'salem@university.edu',
  status: 'active',
  roles: [{ id: 1, name: 'student' }],
};

const createTestStore = (initialAuthState: Partial<AuthState> = {}) =>
  configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        registeredEmail: null,
        isInitializing: true,
        status: 'idle' as const,
        error: null,
        errorCode: null,
        validationErrors: null,
        verificationStatus: 'idle' as const,
        verificationError: null,
        verificationMessage: null,
        isLoginRequiredForVerification: false,
        resendStatus: 'idle' as const,
        resendMessage: null,
        resendError: null,
        ...initialAuthState,
      },
    },
  });

describe('AuthInitializer Component', () => {
  it('dispatches fetchCurrentUser on mount and renders children once authenticated', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { data: mockUser },
    });

    const store = createTestStore();
    render(
      <Provider store={store}>
        <AuthInitializer>
          <div>App Content</div>
        </AuthInitializer>
      </Provider>
    );

    // Initial state: shows loading screen
    expect(screen.getByRole('status', { name: /loading application/i })).toBeInTheDocument();
    expect(screen.queryByText('App Content')).not.toBeInTheDocument();

    // After fetchCurrentUser resolves
    await waitFor(() => {
      expect(screen.getByText('App Content')).toBeInTheDocument();
      expect(
        screen.queryByRole('status', { name: /loading application/i })
      ).not.toBeInTheDocument();
    });
  });

  it('renders children even if fetchCurrentUser rejects (unauthenticated guest session)', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Unauthenticated 401'));

    const store = createTestStore();
    render(
      <Provider store={store}>
        <AuthInitializer>
          <div>App Content</div>
        </AuthInitializer>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('App Content')).toBeInTheDocument();
      expect(store.getState().auth.isInitializing).toBe(false);
      expect(store.getState().auth.user).toBeNull();
    });
  });
});
