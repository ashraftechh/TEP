import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import axios from 'axios';
import { ThemeProvider } from '@/context/ThemeContext';
import { CompleteRegistrationPage } from '../CompleteRegistrationPage';
import authReducer, { type AuthState, type User } from '@/store/slices/authSlice';
import lookupReducer, { type LookupState } from '@/store/slices/lookupSlice';
import { api, primeCsrfCookie } from '@/lib/api';
import i18n from '@/i18n';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
  primeCsrfCookie: vi.fn().mockResolvedValue({}),
}));

const mockIncompleteUser: User = {
  id: 15,
  name: 'Salem SSO User',
  email: 'salem.sso@example.com',
  status: 'incomplete',
  email_verified_at: '2026-08-15T12:00:00.000Z',
};

const createTestStore = (
  initialAuthState: Partial<AuthState> = {},
  initialLookupState: Partial<LookupState> = {}
) =>
  configureStore({
    reducer: {
      auth: authReducer,
      lookup: lookupReducer,
    },
    preloadedState: {
      auth: {
        user: mockIncompleteUser,
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
      lookup: {
        majors: [
          {
            id: 1,
            code: 'SE',
            name: { ar: 'هندسة برمجيات', en: 'Software Engineering' },
            is_active: true,
          },
          { id: 2, code: 'CS', name: { ar: 'أمن سيبراني', en: 'Cybersecurity' }, is_active: true },
        ],
        industries: [],
        isLoadingMajors: false,
        isLoadingIndustries: false,
        majorsError: null,
        industriesError: null,
        ...initialLookupState,
      } as LookupState,
    },
  });

const renderPage = (store = createTestStore()) =>
  render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter>
          <CompleteRegistrationPage />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );

describe('CompleteRegistrationPage Component', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
    vi.clearAllMocks();
  });

  it('renders complete registration layout with user greeting, theme toggle, and language switcher', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'إكمال إعداد الحساب' })).toBeInTheDocument();
    expect(screen.getByText(/مرحباً، Salem SSO User/)).toBeInTheDocument();
    expect(screen.getByText('salem.sso@example.com')).toBeInTheDocument();
    expect(screen.getByText('التخصص')).toBeInTheDocument();

    const companyLink = screen.getByRole('link', { name: /أرسل طلباً/i });
    expect(companyLink).toBeInTheDocument();
    expect(companyLink).toHaveAttribute('href', '/register-company');
  });

  it('shows client-side validation error when submitting student without major', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /^إكمال التسجيل/ }));

    expect(await screen.findByText('يرجى اختيار التخصص الدراسي')).toBeInTheDocument();
  });

  it('submits student registration completion successfully and navigates to /dashboard', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        data: {
          ...mockIncompleteUser,
          status: 'active',
          roles: [{ id: 1, name: 'student' }],
          student_profile: { id: 1, major_id: 1, student_number: 'STU-2026-123456' },
        },
        message: 'Registration completed successfully.',
      },
    });

    renderPage();

    // Open major select
    const majorTrigger = screen.getByText('اختر تخصصك الدراسي');
    fireEvent.click(majorTrigger);

    // Select major
    const majorOption = await screen.findByText('هندسة برمجيات');
    fireEvent.click(majorOption);

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /^إكمال التسجيل/ }));

    await waitFor(() => {
      expect(primeCsrfCookie).toHaveBeenCalled();
      expect(api.post).toHaveBeenCalledWith('/auth/complete-registration', {
        account_type: 'student',
        major_id: '1',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('redirects to dashboard when complete-registration returns 403 registration_already_complete', async () => {
    const axiosError = new axios.AxiosError(
      'تم إكمال إعداد هذا الحساب بالفعل.',
      '403',
      undefined,
      undefined,
      {
        status: 403,
        data: {
          message: 'تم إكمال إعداد هذا الحساب بالفعل.',
          error_code: 'registration_already_complete',
        },
        headers: {},
        config: {} as never,
        statusText: 'Forbidden',
      } as never
    );

    vi.mocked(api.post).mockRejectedValueOnce(axiosError);

    renderPage();

    // Select major
    fireEvent.click(screen.getByText('اختر تخصصك الدراسي'));
    fireEvent.click(await screen.findByText('هندسة برمجيات'));

    fireEvent.click(screen.getByRole('button', { name: /^إكمال التسجيل/ }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });
});
