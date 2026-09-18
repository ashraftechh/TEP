import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router';
import { ToastProvider } from '@/context/ToastContext';
import { MyApplicationsPage } from '../MyApplicationsPage';
import applicationReducer, { type ApplicationState } from '@/store/slices/applicationSlice';
import lookupReducer from '@/store/slices/lookupSlice';
import type { ApplicationItem } from '@/types/application';
import i18n from '@/i18n';

const postMock = vi.fn();
let mockApplications: ApplicationItem[] = [];

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/my/applications')) {
        return Promise.resolve({
          data: {
            data: mockApplications,
            meta: {
              current_page: 1,
              last_page: 1,
              per_page: 15,
              total: mockApplications.length,
              from: mockApplications.length ? 1 : null,
              to: mockApplications.length,
            },
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    }),
    post: (...args: unknown[]) => postMock(...args),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  primeCsrfCookie: vi.fn().mockResolvedValue({}),
}));

const withdrawableApplication: ApplicationItem = {
  id: 42,
  opportunity_id: 7,
  student_profile_id: 3,
  cv_file_id: 1,
  cover_note: null,
  status: 'submitted',
  interview_at: null,
  decision_reason: null,
  withdrawn_reason: null,
  version: 1,
  created_at: '2026-08-20T10:00:00Z',
  submitted_at: '2026-08-20T10:00:00Z',
  updated_at: '2026-08-20T10:00:00Z',
  can_withdraw: true,
  opportunity: {
    id: 7,
    title: { ar: 'مطور برمجيات', en: 'Software Developer' },
    location: 'صنعاء',
    duration: '3 أشهر',
    is_remote: false,
    company: { id: 1, name: { ar: 'شركة تقنية', en: 'Tech Co' } },
  },
};

const createTestStore = (applications: ApplicationItem[] = [withdrawableApplication]) => {
  mockApplications = applications;
  return configureStore({
    reducer: {
      application: applicationReducer,
      lookup: lookupReducer,
    },
    preloadedState: {
      application: {
        isSubmitting: false,
        submitSuccess: false,
        isUploadingCv: false,
        uploadedCv: null,
        lastSubmittedApplication: null,
        error: null,
        errorCode: null,
        validationErrors: {},
        myApplications: [],
        myApplicationsPagination: null,
        isFetchingMyApplications: false,
        fetchMyApplicationsError: null,
        isWithdrawing: false,
        withdrawError: null,
        companyApplications: [],
        companyApplicationsPagination: null,
        isFetchingCompanyApplications: false,
        fetchCompanyApplicationsError: null,
        isAccepting: false,
        acceptError: null,
        acceptErrorCode: null,
        acceptCapacityInfo: null,
        isRejecting: false,
        rejectError: null,
        rejectErrorCode: null,
        isSchedulingInterview: false,
        scheduleInterviewError: null,
        scheduleInterviewErrorCode: null,
        isReviewing: false,
        reviewError: null,
        reviewErrorCode: null,
        applicationTransitions: [],
        applicationTransitionsAppId: null,
        isFetchingApplicationTransitions: false,
        fetchApplicationTransitionsError: null,
      } as ApplicationState,
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
    },
  });
};

const renderComponent = (store = createTestStore()) => {
  return render(
    <Provider store={store}>
      <ToastProvider>
        <MemoryRouter>
          <MyApplicationsPage />
        </MemoryRouter>
      </ToastProvider>
    </Provider>
  );
};

describe('MyApplicationsPage — Withdraw flow (TEP-641/642)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.changeLanguage('ar');
  });

  it('shows a Withdraw button only when can_withdraw is true', async () => {
    renderComponent();
    expect(await screen.findByRole('button', { name: /سحب الطلب/ })).toBeInTheDocument();
  });

  it('hides the Withdraw button when can_withdraw is false', async () => {
    renderComponent(
      createTestStore([{ ...withdrawableApplication, can_withdraw: false, status: 'accepted' }])
    );
    // Wait for the fetch to resolve and the card to render before asserting absence.
    expect(await screen.findByText('مطور برمجيات')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^سحب الطلب$/ })).not.toBeInTheDocument();
  });

  it('opens the confirmation dialog with a reapply note when Withdraw is clicked', async () => {
    renderComponent();

    fireEvent.click(await screen.findByRole('button', { name: /سحب الطلب/ }));

    expect(screen.getByText(/يمكنك التقديم مرة أخرى لاحقًا إذا غيّرت رأيك/)).toBeInTheDocument();
  });

  it('does not withdraw without explicit confirmation (Cancel closes without calling the API)', async () => {
    renderComponent();

    fireEvent.click(await screen.findByRole('button', { name: /سحب الطلب/ }));
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));

    expect(postMock).not.toHaveBeenCalled();
  });

  it('submits the withdraw request with the typed reason on confirm', async () => {
    postMock.mockResolvedValueOnce({
      data: {
        data: { ...withdrawableApplication, status: 'withdrawn', can_withdraw: false, version: 2 },
        message: 'تم سحب طلبك بنجاح.',
      },
    });

    renderComponent();

    fireEvent.click(await screen.findByRole('button', { name: /سحب الطلب/ }));

    const textarea = screen.getByPlaceholderText(/أخبر الشركة بسبب سحبك للطلب/);
    fireEvent.change(textarea, { target: { value: 'قبلت عرضاً آخر' } });

    // Two "سحب الطلب" matches exist once the dialog is open (card button + submit
    // button) — the submit button is the one inside the dialog footer.
    const confirmButtons = screen.getAllByRole('button', { name: /سحب الطلب/ });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/applications/42/withdraw', {
        reason: 'قبلت عرضاً آخر',
      });
    });
  });
});
