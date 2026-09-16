import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@/context/ThemeContext';
import { CompanyJoinPage } from '../CompanyJoinPage';
import authReducer, { type AuthState } from '@/store/slices/authSlice';
import companyJoinReducer, { type CompanyJoinState } from '@/store/slices/companyJoinSlice';
import i18n from '@/i18n';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/store/slices/companyJoinSlice', async () => {
  const actual = await vi.importActual('@/store/slices/companyJoinSlice');
  return {
    ...actual,
    inspectCompanyJoinInvite: vi.fn(() => ({ type: 'companyJoin/inspect/skipped' })),
    companyJoinRegister: vi.fn(() => ({ type: 'companyJoin/register/skipped' })),
  };
});

import { companyJoinRegister } from '@/store/slices/companyJoinSlice';

const defaultAuthState: AuthState = {
  user: null,
  registeredEmail: null,
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

const defaultJoinState: CompanyJoinState = {
  inspectStatus: 'idle',
  joinDetails: null,
  inspectError: null,
  inspectErrorCode: null,
  submitStatus: 'idle',
  submitError: null,
  submitErrorCode: null,
  submitValidationErrors: null,
};

const createTestStore = (
  initialAuthState: Partial<AuthState> = {},
  initialJoinState: Partial<CompanyJoinState> = {}
) =>
  configureStore({
    reducer: {
      auth: authReducer,
      companyJoin: companyJoinReducer,
    },
    preloadedState: {
      auth: { ...defaultAuthState, ...initialAuthState },
      companyJoin: { ...defaultJoinState, ...initialJoinState },
    },
  });

const renderPage = (
  store = createTestStore(),
  { path = '/companies/join/42?email=test%40company.org&signature=sig&expires=9999999999' } = {}
) =>
  render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/companies/join/:company" element={<CompanyJoinPage />} />
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/verify-email" element={<div>Verify Email Page</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );

describe('CompanyJoinPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.changeLanguage('en');
  });

  describe('Loading state', () => {
    it('shows a loading spinner while the invite is being inspected', () => {
      const store = createTestStore({}, { inspectStatus: 'loading' });
      renderPage(store);
      expect(screen.getByText(/verifying your invitation/i)).toBeInTheDocument();
    });
  });

  describe('Invalid invite', () => {
    it('renders the invalid invite view when inspect fails', () => {
      const store = createTestStore(
        {},
        {
          inspectStatus: 'failed',
          inspectError: 'This invite is invalid or has already been used.',
        }
      );
      renderPage(store);

      expect(screen.getByText(/invalid invitation/i)).toBeInTheDocument();
      expect(screen.getByText(/invalid or has already been used/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /back to login/i })).toHaveAttribute(
        'href',
        '/login'
      );
    });
  });

  describe('Unified Representative Registration flow', () => {
    const joinDetails = {
      company_id: 42,
      company_name: 'Acme Corp',
      contact_email: 'contact@acme.com',
      email: 'rep@acme.com',
    };

    it('renders the unified registration form with editable pre-filled email and contact email badge', () => {
      const store = createTestStore({}, { inspectStatus: 'succeeded', joinDetails });
      renderPage(store);

      const emailInput = screen.getByDisplayValue('rep@acme.com');
      expect(emailInput).not.toBeDisabled();
      expect(screen.getByText(/contact@acme.com/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password \*/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it('shows validation errors when submitting empty required fields', async () => {
      const store = createTestStore({}, { inspectStatus: 'succeeded', joinDetails });
      renderPage(store);

      // Clear the pre-filled email
      fireEvent.change(screen.getByDisplayValue('rep@acme.com'), { target: { value: '' } });

      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/login email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/your name is required/i)).toBeInTheDocument();
      });
    });

    it('dispatches companyJoinRegister on valid submission', async () => {
      const store = createTestStore({}, { inspectStatus: 'succeeded', joinDetails });
      renderPage(store);

      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { value: 'New Representative' },
      });
      fireEvent.change(screen.getByLabelText(/^password \*/i), {
        target: { value: 'StrongPass123!' },
      });
      fireEvent.change(screen.getByLabelText(/confirm password/i), {
        target: { value: 'StrongPass123!' },
      });

      const submitButton = screen.getByRole('button', { name: /create account/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(companyJoinRegister).toHaveBeenCalledWith(
          expect.objectContaining({
            companyId: '42',
            formData: expect.objectContaining({
              name: 'New Representative',
              email: 'rep@acme.com',
              password: 'StrongPass123!',
              password_confirmation: 'StrongPass123!',
            }),
          })
        );
      });
    });

    it('displays server validation errors mapped to fields', async () => {
      const store = createTestStore(
        {},
        {
          inspectStatus: 'succeeded',
          joinDetails,
          submitStatus: 'failed',
          submitValidationErrors: {
            email: ['The email has already been taken.'],
            name: ['The name field is required.'],
          },
        }
      );
      renderPage(store);
      await waitFor(() => {
        expect(screen.getByText(/this email address is already registered/i)).toBeInTheDocument();
        expect(screen.getByText(/your name is required/i)).toBeInTheDocument();
      });
    });

    it('redirects to /verify-email after successful registration', async () => {
      const store = createTestStore(
        {},
        { inspectStatus: 'succeeded', joinDetails, submitStatus: 'succeeded' }
      );
      renderPage(store);

      expect(mockNavigate).toHaveBeenCalledWith('/verify-email', { replace: true });
    });
  });

  describe('RTL — Arabic locale', () => {
    it('renders correctly in Arabic with proper labels and titles', async () => {
      await i18n.changeLanguage('ar');

      const joinDetails = {
        company_id: 42,
        company_name: 'شركة الأمل',
        contact_email: 'contact@alamal.com',
        email: 'rep@alamal.com',
      };

      const store = createTestStore({}, { inspectStatus: 'succeeded', joinDetails });
      renderPage(store);

      expect(screen.getByText(/إنشاء حسابك/i)).toBeInTheDocument();
      expect(screen.getByText(/الاسم الكامل/i)).toBeInTheDocument();
      expect(screen.getByText(/البريد الإلكتروني للشركة:/i)).toBeInTheDocument();
    });
  });
});
