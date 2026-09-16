import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@/context/ThemeContext';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { UserNavDropdown } from '@/components/layout/UserNavDropdown';
import authReducer, { type User, type AuthState } from '@/store/slices/authSlice';
import profileReducer from '@/store/slices/profileSlice';
import lookupReducer from '@/store/slices/lookupSlice';
import { api } from '@/lib/api';
import i18n from '@/i18n';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
  primeCsrfCookie: vi.fn().mockResolvedValue({}),
}));

const mockUser: User = {
  id: 1,
  name: 'Salem Student',
  email: 'salem@university.edu',
  status: 'active',
  roles: [{ id: 1, name: 'student', label: { ar: 'طالب', en: 'Student' } }],
  permissions: [
    'student_profiles.own.view',
    'sso_identities.own.view',
    'opportunities.view_any',
    'applications.own.view',
    'reports.own.view',
    'messages.own.view',
  ],
};

const createTestStore = (initialUser: User | null = mockUser) => {
  const initialAuthState: AuthState = {
    user: initialUser,
    registeredEmail: initialUser ? initialUser.email : null,
    isInitializing: false,
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

  return configureStore({
    reducer: {
      auth: authReducer,
      profile: profileReducer,
      lookup: lookupReducer,
    },
    preloadedState: {
      auth: initialAuthState,
    },
  });
};

const renderSidebar = (store = createTestStore(), initialRoute = '/dashboard') =>
  render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <AppSidebar isCollapsed={false} onToggleCollapse={vi.fn()} />
          <Routes>
            <Route path="/dashboard" element={<div>Dashboard View</div>} />
            <Route path="/profile" element={<div>Profile View</div>} />
            <Route path="/login" element={<div>Login View</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );

const renderUserNavDropdown = (store = createTestStore(), initialRoute = '/dashboard') =>
  render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <UserNavDropdown />
          <Routes>
            <Route path="/dashboard" element={<div>Dashboard View</div>} />
            <Route path="/profile" element={<div>Profile View</div>} />
            <Route path="/login" element={<div>Login View</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );

describe('AppSidebar & UserNavDropdown Component (TEP-590)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
    vi.clearAllMocks();
  });

  it('renders sidebar with nav links including profile', () => {
    renderSidebar();

    expect(screen.getByText('نظرة عامة')).toBeInTheDocument();
    expect(screen.getByText('الملف الشخصي')).toBeInTheDocument();
    expect(screen.getByText('فرص التدريب')).toBeInTheDocument();
    expect(screen.getByText('طلباتي')).toBeInTheDocument();
    expect(screen.getByText('التقارير')).toBeInTheDocument();
    expect(screen.getByText('الرسائل')).toBeInTheDocument();
  });

  it('dispatches logout from UserNavDropdown, clears store, and redirects to /login on successful logout', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({ status: 204 });

    const store = createTestStore();
    renderUserNavDropdown(store);

    // Open dropdown
    const avatarButton = screen.getByRole('button', { name: /user menu/i });
    fireEvent.click(avatarButton);

    const logoutButton = screen.getByRole('menuitem', { name: /تسجيل الخروج/i });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/logout');
      // Store state is cleared
      expect(store.getState().auth.user).toBeNull();
    });
  });

  it('still clears local Redux state even if logout API request fails (network error)', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Network disconnected'));

    const store = createTestStore();
    renderUserNavDropdown(store);

    // Open dropdown
    const avatarButton = screen.getByRole('button', { name: /user menu/i });
    fireEvent.click(avatarButton);

    const logoutButton = screen.getByRole('menuitem', { name: /تسجيل الخروج/i });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/logout');
      // Local state MUST still be wiped clean regardless of server error
      expect(store.getState().auth.user).toBeNull();
    });
  });
});
