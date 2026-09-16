import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ProtectedRoute } from '../ProtectedRoute';
import authReducer, { type AuthState, type User } from '@/store/slices/authSlice';

const mockUser: User = {
  id: 1,
  name: 'Salem Student',
  email: 'salem@university.edu',
  status: 'active',
  email_verified_at: '2026-08-18T00:00:00Z',
  roles: [{ id: 1, name: 'student' }],
};

const createTestStore = (initialAuthState: Partial<AuthState>) =>
  configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        registeredEmail: null,
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

const renderWithRouter = (store: ReturnType<typeof createTestStore>, initialRoute = '/dashboard') =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Protected Dashboard Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

describe('ProtectedRoute Component', () => {
  it('renders loading screen while isInitializing is true (zero content flash)', () => {
    const store = createTestStore({ isInitializing: true, user: null });
    renderWithRouter(store);

    expect(screen.getByRole('status', { name: /loading application/i })).toBeInTheDocument();
    expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated guest to /login when isInitializing is false', () => {
    const store = createTestStore({ isInitializing: false, user: null });
    renderWithRouter(store);

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
  });

  it('renders protected outlet content when authenticated active user is present', () => {
    const store = createTestStore({ isInitializing: false, user: mockUser });
    renderWithRouter(store);

    expect(screen.getByText('Protected Dashboard Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('redirects authenticated incomplete user to /complete-registration', () => {
    const incompleteUser: User = {
      ...mockUser,
      status: 'incomplete',
    };
    const store = createTestStore({ isInitializing: false, user: incompleteUser });
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Protected Dashboard Content</div>} />
            </Route>
            <Route path="/complete-registration" element={<div>Complete Registration Page</div>} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(screen.getByText('Complete Registration Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Dashboard Content')).not.toBeInTheDocument();
  });
});
