import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { OpportunityDetailsPage } from '../OpportunityDetailsPage';
import authReducer, { type AuthState } from '@/store/slices/authSlice';
import lookupReducer from '@/store/slices/lookupSlice';
import opportunityReducer from '@/store/slices/opportunitySlice';
import type { OpportunityItem } from '@/types/opportunity';
import i18n from '@/i18n';

const mockedNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

const sampleOpportunity: OpportunityItem = {
  id: 1,
  company_id: 10,
  company: {
    id: 10,
    name: { ar: 'أرامكو السعودية', en: 'Saudi Aramco' },
    registration_number: '12345',
    industry_id: 1,
    industry: null,
    description: 'شركة رائدة',
    email: 'aramco@saudi.com',
    phone: '0500000000',
    website: 'https://aramco.com',
    address: 'Dhahran',
    city: 'الظهران',
    established_year: 1933,
    employees_count: '10000+',
    logo: null,
    logo_file_id: null,
    status: 'approved' as const,
    status_reason: null,
  },
  opportunity_type_id: 1,
  opportunity_type: {
    id: 1,
    code: 'cooperative',
    name: { ar: 'تدريب تعاوني', en: 'Cooperative' },
    is_active: true,
  },
  created_by: 1,
  title: { ar: 'مطور برمجيات متدرب', en: 'Software Developer Intern' },
  department: { ar: 'تقنية المعلومات', en: 'Information Technology' },
  description: {
    ar: 'فرصة تدريب مميزة في تطوير البرمجيات والأنظمة السحابية.',
    en: 'Exciting internship opportunity in software development.',
  },
  work_mode: 'full_time',
  location: 'الظهران',
  duration: '6 أشهر',
  capacity: 4,
  salary: 5000,
  start_date: '2026-09-01',
  end_date: '2027-02-28',
  application_deadline: '2026-08-20',
  status: 'published',
  version: 1,
  already_applied: false,
  majors: [
    {
      id: 1,
      code: 'CS',
      name: { ar: 'علوم الحاسب', en: 'Computer Science' },
      is_active: true,
    },
  ],
  skills: [
    {
      id: 1,
      name: { ar: 'رياكت', en: 'React' },
      is_active: true,
    },
  ],
  requirements: [
    {
      id: 1,
      requirement_text: { ar: 'إتقان لغة جافاسكريبت', en: 'JavaScript proficiency' },
      sort_order: 1,
    },
  ],
  benefits: [
    {
      id: 1,
      benefit_text: { ar: 'تأمين طبي شامل', en: 'Comprehensive health insurance' },
      sort_order: 1,
    },
  ],
};

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/opportunities/1')) {
        return Promise.resolve({ data: { data: sampleOpportunity } });
      }
      return Promise.reject(new Error('Not found'));
    }),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  primeCsrfCookie: vi.fn().mockResolvedValue({}),
}));

const createTestStore = (
  role: 'student' | 'company_representative' = 'student',
  opp: OpportunityItem | null = sampleOpportunity,
  isLoading = false,
  error: string | null = null
) => {
  const authState: AuthState = {
    user: {
      id: 1,
      name: 'Test User',
      email: 'test@platform.test',
      status: 'active',
      roles: [
        {
          id: role === 'student' ? 1 : 2,
          name: role,
          label: { ar: role, en: role },
        },
      ],
      permissions: ['opportunities.view', 'opportunities.view_any'],
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
  };

  return configureStore({
    reducer: {
      auth: authReducer,
      lookup: lookupReducer,
      opportunity: opportunityReducer,
    },
    preloadedState: {
      auth: authState,
      lookup: {
        majors: [],
        industries: [],
        skills: [],
        opportunityTypes: [],
        trainingCycles: [],
        reportTypes: [],
        isLoadingMajors: false,
        isLoadingIndustries: false,
        isLoadingSkills: false,
        isLoadingOpportunityTypes: false,
        isLoadingTrainingCycles: false,
        isLoadingReportTypes: false,
        majorsError: null,
        industriesError: null,
        skillsError: null,
        opportunityTypesError: null,
        trainingCyclesError: null,
        reportTypesError: null,
      },
      opportunity: {
        opportunities: opp ? [opp] : [],
        pagination: null,
        selectedOpportunity: opp,
        isLoading,
        isCreating: false,
        createSuccess: false,
        error,
        createError: null,
        createErrorCode: null,
        isUpdating: false,
        updateSuccess: false,
        updateError: null,
        updateErrorCode: null,
        isTransitioning: false,
        transitionError: null,
        transitionErrorCode: null,
        validationErrors: {},
      },
    },
  });
};

const renderComponent = (store = createTestStore(), initialEntry = '/opportunities/1') => {
  return render(
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route path="/opportunities/:id" element={<OpportunityDetailsPage />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </ThemeProvider>
    </Provider>
  );
};

describe('OpportunityDetailsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.changeLanguage('ar');
  });

  it('renders opportunity full details correctly', () => {
    renderComponent();

    expect(screen.getByText('مطور برمجيات متدرب')).toBeInTheDocument();
    expect(screen.getByText('أرامكو السعودية')).toBeInTheDocument();
    expect(screen.getByText('تقنية المعلومات')).toBeInTheDocument();
    expect(screen.getByText('الظهران')).toBeInTheDocument();
    expect(screen.getByText('6 أشهر')).toBeInTheDocument();
    expect(screen.getByText(/5000/)).toBeInTheDocument();
    expect(screen.getByText(/4/)).toBeInTheDocument();
    expect(screen.getByText('2026-08-20')).toBeInTheDocument();
    expect(
      screen.getByText('فرصة تدريب مميزة في تطوير البرمجيات والأنظمة السحابية.')
    ).toBeInTheDocument();
    expect(screen.getByText('إتقان لغة جافاسكريبت')).toBeInTheDocument();
    expect(screen.getByText('تأمين طبي شامل')).toBeInTheDocument();
    expect(screen.getByText('علوم الحاسب')).toBeInTheDocument();
    expect(screen.getByText('رياكت')).toBeInTheDocument();
  });

  it('renders apply button for students and opens apply dialog on click', () => {
    renderComponent(createTestStore('student', sampleOpportunity));

    const applyButtons = screen.getAllByRole('button', { name: /التقديم الآن/i });
    expect(applyButtons.length).toBeGreaterThan(0);
    fireEvent.click(applyButtons[0]);

    expect(screen.getByText('التقديم على الفرصة التدريبية')).toBeInTheDocument();
  });

  it('renders disabled already applied button if student has applied', () => {
    const appliedOpp: OpportunityItem = {
      ...sampleOpportunity,
      already_applied: true,
    };
    renderComponent(createTestStore('student', appliedOpp));

    const appliedButtons = screen.getAllByRole('button', { name: /تم التقديم/i });
    expect(appliedButtons.length).toBeGreaterThan(0);
    appliedButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('renders manage opportunities button for company representatives', () => {
    renderComponent(createTestStore('company_representative', sampleOpportunity));

    expect(screen.queryByRole('button', { name: /التقديم الآن/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /إدارة الفرص/i })).toBeInTheDocument();
  });

  it('renders not found error card when error exists', () => {
    renderComponent(createTestStore('student', null, false, 'Opportunity not found'));

    expect(screen.getByText('الفرصة غير متوفرة')).toBeInTheDocument();
  });
});
