import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { OpportunitiesManagementPage } from '../OpportunitiesManagementPage';
import authReducer from '@/store/slices/authSlice';
import lookupReducer from '@/store/slices/lookupSlice';
import opportunityReducer from '@/store/slices/opportunitySlice';
import companyReducer from '@/store/slices/companySlice';
import { api } from '@/lib/api';
import i18n from '@/i18n';
import type { OpportunityItem } from '@/types/opportunity';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  primeCsrfCookie: vi.fn().mockResolvedValue({}),
}));

import type { AuthState } from '@/store/slices/authSlice';

const sampleOpportunities: OpportunityItem[] = [
  {
    id: 1,
    company_id: 10,
    opportunity_type_id: 1,
    created_by: 1,
    title: { ar: 'مطور برمجيات', en: 'Software Developer' },
    department: { ar: 'تقنية المعلومات', en: 'IT' },
    description: { ar: 'وصف التدريب', en: 'Training description' },
    work_mode: 'full_time',
    location: 'Riyadh',
    duration: '6 months',
    capacity: 3,
    status: 'draft',
    version: 1,
  },
  {
    id: 2,
    company_id: 10,
    opportunity_type_id: 1,
    created_by: 1,
    title: { ar: 'محلل بيانات', en: 'Data Analyst' },
    department: { ar: 'البيانات', en: 'Data' },
    description: { ar: 'وصف تحليل البيانات', en: 'Data analysis description' },
    work_mode: 'hybrid',
    location: 'Sana’a',
    duration: '3 months',
    capacity: 2,
    status: 'published',
    version: 2,
    application_deadline: '2026-08-01',
    application_open: false,
  },
  {
    id: 3,
    company_id: 10,
    opportunity_type_id: 1,
    created_by: 1,
    title: { ar: 'مهندس شبكات', en: 'Network Engineer' },
    description: { ar: 'وصف الشبكات', en: 'Network description' },
    work_mode: 'full_time',
    capacity: 1,
    status: 'closed',
    version: 3,
  },
];

const createTestStore = (initialAuthState: Partial<AuthState> = {}, opps = sampleOpportunities) => {
  const defaultAuthState: AuthState = {
    user: {
      id: 1,
      name: 'Ahmed Rep',
      email: 'rep@company.com',
      status: 'active',
      roles: [
        {
          id: 2,
          name: 'company_representative',
          label: { ar: 'ممثل شركة', en: 'Company Representative' },
        },
      ],
      permissions: [
        'opportunities.view_any',
        'opportunities.view',
        'opportunities.own.create',
        'opportunities.own.update',
        'opportunities.own.publish',
        'opportunities.own.close',
        'opportunities.own.archive',
      ],
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
    ...initialAuthState,
  };

  return configureStore({
    reducer: {
      auth: authReducer,
      lookup: lookupReducer,
      opportunity: opportunityReducer,
      company: companyReducer,
    },
    preloadedState: {
      auth: defaultAuthState,
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
        skills: [
          { id: 1, name: { ar: 'بايثون', en: 'Python' }, is_active: true },
          { id: 2, name: { ar: 'رياكت', en: 'React' }, is_active: true },
        ],
        opportunityTypes: [
          {
            id: 1,
            code: 'cooperative',
            name: { ar: 'تدريب تعاوني', en: 'Cooperative' },
            is_active: true,
          },
          { id: 2, code: 'summer', name: { ar: 'تدريب صيفي', en: 'Summer' }, is_active: true },
        ],
        trainingCycles: [
          {
            id: 1,
            name: { ar: 'خريف 2026', en: 'Fall 2026' },
            academic_year: '2026/2027',
            status: 'active' as const,
          },
        ],
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
        opportunities: opps,
        pagination: null,
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
            <OpportunitiesManagementPage />
          </MemoryRouter>
        </ToastProvider>
      </ThemeProvider>
    </Provider>
  );
};

describe('OpportunitiesManagementPage & Opportunity Management Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.changeLanguage('en');
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: sampleOpportunities,
        meta: { current_page: 1, total: sampleOpportunities.length },
      },
    });
  });

  it('renders the management page header and create button for company representative', async () => {
    renderComponent();

    expect(screen.getByText('Training Opportunities Management')).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /create new opportunity/i })[0]
    ).toBeInTheDocument();
  });

  it('opens the edit dialog and populates existing values', async () => {
    renderComponent();

    const editButtons = await screen.findAllByRole('button', { name: /edit/i });
    expect(editButtons.length).toBeGreaterThan(0);
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Training Opportunity')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Software Developer')).toBeInTheDocument();
      expect(screen.getByDisplayValue('مطور برمجيات')).toBeInTheDocument();
    });
  });

  it('submits updated opportunity and dispatches patch request with version', async () => {
    const mockPatch = vi.mocked(api.patch).mockResolvedValueOnce({
      data: {
        data: {
          id: 1,
          company_id: 10,
          opportunity_type_id: 1,
          created_by: 1,
          title: { ar: 'مطور برمجيات محدث', en: 'Software Developer Updated' },
          description: { ar: 'وصف التدريب', en: 'Training description' },
          capacity: 4,
          work_mode: 'full_time',
          status: 'draft',
          version: 2,
        },
        message: 'Opportunity updated successfully',
      },
    });

    renderComponent();

    const editButtons = await screen.findAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Training Opportunity')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/opportunity title \(english\)/i), {
      target: { value: 'Software Developer Updated' },
    });

    const saveChangesButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveChangesButton);

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith(
        '/opportunities/1',
        expect.objectContaining({
          title_en: 'Software Developer Updated',
          version: 1,
        })
      );
    });
  });

  it('displays conflict banner when 409 version_mismatch occurs during edit', async () => {
    vi.mocked(api.patch).mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          error_code: 'version_mismatch',
          message: 'This opportunity was modified by another user.',
        },
      },
    });

    renderComponent();

    const editButtons = await screen.findAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Training Opportunity')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/conflict detected/i)).toBeInTheDocument();
    });
  });

  it('opens confirmation modal and executes Publish transition for draft opportunity', async () => {
    const mockPost = vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        data: {
          ...sampleOpportunities[0],
          status: 'published',
          version: 2,
        },
        message: 'Opportunity published successfully',
      },
    });

    renderComponent();

    const publishButton = await screen.findByRole('button', { name: /publish/i });
    fireEvent.click(publishButton);

    await waitFor(() => {
      expect(screen.getByText('Publish Opportunity')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/opportunities/1/transition',
        expect.objectContaining({
          to_status: 'published',
          version: 1,
        })
      );
    });
  });

  it('opens confirmation modal and executes Close transition for published opportunity', async () => {
    const mockPost = vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        data: {
          ...sampleOpportunities[1],
          status: 'closed',
          version: 3,
        },
        message: 'Opportunity closed successfully',
      },
    });

    renderComponent();

    const closeButton = await screen.findByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.getByText('Close Opportunity')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/opportunities/2/transition',
        expect.objectContaining({
          to_status: 'closed',
          version: 2,
        })
      );
    });
  });

  it('opens confirmation modal and executes Archive transition for closed opportunity', async () => {
    const mockPost = vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        data: {
          ...sampleOpportunities[2],
          status: 'archived',
          version: 4,
        },
        message: 'Opportunity archived successfully',
      },
    });

    renderComponent();

    const archiveButton = await screen.findByRole('button', { name: /archive/i });
    fireEvent.click(archiveButton);

    await waitFor(() => {
      expect(screen.getByText('Archive Opportunity')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/opportunities/3/transition',
        expect.objectContaining({
          to_status: 'archived',
          version: 3,
        })
      );
    });
  });

  it('flags published opportunities past their application deadline as closed for applications', async () => {
    renderComponent();

    expect(await screen.findByText('Data Analyst')).toBeInTheDocument();

    // The expired published opportunity is flagged with badge + actionable hint
    expect(screen.getByText('Applications closed')).toBeInTheDocument();
    expect(screen.getByText(/The application deadline has passed/i)).toBeInTheDocument();
    expect(screen.getByText('2026-08-01')).toBeInTheDocument();

    // Draft and closed opportunities are NOT flagged as expired
    expect(screen.getAllByText('Applications closed').length).toBe(1);
  });
});
