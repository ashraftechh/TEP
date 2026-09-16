import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { OpportunitiesPage } from '../OpportunitiesPage';
import authReducer, { type AuthState } from '@/store/slices/authSlice';
import lookupReducer from '@/store/slices/lookupSlice';
import opportunityReducer from '@/store/slices/opportunitySlice';
import profileReducer from '@/store/slices/profileSlice';
import applicationReducer from '@/store/slices/applicationSlice';
import companyReducer from '@/store/slices/companySlice';
import i18n from '@/i18n';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ data: { data: [] } }),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  primeCsrfCookie: vi.fn().mockResolvedValue({}),
}));

const createTestStore = (role: 'student' | 'company_representative') => {
  return configureStore({
    reducer: {
      auth: authReducer,
      lookup: lookupReducer,
      opportunity: opportunityReducer,
      profile: profileReducer,
      application: applicationReducer,
      company: companyReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: 1,
          name: role === 'student' ? 'Salem Student' : 'Ahmed Rep',
          email: `${role}@platform.test`,
          status: 'active',
          roles: [
            {
              id: role === 'student' ? 1 : 2,
              name: role,
              label: { ar: role, en: role },
            },
          ],
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
        opportunities: [],
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

const renderComponent = (store: ReturnType<typeof createTestStore>) => {
  return render(
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>
          <MemoryRouter>
            <OpportunitiesPage />
          </MemoryRouter>
        </ToastProvider>
      </ThemeProvider>
    </Provider>
  );
};

describe('OpportunitiesPage Dispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.changeLanguage('ar');
  });

  it('renders student opportunities view when user has student role', () => {
    const store = createTestStore('student');
    renderComponent(store);

    expect(screen.getByText('فرص التدريب المتاحة')).toBeInTheDocument();
  });

  it('renders company management view when user has company_representative role', () => {
    const store = createTestStore('company_representative');
    renderComponent(store);

    expect(screen.getByText('إدارة الفرص التدريبية')).toBeInTheDocument();
  });
});
