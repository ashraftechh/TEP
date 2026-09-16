import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/store/slices/authSlice';
import { PermissionRoute } from '../PermissionRoute';

const createTestStore = (permissions: string[] = []) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          status: 'active' as const,
          roles: [{ id: 1, name: 'student', label: { ar: 'طالب', en: 'Student' } }],
          permissions,
          created_at: '2026-08-01',
          updated_at: '2026-08-01',
        },
        status: 'idle' as const,
        error: null,
        errorCode: null,
        registeredEmail: null,
        validationErrors: null,
        verificationStatus: 'idle' as const,
        verificationError: null,
        verificationMessage: null,
        isLoginRequiredForVerification: false,
        resendStatus: 'idle' as const,
        resendMessage: null,
        resendError: null,
        isInitializing: false,
      },
    },
  });
};

const renderWithRouter = (store: ReturnType<typeof createTestStore>, permission: string) => {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<PermissionRoute permission={permission} redirectTo="/dashboard" />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

describe('PermissionRoute', () => {
  it('renders child content when user has the required permission', () => {
    const store = createTestStore(['opportunities.own.create', 'opportunities.view_any']);
    renderWithRouter(store, 'opportunities.own.create');

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to fallback when user lacks the required permission', () => {
    const store = createTestStore(['opportunities.view_any']);
    renderWithRouter(store, 'opportunities.own.create');

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });
});
