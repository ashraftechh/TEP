import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@/context/ThemeContext';
import { LoginPage } from '../LoginPage';
import authReducer, { type AuthState } from '@/store/slices/authSlice';
import lookupReducer from '@/store/slices/lookupSlice';
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

const createTestStore = (initialAuthState: Partial<AuthState> = {}) =>
  configureStore({
    reducer: {
      auth: authReducer,
      lookup: lookupReducer,
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

const renderLoginPage = (store = createTestStore()) =>
  render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );

describe('LoginPage Component (TEP-563 Wired Flow)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
    vi.clearAllMocks();
  });

  it('renders the login page layout with theme toggle and language switcher', () => {
    renderLoginPage();

    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'تسجيل الدخول' })).toBeInTheDocument();
    expect(screen.getByLabelText(/البريد الإلكتروني/)).toBeInTheDocument();
    expect(screen.getByLabelText(/كلمة المرور/)).toBeInTheDocument();
  });

  it('toggles language when language button is clicked', async () => {
    renderLoginPage();

    const langButton = screen.getByText('English');
    fireEvent.click(langButton);

    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByText('العربية')).toBeInTheDocument();
  });

  it('navigates to /register when clicking the create account link', () => {
    renderLoginPage();

    const registerLink = screen.getByText('إنشاء حساب جديد');
    fireEvent.click(registerLink);

    expect(mockNavigate).toHaveBeenCalledWith('/register');
  });

  it('navigates to /forgot-password when clicking forgot password link', () => {
    renderLoginPage();

    const forgotPasswordLink = screen.getByText('نسيت كلمة المرور؟');
    fireEvent.click(forgotPasswordLink);

    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
  });

  it('successfully logs in a student user and redirects to /dashboard', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        data: {
          id: 1,
          name: 'Ahmed Student',
          email: 'ahmed.student@example.com',
          status: 'active',
          email_verified_at: '2026-08-18T00:00:00Z',
          roles: [{ id: 1, name: 'student' }],
        },
        message: 'Welcome back.',
      },
    });

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/البريد الإلكتروني/), {
      target: { value: 'ahmed.student@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/كلمة المرور/), {
      target: { value: 'SecurePass123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^تسجيل الدخول/ }));

    await waitFor(() => {
      expect(primeCsrfCookie).toHaveBeenCalled();
      expect(api.post).toHaveBeenCalledWith(
        '/auth/login',
        expect.objectContaining({
          email: 'ahmed.student@example.com',
          password: 'SecurePass123!',
        })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('displays VerifyEmailNotice when login fails with email_not_verified', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 403,
        data: {
          message: 'Please verify your email address to activate your account before logging in.',
          error_code: 'email_not_verified',
        },
      },
    });

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/البريد الإلكتروني/), {
      target: { value: 'pending.student@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/كلمة المرور/), {
      target: { value: 'SecurePass123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^تسجيل الدخول/ }));

    await waitFor(() => {
      expect(screen.getByText('تحقق من بريدك الإلكتروني')).toBeInTheDocument();
      expect(screen.getByText('pending.student@example.com')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /إعادة إرسال رابط التحقق/ })).toBeInTheDocument();
    });
  });

  it('displays suspended account error when login fails with account_suspended', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 403,
        data: {
          message: 'تم تعليق هذا الحساب. يرجى التواصل مع إدارة النظام.',
          error_code: 'account_suspended',
        },
      },
    });

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/البريد الإلكتروني/), {
      target: { value: 'suspended@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/كلمة المرور/), {
      target: { value: 'SecurePass123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^تسجيل الدخول/ }));

    await waitFor(() => {
      expect(
        screen.getByText('تم تعليق هذا الحساب. يرجى التواصل مع إدارة النظام.')
      ).toBeInTheDocument();
    });
  });

  it('displays generic invalid credentials error when login returns 401', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 401,
        data: {
          message: 'بيانات الاعتماد هذه غير متطابقة مع سجلاتنا.',
        },
      },
    });

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/البريد الإلكتروني/), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/كلمة المرور/), {
      target: { value: 'WrongPassword1!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^تسجيل الدخول/ }));

    await waitFor(() => {
      expect(screen.getByText('بيانات الاعتماد هذه غير متطابقة مع سجلاتنا.')).toBeInTheDocument();
    });
  });

  it('redirects to /complete-registration when login returns registration_incomplete', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 403,
        data: {
          message: 'تسجيلك غير مكتمل. يرجى إتمام إعداد حسابك.',
          error_code: 'registration_incomplete',
        },
      },
    });

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/البريد الإلكتروني/), {
      target: { value: 'incomplete@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/كلمة المرور/), {
      target: { value: 'Pass123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^تسجيل الدخول/ }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/complete-registration');
    });
  });

  it('displays localized Arabic error when backend server is down or returns server error', async () => {
    vi.mocked(api.post).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 500,
        data: null,
      },
    });

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/البريد الإلكتروني/), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/كلمة المرور/), {
      target: { value: 'Secret123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^تسجيل الدخول/ }));

    await waitFor(() => {
      expect(
        screen.getByText('حدث خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً.')
      ).toBeInTheDocument();
    });
  });

  it('displays localized Arabic error when network/connection failure occurs', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Network Error'));

    renderLoginPage();

    fireEvent.change(screen.getByLabelText(/البريد الإلكتروني/), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/كلمة المرور/), {
      target: { value: 'Secret123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^تسجيل الدخول/ }));

    await waitFor(() => {
      expect(
        screen.getByText('تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.')
      ).toBeInTheDocument();
    });
  });
});
