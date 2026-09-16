import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@/context/ThemeContext';
import AppLayout from '../AppLayout';
import authReducer, { type User, type AuthState } from '@/store/slices/authSlice';
import i18n from '@/i18n';

const mockUser: User = {
  id: 1,
  name: 'Salem Student',
  email: 'salem@university.edu',
  status: 'active',
  roles: [{ id: 1, name: 'student' }],
  permissions: ['student_profiles.own.view', 'sso_identities.own.view'],
};

const createTestStore = (initialAuthState: Partial<AuthState> = {}) =>
  configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: mockUser,
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

const renderAppLayout = (store = createTestStore(), initialRoute = '/dashboard') =>
  render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<div>Dashboard Child Page</div>} />
              <Route path="/profile" element={<div>Profile Child Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );

describe('AppLayout Component', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
    vi.clearAllMocks();
  });

  it('renders sidebar navigation, header controls, and nested child route', () => {
    renderAppLayout();

    expect(screen.getAllByText('نظرة عامة').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('الملف الشخصي').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Dashboard Child Page')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /toggle language/i })).toBeInTheDocument();
  });

  it('toggles language when header language button is clicked', async () => {
    renderAppLayout();

    const langButton = screen.getByRole('button', { name: /toggle language/i });
    fireEvent.click(langButton);

    const overviewLabels = await screen.findAllByText('Overview');
    expect(overviewLabels.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Profile').length).toBeGreaterThanOrEqual(1);
  });
});
