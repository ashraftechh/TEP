import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { LoginForm, type LoginFormProps } from '../LoginForm';
import i18n from '@/i18n';

const renderLoginForm = (props: LoginFormProps = {}) => {
  return render(
    <MemoryRouter>
      <LoginForm {...props} />
    </MemoryRouter>
  );
};

describe('LoginForm Component (TEP-562)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
    vi.clearAllMocks();
  });

  it('renders login form in Arabic with all required elements', async () => {
    renderLoginForm();

    // Header & Logo
    expect(screen.getByRole('heading', { name: 'تسجيل الدخول' })).toBeInTheDocument();
    expect(screen.getByText('أدخل بياناتك للوصول إلى حسابك')).toBeInTheDocument();
    expect(screen.getByText('منصة التدريب التعاوني')).toBeInTheDocument();

    // Inputs & Labels
    expect(screen.getByLabelText(/البريد الإلكتروني/)).toBeInTheDocument();
    expect(screen.getByLabelText(/كلمة المرور/)).toBeInTheDocument();

    // Links & Buttons
    expect(screen.getByRole('button', { name: /^تسجيل الدخول/ })).toBeInTheDocument();
    expect(screen.getByText('المتابعة باستخدام Google')).toBeInTheDocument();
    expect(screen.getByText('المتابعة باستخدام Microsoft')).toBeInTheDocument();
    expect(screen.getByText('نسيت كلمة المرور؟')).toBeInTheDocument();
    expect(screen.getByText('إنشاء حساب جديد')).toBeInTheDocument();
  });

  it('renders login form in English with correct translations', async () => {
    await i18n.changeLanguage('en');
    renderLoginForm();

    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByText('Enter your credentials to access your account')).toBeInTheDocument();
    expect(screen.getByText('Cooperative Training Platform')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Log in/ })).toBeInTheDocument();
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    expect(screen.getByText('Continue with Microsoft')).toBeInTheDocument();
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
    expect(screen.getByText('Create an account')).toBeInTheDocument();
  });

  it('SECURITY: does NOT render any role selection dropdown or role input', () => {
    renderLoginForm();

    // Prototype bug fix: role must NEVER be selected or sent by client
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/نوع الحساب|role|Account Type/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/طالب|مشرف أكاديمي|شركة/i)).not.toBeInTheDocument();
  });

  it('toggles password visibility when eye button is clicked', () => {
    renderLoginForm();

    const passwordInput = screen.getByLabelText(/كلمة المرور/);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByLabelText('Show password');
    fireEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');

    const hideButton = screen.getByLabelText('Hide password');
    fireEvent.click(hideButton);

    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('displays client-side validation errors when submitting empty form', async () => {
    renderLoginForm();

    const submitButton = screen.getByRole('button', { name: /^تسجيل الدخول/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('البريد الإلكتروني مطلوب')).toBeInTheDocument();
      expect(screen.getByText('كلمة المرور مطلوبة')).toBeInTheDocument();
    });
  });

  it('displays validation error for malformed email', async () => {
    renderLoginForm();

    const emailInput = screen.getByLabelText(/البريد الإلكتروني/);
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });

    const submitButton = screen.getByRole('button', { name: /^تسجيل الدخول/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('يرجى إدخال بريد إلكتروني صالح')).toBeInTheDocument();
    });
  });

  it('calls onSubmit with valid credentials', async () => {
    const handleSubmit = vi.fn();
    renderLoginForm({ onSubmit: handleSubmit });

    const emailInput = screen.getByLabelText(/البريد الإلكتروني/);
    const passwordInput = screen.getByLabelText(/كلمة المرور/);

    fireEvent.change(emailInput, { target: { value: 'student@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });

    const submitButton = screen.getByRole('button', { name: /^تسجيل الدخول/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledTimes(1);
      expect(handleSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'student@example.com',
          password: 'SecurePass123!',
        })
      );
    });
  });

  it('renders general error banner when errorMessage prop is provided', () => {
    renderLoginForm({ errorMessage: 'بيانات الاعتماد هذه غير متطابقة مع سجلاتنا.' });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('بيانات الاعتماد هذه غير متطابقة مع سجلاتنا.')).toBeInTheDocument();
  });

  it('translates "Login failed" error into Arabic when active language is Arabic', () => {
    renderLoginForm({ errorMessage: 'Login failed' });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('فشل تسجيل الدخول. يرجى التحقق من الاتصال بالخادم والمحاولة مرة أخرى.')
    ).toBeInTheDocument();
  });

  it('translates "Login failed" error into English when active language is English', async () => {
    await i18n.changeLanguage('en');
    renderLoginForm({ errorMessage: 'Login failed' });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('Login failed. Please check your server connection and try again.')
    ).toBeInTheDocument();
  });

  it('translates network error into localized Arabic message', () => {
    renderLoginForm({ errorMessage: 'Network Error', errorCode: 'network_error' });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText('تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.')
    ).toBeInTheDocument();
  });

  it('handles loading state properly', () => {
    renderLoginForm({ isLoading: true });

    const submitButton = screen.getByRole('button', { name: /جاري تسجيل الدخول/ });
    expect(submitButton).toBeDisabled();
    expect(screen.getByLabelText(/البريد الإلكتروني/)).toBeDisabled();
    expect(screen.getByLabelText(/كلمة المرور/)).toBeDisabled();
  });

  it('triggers navigation callbacks for forgot password and register links', () => {
    const handleSwitchToRegister = vi.fn();
    const handleForgotPassword = vi.fn();

    renderLoginForm({
      onSwitchToRegister: handleSwitchToRegister,
      onForgotPassword: handleForgotPassword,
    });

    fireEvent.click(screen.getByText('إنشاء حساب جديد'));
    expect(handleSwitchToRegister).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('نسيت كلمة المرور؟'));
    expect(handleForgotPassword).toHaveBeenCalledTimes(1);
  });
});
