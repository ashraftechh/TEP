import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import axios from 'axios';
import { ThemeProvider } from '@/context/ThemeContext';
import { ForgotPasswordPage } from '../ForgotPasswordPage';
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

const renderForgotPasswordPage = (store = createTestStore()) =>
  render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter>
          <ForgotPasswordPage />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );

describe('ForgotPasswordPage Component (TEP-580)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
    vi.clearAllMocks();
  });

  it('renders the forgot password layout with theme toggle and language switcher', () => {
    renderForgotPasswordPage();

    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'استعادة كلمة المرور' })).toBeInTheDocument();
    expect(screen.getByLabelText(/البريد الإلكتروني/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /إرسال رابط إعادة التعيين/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /العودة إلى تسجيل الدخول/ })).toBeInTheDocument();
  });

  it('toggles language when language switcher button is clicked', async () => {
    renderForgotPasswordPage();

    const langButton = screen.getByText('English');
    fireEvent.click(langButton);

    expect(await screen.findByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Reset Link/ })).toBeInTheDocument();
    expect(screen.getByText('العربية')).toBeInTheDocument();
  });

  it('navigates to /login when clicking the back to login button', () => {
    renderForgotPasswordPage();

    const backButton = screen.getByRole('button', { name: /العودة إلى تسجيل الدخول/ });
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('displays client-side validation errors when submitting empty form', async () => {
    renderForgotPasswordPage();

    const submitBtn = screen.getByRole('button', { name: /إرسال رابط إعادة التعيين/ });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('البريد الإلكتروني مطلوب')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('displays validation error for malformed email', async () => {
    renderForgotPasswordPage();

    const emailInput = screen.getByLabelText(/البريد الإلكتروني/);
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });

    const submitBtn = screen.getByRole('button', { name: /إرسال رابط إعادة التعيين/ });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('يرجى إدخال بريد إلكتروني صالح')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('submits valid email and transitions to confirmation screen (non-enumeration guarantee)', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        message:
          'If that email address is registered, you will receive a password reset link shortly.',
      },
    });

    renderForgotPasswordPage();

    const emailInput = screen.getByLabelText(/البريد الإلكتروني/);
    fireEvent.change(emailInput, { target: { value: 'salem@example.com' } });

    const submitBtn = screen.getByRole('button', { name: /إرسال رابط إعادة التعيين/ });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(primeCsrfCookie).toHaveBeenCalled();
      expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'salem@example.com',
      });
    });

    // Confirmation screen must be shown
    expect(await screen.findByText('تم إرسال الرابط')).toBeInTheDocument();
    expect(screen.getByText('salem@example.com')).toBeInTheDocument();
    expect(screen.getByText(/إذا كان هذا البريد مسجلاً لدينا/)).toBeInTheDocument();
  });

  it('allows user to resend or enter a different email from confirmation screen', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        message: 'Reset link sent.',
      },
    });

    renderForgotPasswordPage();

    const emailInput = screen.getByLabelText(/البريد الإلكتروني/);
    fireEvent.change(emailInput, { target: { value: 'salem@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: /إرسال رابط إعادة التعيين/ }));

    expect(await screen.findByText('تم إرسال الرابط')).toBeInTheDocument();

    const resendBtn = screen.getByRole('button', { name: /إعادة الإرسال/ });
    fireEvent.click(resendBtn);

    // Should return to form
    expect(await screen.findByRole('heading', { name: 'استعادة كلمة المرور' })).toBeInTheDocument();
    expect(screen.getByLabelText(/البريد الإلكتروني/)).toBeInTheDocument();
  });

  it('renders general error banner when API call fails with server error', async () => {
    const axiosError = new axios.AxiosError('خطأ في الاتصال بالخادم', '500', undefined, undefined, {
      status: 500,
      data: { message: 'خطأ في الاتصال بالخادم' },
      headers: {},
      config: {} as never,
      statusText: 'Internal Server Error',
    } as never);

    vi.mocked(api.post).mockRejectedValueOnce(axiosError);

    renderForgotPasswordPage();

    const emailInput = screen.getByLabelText(/البريد الإلكتروني/);
    fireEvent.change(emailInput, { target: { value: 'salem@example.com' } });

    fireEvent.click(screen.getByRole('button', { name: /إرسال رابط إعادة التعيين/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('خطأ في الاتصال بالخادم');
    expect(screen.queryByText('تم إرسال الرابط')).not.toBeInTheDocument();
  });
});
