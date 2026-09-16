import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { CompleteRegistrationRoute } from '../CompleteRegistrationRoute';
import authReducer, { type AuthState, type User } from '@/store/slices/authSlice';

const incompleteUser: User = {
  id: 1,
  name: 'Salem Incomplete',
  email: 'salem@sso.edu',
  status: 'incomplete',
};

const activeUser: User = {
  id: 2,
  name: 'Salem Active',
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

const renderWithRouter = (store: ReturnType<typeof createTestStore>) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/complete-registration']}>
        <Routes>
          <Route element={<CompleteRegistrationRoute />}>
            <Route path="/complete-registration" element={<div>Complete Registration Form</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

describe('CompleteRegistrationRoute Component', () => {
  it('renders loading screen while isInitializing is true', () => {
    const store = createTestStore({ isInitializing: true, user: null });
    renderWithRouter(store);

    expect(screen.getByRole('status', { name: /loading application/i })).toBeInTheDocument();
  });

  it('redirects unauthenticated guest to /login', () => {
    const store = createTestStore({ isInitializing: false, user: null });
    renderWithRouter(store);

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects already active user to /dashboard', () => {
    const store = createTestStore({ isInitializing: false, user: activeUser });
    renderWithRouter(store);

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('renders complete registration outlet when user has incomplete status', () => {
    const store = createTestStore({ isInitializing: false, user: incompleteUser });
    renderWithRouter(store);

    expect(screen.getByText('Complete Registration Form')).toBeInTheDocument();
  });
});
