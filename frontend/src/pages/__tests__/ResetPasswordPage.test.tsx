import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import axios from 'axios';
import { ThemeProvider } from '@/context/ThemeContext';
import { ResetPasswordPage } from '../ResetPasswordPage';
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

const renderResetPasswordPage = (
  initialEntries = ['/reset-password?token=valid-token-123&email=salem@example.com'],
  store = createTestStore()
) =>
  render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <ResetPasswordPage />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );

describe('ResetPasswordPage Component (TEP-581)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
    vi.clearAllMocks();
  });

  it('renders missing parameters state when token or email are missing from URL', () => {
    renderResetPasswordPage(['/reset-password']);

    expect(screen.getByText('معلومات الرابط غير مكتملة')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /طلب رابط جديد/ })).toBeInTheDocument();

    const requestBtn = screen.getByRole('button', { name: /طلب رابط جديد/ });
    fireEvent.click(requestBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/forgot-password');
  });

  it('renders the reset password form when token and email are provided', () => {
    renderResetPasswordPage();

    expect(screen.getByRole('heading', { name: 'إعادة تعيين كلمة المرور' })).toBeInTheDocument();
    expect(screen.getByLabelText(/البريد الإلكتروني/)).toHaveValue('salem@example.com');
    expect(screen.getByLabelText(/^كلمة المرور الجديدة/)).toBeInTheDocument();
    expect(screen.getByLabelText(/تأكيد كلمة المرور الجديدة/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /حفظ كلمة المرور الجديدة/ })).toBeInTheDocument();
  });

  it('toggles language when language button is clicked', async () => {
    renderResetPasswordPage();

    const langBtn = screen.getByText('English');
    fireEvent.click(langBtn);

    expect(await screen.findByRole('heading', { name: 'Set New Password' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/)).toHaveValue('salem@example.com');
    expect(screen.getByRole('button', { name: /Reset Password/ })).toBeInTheDocument();
  });

  it('toggles password visibility when eye icons are clicked', () => {
    renderResetPasswordPage();

    const passwordInput = screen.getByLabelText(/^كلمة المرور الجديدة/);
    const confirmInput = screen.getByLabelText(/تأكيد كلمة المرور الجديدة/);

    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(confirmInput).toHaveAttribute('type', 'password');

    const toggleButtons = screen.getAllByRole('button', { name: /Show password/ });
    fireEvent.click(toggleButtons[0]);
    expect(passwordInput).toHaveAttribute('type', 'text');

    fireEvent.click(toggleButtons[1]);
    expect(confirmInput).toHaveAttribute('type', 'text');
  });

  it('validates password minimum length and mismatch client-side', async () => {
    renderResetPasswordPage();

    const passwordInput = screen.getByLabelText(/^كلمة المرور الجديدة/);
    const confirmInput = screen.getByLabelText(/تأكيد كلمة المرور الجديدة/);
    const submitBtn = screen.getByRole('button', { name: /حفظ كلمة المرور الجديدة/ });

    // Short password
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.change(confirmInput, { target: { value: 'short' } });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText('يجب أن تتكون كلمة المرور من 8 أحرف على الأقل')
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();

    // Password mismatch
    fireEvent.change(passwordInput, { target: { value: 'NewPass123!' } });
    fireEvent.change(confirmInput, { target: { value: 'DifferentPass456!' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('كلمتا المرور غير متطابقتين')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('submits valid password reset and redirects to /login on success', async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        message: 'Your password has been reset.',
      },
    });

    renderResetPasswordPage();

    const passwordInput = screen.getByLabelText(/^كلمة المرور الجديدة/);
    const confirmInput = screen.getByLabelText(/تأكيد كلمة المرور الجديدة/);
    const submitBtn = screen.getByRole('button', { name: /حفظ كلمة المرور الجديدة/ });

    fireEvent.change(passwordInput, { target: { value: 'NewSecurePass123!' } });
    fireEvent.change(confirmInput, { target: { value: 'NewSecurePass123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(primeCsrfCookie).toHaveBeenCalled();
      expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'valid-token-123',
        email: 'salem@example.com',
        password: 'NewSecurePass123!',
        password_confirmation: 'NewSecurePass123!',
      });
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        state: {
          successMessage:
            'تمت إعادة تعيين كلمة المرور بنجاح! يرجى تسجيل الدخول باستخدام كلمة المرور الجديدة.',
        },
        replace: true,
      });
    });
  });

  it('displays invalid/expired token error state when API rejects with token error', async () => {
    const axiosError = new axios.AxiosError(
      'رمز إعادة تعيين كلمة المرور هذا غير صالح.',
      '422',
      undefined,
      undefined,
      {
        status: 422,
        data: {
          message: 'رمز إعادة تعيين كلمة المرور هذا غير صالح.',
          errors: { email: ['رمز إعادة تعيين كلمة المرور هذا غير صالح.'] },
        },
        headers: {},
        config: {} as never,
        statusText: 'Unprocessable Content',
      } as never
    );

    vi.mocked(api.post).mockRejectedValueOnce(axiosError);

    renderResetPasswordPage();

    const passwordInput = screen.getByLabelText(/^كلمة المرور الجديدة/);
    const confirmInput = screen.getByLabelText(/تأكيد كلمة المرور الجديدة/);
    const submitBtn = screen.getByRole('button', { name: /حفظ كلمة المرور الجديدة/ });

    fireEvent.change(passwordInput, { target: { value: 'NewSecurePass123!' } });
    fireEvent.change(confirmInput, { target: { value: 'NewSecurePass123!' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('رابط غير صالح أو منتهي الصلاحية')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /طلب رابط جديد/ })).toBeInTheDocument();
  });

  it('navigates to /login when clicking back to login link', () => {
    renderResetPasswordPage();

    const backBtn = screen.getByRole('button', { name: /العودة إلى تسجيل الدخول/ });
    fireEvent.click(backBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
