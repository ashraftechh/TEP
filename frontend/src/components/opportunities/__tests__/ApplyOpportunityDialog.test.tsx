import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { ApplyOpportunityDialog } from '../ApplyOpportunityDialog';
import authReducer, { type AuthState } from '@/store/slices/authSlice';
import profileReducer, { type ProfileState } from '@/store/slices/profileSlice';
import lookupReducer from '@/store/slices/lookupSlice';
import opportunityReducer from '@/store/slices/opportunitySlice';
import applicationReducer from '@/store/slices/applicationSlice';
import type { OpportunityItem } from '@/types/opportunity';
import type { ApplicationItem } from '@/types/application';
import i18n from '@/i18n';

const sampleOpportunity: OpportunityItem = {
  id: 42,
  company_id: 10,
  opportunity_type_id: 1,
  created_by: 1,
  title: { ar: 'مطور واجهات متدرب', en: 'Frontend Intern' },
  department: { ar: 'تقنية المعلومات', en: 'IT' },
  description: { ar: 'تدريب متميز في رياكت', en: 'Great training in React' },
  location: 'صنعاء',
  duration: '3 أشهر',
  capacity: 2,
  salary: 3000,
  work_mode: 'hybrid',
  status: 'published',
  version: 1,
  application_deadline: '2026-10-01',
  company: {
    id: 10,
    name: { ar: 'شركة التقنية الحديثة', en: 'Modern Tech Co' },
  } as unknown as OpportunityItem['company'],
  majors: [],
  skills: [],
  requirements: [],
  benefits: [],
};

const createTestStore = (hasProfileCv = true) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      profile: profileReducer,
      lookup: lookupReducer,
      opportunity: opportunityReducer,
      application: applicationReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 5,
          name: 'طالب مجتهد',
          email: 'student@test.com',
          status: 'active',
          roles: [{ id: 1, name: 'student', label: { ar: 'طالب', en: 'Student' } }],
          student_profile: hasProfileCv
            ? {
                id: 12,
                student_number: 'STD-1001',
                cv_file_id: 99,
                cv_file: {
                  id: 99,
                  original_name: 'student_resume_2026.pdf',
                  url: 'http://localhost/storage/files/resume.pdf',
                },
              }
            : {
                id: 12,
                student_number: 'STD-1001',
                cv_file_id: null,
                cv_file: null,
              },
          permissions: ['opportunities.view'],
          created_at: '2026-08-01',
          updated_at: '2026-08-01',
        },
        status: 'idle',
        error: null,
        errorCode: null,
        registeredEmail: null,
        validationErrors: null,
        verificationStatus: 'idle',
        verificationError: null,
        verificationMessage: null,
        isLoginRequiredForVerification: false,
        resendStatus: 'idle',
        resendMessage: null,
        resendError: null,
        isInitializing: false,
      } as AuthState,
      profile: {
        profile: null,
        isLoading: false,
        isUpdating: false,
        updateSuccess: false,
        error: null,
        validationErrors: null,
        activeTab: 'general',
      } as unknown as ProfileState,
    },
  });
};

const renderDialog = (
  store = createTestStore(true),
  props: {
    isOpen?: boolean;
    onClose?: () => void;
    opportunity?: OpportunityItem | null;
    onSuccess?: (application: ApplicationItem) => void;
  } = {}
) => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    opportunity: sampleOpportunity,
    ...props,
  };

  return render(
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>
          <ApplyOpportunityDialog {...defaultProps} />
        </ToastProvider>
      </ThemeProvider>
    </Provider>
  );
};

describe('ApplyOpportunityDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.changeLanguage('ar');
  });

  it('renders dialog header, opportunity info and profile CV option by default', () => {
    renderDialog();

    expect(screen.getByText('التقديم على الفرصة التدريبية')).toBeInTheDocument();
    expect(screen.getByText('مطور واجهات متدرب')).toBeInTheDocument();
    expect(screen.getByText('شركة التقنية الحديثة')).toBeInTheDocument();
    expect(screen.getByText('صنعاء')).toBeInTheDocument();
    expect(screen.getByText('student_resume_2026.pdf')).toBeInTheDocument();
    expect(screen.getByText(/السيرة المعتمدة/)).toBeInTheDocument();
  });

  it('renders upload dropzone when student has no profile CV', () => {
    const store = createTestStore(false);
    renderDialog(store);

    expect(screen.getByText('انقر لاختيار ملف السيرة الذاتية')).toBeInTheDocument();
    expect(screen.getByText(/حفظ هذه السيرة الذاتية كافتراضية/)).toBeInTheDocument();
  });

  it('updates cover note counter and accepts typed input', () => {
    renderDialog();

    const textarea = screen.getByPlaceholderText(/اكتب نبذة موجزة توضح اهتمامك/);
    fireEvent.change(textarea, { target: { value: 'أرغب بالتدريب في مجال الواجهات' } });

    expect(textarea).toHaveValue('أرغب بالتدريب في مجال الواجهات');
    expect(screen.getByText(/30\s*\/\s*3000/)).toBeInTheDocument();
  });

  it('toggles saveAsProfileCv checkbox when student selects custom CV', () => {
    const store = createTestStore(false);
    renderDialog(store);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('renders in English when language is switched', () => {
    i18n.changeLanguage('en');
    renderDialog();

    expect(screen.getByText(/Apply for Training Opportunity/i)).toBeInTheDocument();
    expect(screen.getByText('Frontend Intern')).toBeInTheDocument();
    expect(screen.getByText('Modern Tech Co')).toBeInTheDocument();
    expect(screen.getByText('Submit Application')).toBeInTheDocument();
  });
});
