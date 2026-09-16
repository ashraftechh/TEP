import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router';
import { RegisterForm, type OptionItem } from '../RegisterForm';
import authReducer, { type AuthState } from '@/store/slices/authSlice';
import lookupReducer from '@/store/slices/lookupSlice';
import i18n from '@/i18n';

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

const renderWithStore = (ui: React.ReactElement, store = createTestStore()) => {
  return {
    ...render(
      <Provider store={store}>
        <MemoryRouter>{ui}</MemoryRouter>
      </Provider>
    ),
    store,
  };
};

describe('RegisterForm Component', () => {
  const mockMajors: OptionItem[] = [
    { id: 1, name: { en: 'Computer Science', ar: 'علوم الحاسب' } },
    { id: 2, name: { en: 'Information Technology', ar: 'تقنية المعلومات' } },
  ];

  it('renders student registration form by default in Arabic', async () => {
    await i18n.changeLanguage('ar');
    renderWithStore(<RegisterForm majors={mockMajors} />);

    expect(screen.getByText('إنشاء حساب جديد')).toBeInTheDocument();
    expect(screen.getByText('المتابعة باستخدام Google')).toBeInTheDocument();
    expect(screen.getByText('المتابعة باستخدام Microsoft')).toBeInTheDocument();
    expect(screen.getByLabelText(/الاسم الكامل/)).toBeInTheDocument();
    expect(screen.getByLabelText(/البريد الإلكتروني/)).toBeInTheDocument();
    expect(screen.getByLabelText(/رقم الهاتف/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^كلمة المرور/)).toBeInTheDocument();
    expect(screen.getByLabelText(/تأكيد كلمة المرور/)).toBeInTheDocument();
    expect(screen.getByLabelText(/التخصص/)).toBeInTheDocument();
  });

  it('renders student fields and links to company registration request', async () => {
    await i18n.changeLanguage('en');
    renderWithStore(<RegisterForm majors={mockMajors} />);

    expect(screen.getByText('Create New Account')).toBeInTheDocument();
    expect(screen.getByLabelText(/Major/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Company Name/i)).not.toBeInTheDocument();

    // Verify company registration request link is present
    const companyRequestLink = screen.getByRole('link', { name: /submit a request/i });
    expect(companyRequestLink).toBeInTheDocument();
    expect(companyRequestLink).toHaveAttribute('href', '/register-company');
  });

  it('shows validation errors when submitting an empty form', async () => {
    await i18n.changeLanguage('en');
    renderWithStore(<RegisterForm majors={mockMajors} />);

    const submitButton = screen.getByRole('button', { name: 'Create Account' });
    fireEvent.click(submitButton);

    expect(await screen.findByText('Full name is required')).toBeInTheDocument();
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(await screen.findByText('Password is required')).toBeInTheDocument();
    expect(await screen.findByText('Please confirm your password')).toBeInTheDocument();
    expect(await screen.findByText('Please select your academic major')).toBeInTheDocument();
  });

  it('calls onRegister callback when form is validly submitted', async () => {
    await i18n.changeLanguage('en');
    const onRegisterMock = vi.fn().mockResolvedValue(undefined);
    renderWithStore(<RegisterForm majors={mockMajors} onRegister={onRegisterMock} />);

    // Fill form
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'Ahmed Ali' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'ahmed@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: 'Secret123!' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'Secret123!' },
    });

    // Select major dropdown
    const majorTrigger = screen.getByLabelText(/Major/i);
    fireEvent.click(majorTrigger);
    const csOption = screen.getByText('Computer Science');
    fireEvent.click(csOption);

    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onRegisterMock).toHaveBeenCalledWith(
        expect.objectContaining({
          account_type: 'student',
          name: 'Ahmed Ali',
          email: 'ahmed@example.com',
          password: 'Secret123!',
          password_confirmation: 'Secret123!',
          major_id: '1',
        })
      );
    });
  });

  it('displays server error banner if registration throws an error', async () => {
    await i18n.changeLanguage('en');
    const onRegisterMock = vi.fn().mockRejectedValue(new Error('Server communication error'));
    renderWithStore(<RegisterForm majors={mockMajors} onRegister={onRegisterMock} />);

    // Fill minimum required fields
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'Ahmed Ali' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'ahmed@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: 'Secret123!' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'Secret123!' },
    });

    const majorTrigger = screen.getByLabelText(/Major/i);
    fireEvent.click(majorTrigger);
    const csOption = screen.getByText('Computer Science');
    fireEvent.click(csOption);

    const submitButton = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitButton);

    expect(await screen.findByText('Server communication error')).toBeInTheDocument();
  });

  it('translates raw SMTP and connection errors into localized message', async () => {
    await i18n.changeLanguage('ar');
    const smtpErrorMsg =
      'Connection could not be established with host "smtp.gmail.com:587": stream_socket_client(): Unable to connect to smtp.gmail.com:587 (No connection could be made because the target machine actively refused it)';
    const onRegisterMock = vi.fn().mockRejectedValue(new Error(smtpErrorMsg));
    renderWithStore(<RegisterForm majors={mockMajors} onRegister={onRegisterMock} />);

    fireEvent.change(screen.getByLabelText(/الاسم الكامل/i), {
      target: { value: 'أحمد علي' },
    });
    fireEvent.change(screen.getByLabelText(/البريد الإلكتروني/i), {
      target: { value: 'ahmed@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^كلمة المرور/i), {
      target: { value: 'Secret123!' },
    });
    fireEvent.change(screen.getByLabelText(/تأكيد كلمة المرور/i), {
      target: { value: 'Secret123!' },
    });

    const majorTrigger = screen.getByLabelText(/التخصص/i);
    fireEvent.click(majorTrigger);
    const csOption = screen.getByText('علوم الحاسب');
    fireEvent.click(csOption);

    const submitButton = screen.getByRole('button', { name: 'إنشاء الحساب' });
    fireEvent.click(submitButton);

    // Should display localized Arabic error title and message
    expect(await screen.findByText('فشل إنشاء الحساب')).toBeInTheDocument();
    expect(
      await screen.findByText(
        'تعذر إرسال بريد التحقق. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.'
      )
    ).toBeInTheDocument();

    // When switching language to English, error banner title and message should update to English
    await i18n.changeLanguage('en');
    expect(await screen.findByText('Registration Failed')).toBeInTheDocument();
    expect(
      await screen.findByText(
        'Unable to send verification email. Please check your connection and try again.'
      )
    ).toBeInTheDocument();
  });

  it('updates error messages when switching language after validation', async () => {
    await i18n.changeLanguage('ar');
    renderWithStore(<RegisterForm majors={mockMajors} />);

    // Submit empty form in Arabic
    const submitButton = screen.getByRole('button', { name: 'إنشاء الحساب' });
    fireEvent.click(submitButton);

    expect(await screen.findByText('الاسم الكامل مطلوب')).toBeInTheDocument();
    expect(await screen.findByText('البريد الإلكتروني مطلوب')).toBeInTheDocument();

    // Switch language to English
    await i18n.changeLanguage('en');

    // Error messages should now be updated to English
    expect(await screen.findByText('Full name is required')).toBeInTheDocument();
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
  });

  it('validates Yemen phone number and disposable email on the client side', async () => {
    await i18n.changeLanguage('en');
    renderWithStore(<RegisterForm majors={mockMajors} />);

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'Ab' }, // Less than 3 characters
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'test@mailinator.com' }, // Disposable email
    });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), {
      target: { value: '+123456789' }, // Invalid Yemen number
    });

    const submitButton = screen.getByRole('button', { name: 'Create Account' });
    fireEvent.click(submitButton);

    expect(await screen.findByText('Full name must be at least 3 characters')).toBeInTheDocument();
    expect(
      await screen.findByText('Disposable email addresses are not allowed')
    ).toBeInTheDocument();
    expect(await screen.findByText('Please enter a valid phone number')).toBeInTheDocument();
  });
});
