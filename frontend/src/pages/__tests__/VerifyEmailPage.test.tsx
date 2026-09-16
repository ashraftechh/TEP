import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import lookupReducer from '@/store/slices/lookupSlice';
import { ThemeProvider } from '@/context/ThemeContext';
import { VerifyEmailPage } from '../VerifyEmailPage';
import { api } from '@/lib/api';
import i18n from '@/i18n';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
  primeCsrfCookie: vi.fn().mockResolvedValue({}),
}));

import type { AuthState, User } from '@/store/slices/authSlice';

// A pending (unverified) authenticated user
const pendingUser: User = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  status: 'pending',
  email_verified_at: null,
};

const createMockStore = (initialAuthState: Partial<AuthState> = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      lookup: lookupReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        registeredEmail: 'test@example.com',
        isInitializing: false,
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
};

describe('VerifyEmailPage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
  });

  it('renders unverified notice screen when authenticated pending user visits /verify-email without tokens', () => {
    const store = createMockStore({ user: pendingUser });

    render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/verify-email']}>
            <Routes>
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/dashboard" element={<div>Dashboard Page</div>} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );

    expect(screen.getByText('Check Your Email')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend verification link/i })).toBeInTheDocument();
  });

  it('redirects unauthenticated user to /login when visiting /verify-email without tokens', () => {
    const store = createMockStore({ user: null });

    render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter initialEntries={['/verify-email']}>
            <Routes>
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/login" element={<div>Login Page</div>} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects unauthenticated user to /login when clicking verification link (preserves URL in state)', () => {
    const store = createMockStore({ user: null });

    render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter
            initialEntries={['/verify-email?id=1&hash=abc12345&expires=123456&signature=sig789']}
          >
            <Routes>
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/login" element={<div>Login Page</div>} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('automatically triggers verification when authenticated user visits link with tokens', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        data: {
          id: 1,
          email: 'verified@example.com',
          status: 'active',
          email_verified_at: '2026-08-16',
        },
        message: 'Your email has been verified successfully. Your account is now active.',
      },
    });

    const store = createMockStore({ user: pendingUser });

    render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter
            initialEntries={['/verify-email?id=1&hash=abc12345&expires=123456&signature=sig789']}
          >
            <Routes>
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/dashboard" element={<div>Dashboard Page</div>} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/auth/verify-email/1/abc12345', {
        params: { expires: '123456', signature: 'sig789' },
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Verification Successful!')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to dashboard/i })).toBeInTheDocument();
    });

    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        data: {
          id: 1,
          email: 'verified@example.com',
          status: 'active',
          email_verified_at: '2026-08-16',
          roles: [{ id: 1, name: 'student' }],
        },
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /go to dashboard/i }));

    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });
  });

  it('shows error state when verification link is invalid or expired', async () => {
    vi.mocked(api.get).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 403,
        data: { message: 'Invalid or expired signature' },
      },
    });

    const store = createMockStore({ user: pendingUser });

    render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter
            initialEntries={[
              '/verify-email?id=1&hash=invalidhash&expires=123456&signature=invalidsig',
            ]}
          >
            <Routes>
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/login" element={<div>Login Page</div>} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Verification Failed')).toBeInTheDocument();
      expect(screen.getByText(/expired or is no longer valid/i)).toBeInTheDocument();
      expect(screen.getByText(/Request New Link/i)).toBeInTheDocument();
    });
  });
});
