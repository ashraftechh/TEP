import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { RoleRoute } from '../RoleRoute';
import authReducer, { type AuthState, type User } from '@/store/slices/authSlice';

const studentUser: User = {
  id: 1,
  name: 'Salem Student',
  email: 'salem@university.edu',
  status: 'active',
  email_verified_at: '2026-08-18T00:00:00Z',
  roles: [{ id: 1, name: 'student' }],
};

const companyUser: User = {
  id: 2,
  name: 'Hassan Representative',
  email: 'hassan@company.com',
  status: 'active',
  email_verified_at: '2026-08-18T00:00:00Z',
  roles: [{ id: 2, name: 'company_representative' }],
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

const renderWithRouter = (
  store: ReturnType<typeof createTestStore>,
  roles: string[],
  initialRoute = '/company/team'
) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route element={<RoleRoute roles={roles} />}>
            <Route path="/company/team" element={<div>Company Team Content</div>} />
          </Route>
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

describe('RoleRoute Component', () => {
  it('redirects unauthorized users (e.g. student) to /dashboard', () => {
    const store = createTestStore({ user: studentUser });
    renderWithRouter(store, ['company_representative']);

    expect(screen.queryByText('Company Team Content')).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('renders child route if user has the required role', () => {
    const store = createTestStore({ user: companyUser });
    renderWithRouter(store, ['company_representative']);

    expect(screen.getByText('Company Team Content')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument();
  });
});
