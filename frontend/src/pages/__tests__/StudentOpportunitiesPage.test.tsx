import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { StudentOpportunitiesPage } from '../StudentOpportunitiesPage';
import authReducer, { type AuthState } from '@/store/slices/authSlice';
import lookupReducer from '@/store/slices/lookupSlice';
import opportunityReducer from '@/store/slices/opportunitySlice';
import i18n from '@/i18n';

const mockedNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router');
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  };
});

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/opportunities')) {
        return Promise.resolve({ data: { data: mockOpportunities } });
      }
      return Promise.resolve({ data: { data: [] } });
    }),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  primeCsrfCookie: vi.fn().mockResolvedValue({}),
}));

const mockOpportunities = [
  {
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
    created_by: 1,
    title: { ar: 'مطور برمجيات', en: 'Software Developer' },
    department: { ar: 'تقنية المعلومات', en: 'IT' },
    description: {
      ar: 'فرصة تدريب في تطوير البرمجيات',
      en: 'Training opportunity in software development',
    },
    location: 'الظهران',
    duration: '6 أشهر',
    capacity: 3,
    salary: 5000,
    work_mode: 'full_time' as const,
    status: 'published' as const,
    version: 1,
    already_applied: false,
    requirements: [
      { id: 1, requirement_text: { ar: 'بايثون', en: 'Python' }, sort_order: 0 },
      { id: 2, requirement_text: { ar: 'رياكت', en: 'React' }, sort_order: 1 },
    ],
  },
  {
    id: 2,
    company_id: 20,
    company: {
      id: 20,
      name: { ar: 'شركة حلول التقنية', en: 'Solutions Tech' },
      registration_number: '67890',
      industry_id: 1,
      industry: null,
      description: 'شركة حلول',
      email: 'solutions@tech.com',
      phone: '0511111111',
      website: 'https://solutions.com',
      address: 'Sanaa',
      city: 'صنعاء',
      established_year: 2010,
      employees_count: '50-100',
      logo: null,
      logo_file_id: null,
      status: 'approved' as const,
      status_reason: null,
    },
    opportunity_type_id: 1,
    created_by: 2,
    title: { ar: 'مهندس بيانات', en: 'Data Engineer' },
    department: { ar: 'البيانات', en: 'Data' },
    description: {
      ar: 'فرصة تدريب في هندسة البيانات',
      en: 'Training opportunity in data engineering',
    },
    location: 'صنعاء',
    duration: '3 أشهر',
    capacity: 2,
    salary: 4000,
    work_mode: 'remote' as const,
    status: 'published' as const,
    version: 1,
    already_applied: true,
  },
  {
    id: 3,
    company_id: 30,
    company: {
      id: 30,
      name: { ar: 'شركة منتهية الصلاحية', en: 'Expired Co' },
      registration_number: '11122',
      industry_id: 1,
      industry: null,
      description: 'شركة',
      email: 'expired@co.com',
      phone: '0522222222',
      website: null,
      address: 'Aden',
      city: 'عدن',
      established_year: 2015,
      employees_count: '10-50',
      logo: null,
      logo_file_id: null,
      status: 'approved' as const,
      status_reason: null,
    },
    opportunity_type_id: 1,
    created_by: 3,
    title: { ar: 'فرصة منتهية', en: 'Expired Opportunity' },
    department: { ar: 'التقنية', en: 'Tech' },
    description: {
      ar: 'فرصة انتهى موعد التقديم عليها',
      en: 'An opportunity past its application deadline',
    },
    location: 'عدن',
    duration: '3 أشهر',
    capacity: 2,
    salary: null,
    work_mode: 'full_time' as const,
    status: 'published' as const,
    version: 1,
    already_applied: false,
    application_deadline: '2026-08-01',
    application_open: false,
  },
];

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      lookup: lookupReducer,
      opportunity: opportunityReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 10,
          name: 'Salem Student',
          email: 'student@university.edu',
          status: 'active',
          roles: [{ id: 1, name: 'student', label: { ar: 'طالب', en: 'Student' } }],
          permissions: ['opportunities.view_any'],
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
      lookup: {
        majors: [
          {
            id: 1,
            code: 'SE',
            name: { ar: 'هندسة البرمجيات', en: 'Software Engineering' },
            is_active: true,
          },
          {
            id: 2,
            code: 'CS',
            name: { ar: 'علوم الحاسب', en: 'Computer Science' },
            is_active: true,
          },
        ],
        industries: [],
        skills: [],
        opportunityTypes: [
          {
            id: 1,
            code: 'cooperative',
            name: { ar: 'تدريب تعاوني', en: 'Cooperative' },
            is_active: true,
          },
        ],
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
        opportunities: mockOpportunities,
        pagination: {
          current_page: 1,
          last_page: 2,
          per_page: 10,
          total: 12,
          from: 1,
          to: 10,
        },
        selectedOpportunity: null,
        isLoading: false,
        isCreating: false,
        createSuccess: false,
        error: null,
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

const renderComponent = (store = createTestStore()) => {
  return render(
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>
          <MemoryRouter>
            <StudentOpportunitiesPage />
          </MemoryRouter>
        </ToastProvider>
      </ThemeProvider>
    </Provider>
  );
};

describe('StudentOpportunitiesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.changeLanguage('ar');
  });

  it('renders available opportunities grid with company cards and filters', async () => {
    renderComponent();

    expect(screen.getByText('فرص التدريب المتاحة')).toBeInTheDocument();
    expect(await screen.findByText('أرامكو السعودية')).toBeInTheDocument();
    expect(screen.getByText('مطور برمجيات')).toBeInTheDocument();
    expect(screen.getByText('الظهران')).toBeInTheDocument();
    expect(screen.getByText('5000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^التقديم$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^تم التقديم$/i })).toBeDisabled();
  });

  it('opens apply dialog on clicking apply button', async () => {
    renderComponent();

    const applyButton = await screen.findByRole('button', { name: /^التقديم$/i });
    fireEvent.click(applyButton);

    expect(screen.getByText('التقديم على الفرصة التدريبية')).toBeInTheDocument();
  });

  it('navigates to opportunity details page on clicking details button', async () => {
    renderComponent();

    const detailsButtons = await screen.findAllByRole('button', { name: /التفاصيل/i });
    fireEvent.click(detailsButtons[0]);

    expect(mockedNavigate).toHaveBeenCalledWith('/opportunities/1');
  });

  it('disables the apply button for opportunities past their application deadline', async () => {
    renderComponent();

    expect(await screen.findByText('شركة منتهية الصلاحية')).toBeInTheDocument();

    const closedButton = await screen.findByRole('button', { name: /انتهى التقديم/i });
    expect(closedButton).toBeDisabled();

    // The open opportunity's apply button stays enabled.
    expect(screen.getByRole('button', { name: /^التقديم$/i })).toBeEnabled();
  });
});
