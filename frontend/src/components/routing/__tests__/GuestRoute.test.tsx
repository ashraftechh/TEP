import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { GuestRoute } from '../GuestRoute';
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

const renderWithRouter = (store: ReturnType<typeof createTestStore>, initialRoute = '/login') =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<div>Guest Login Page</div>} />
          </Route>
          <Route path="/dashboard" element={<div>Authenticated Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

describe('GuestRoute Component', () => {
  it('renders loading screen while isInitializing is true', () => {
    const store = createTestStore({ isInitializing: true, user: null });
    renderWithRouter(store);

    expect(screen.getByRole('status', { name: /loading application/i })).toBeInTheDocument();
    expect(screen.queryByText('Guest Login Page')).not.toBeInTheDocument();
  });

  it('renders guest outlet when user is null and not initializing', () => {
    const store = createTestStore({ isInitializing: false, user: null });
    renderWithRouter(store);

    expect(screen.getByText('Guest Login Page')).toBeInTheDocument();
  });

  it('redirects authenticated user to /dashboard', () => {
    const store = createTestStore({ isInitializing: false, user: mockUser });
    renderWithRouter(store);

    expect(screen.getByText('Authenticated Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Guest Login Page')).not.toBeInTheDocument();
  });
});
