import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { ReportsPage } from '../ReportsPage';
import reportReducer from '@/store/slices/reportSlice';
import type { ReportItem } from '@/types/reports';

const getMock = vi.fn();
const postMock = vi.fn();
const patchMock = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
    delete: vi.fn(),
  },
  primeCsrfCookie: vi.fn().mockResolvedValue({}),
}));

const mockReport: ReportItem = {
  id: 1,
  training_assignment_id: 10,
  report_type_id: 1,
  report_type: {
    id: 1,
    code: 'weekly',
    name: { ar: 'أسبوعي', en: 'Weekly' },
    is_active: true,
  },
  report_number: 1,
  title: 'Weekly Report 1',
  content: 'Completed onboarding and setup environment.',
  status: 'draft',
  grade: null,
  feedback: null,
  version: 1,
  submitted_at: null,
  due_at: '2026-10-15T00:00:00.000000Z',
  created_at: '2026-10-01T10:00:00.000000Z',
  updated_at: '2026-10-01T10:00:00.000000Z',
};

const createTestStore = (initialReports: ReportItem[] = [mockReport]) => {
  return configureStore({
    reducer: {
      reports: reportReducer,
      auth: (
        state = {
          user: {
            id: 1,
            name: 'Ahmed Student',
            email: 'student@example.com',
            status: 'active',
            roles: [{ id: 1, name: 'student', label: { ar: 'طالب', en: 'Student' } }],
            permissions: ['reports.own.view', 'reports.own.create', 'reports.own.update'],
            created_at: '2026-08-01',
            updated_at: '2026-08-01',
          },
        }
      ) => state,
      lookup: (
        state = {
          reportTypes: [
            { id: 1, code: 'weekly', name: { ar: 'أسبوعي', en: 'Weekly' }, is_active: true },
            { id: 2, code: 'monthly', name: { ar: 'شهري', en: 'Monthly' }, is_active: true },
          ],
          isLoadingReportTypes: false,
        }
      ) => state,
      trainingAssignment: (
        state = {
          myAssignment: {
            id: 10,
            application_id: 1,
            student_profile_id: 1,
            opportunity_id: 1,
            company_id: 1,
            academic_supervisor_id: 2,
            status: 'active',
            start_date: '2026-09-01',
            end_date: '2026-12-01',
            required_reports_count: 10,
            created_at: '2026-09-01',
            updated_at: '2026-09-01',
          },
          isFetchingMyAssignment: false,
        }
      ) => state,
    },
    preloadedState: {
      reports: {
        reports: initialReports,
        pagination: null,
        summary: null,
        isLoadingReports: false,
        fetchError: null,
        isCreating: false,
        createError: null,
        createErrorCode: null,
        isUpdating: false,
        updateError: null,
        updateErrorCode: null,
        isSubmitting: false,
        submitError: null,
        submitErrorCode: null,
        isReviewing: false,
        reviewError: null,
        reviewErrorCode: null,
        isLoadingReviews: false,
        reviewsError: null,
        reportReviews: {},
        validationErrors: null,
      },
    },
  });
};

describe('ReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMock.mockResolvedValue({ data: { data: [mockReport] } });
  });

  const renderComponent = (store = createTestStore()) => {
    return render(
      <Provider store={store}>
        <ThemeProvider>
          <ToastProvider>
            <MemoryRouter>
              <ReportsPage />
            </MemoryRouter>
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    );
  };

  it('renders page header with title, subtitle, and create report button', () => {
    renderComponent();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    // The card renders the formatted title (e.g. "Weekly Report 1 - Week 1"), not the raw title
    expect(screen.getByRole('heading', { name: /Weekly Report 1/i })).toBeInTheDocument();
  });

  it('renders translated active badge for current training placement', () => {
    renderComponent();
    expect(screen.getByText(/^(نشط|Active)$/)).toBeInTheDocument();
  });

  it('opens create report dialog when clicking create button', async () => {
    renderComponent();
    const createBtn = screen.getByRole('button', { name: /إنشاء تقرير جديد|Create New Report/i });
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('opens view report dialog when clicking view button', async () => {
    renderComponent();
    const viewBtn = screen.getByRole('button', { name: /عرض التقرير|View Report/i });
    fireEvent.click(viewBtn);

    await waitFor(() => {
      expect(screen.getByText('Completed onboarding and setup environment.')).toBeInTheDocument();
    });
  });

  it('renders submit button for draft report and opens confirmation dialog', async () => {
    renderComponent();
    // Use exact name to avoid matching the "Submitted" status filter button
    const submitBtn = screen.getByRole('button', { name: /^Submit$/i });
    expect(submitBtn).toBeInTheDocument();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /نعم، إرسال التقرير|Yes, Submit Report/i })
      ).toBeInTheDocument();
    });
  });

  it('submits report when confirming in dialog', async () => {
    postMock.mockResolvedValueOnce({
      data: {
        data: {
          ...mockReport,
          status: 'submitted',
          submitted_at: '2026-10-02T10:00:00.000000Z',
        },
      },
    });

    renderComponent();
    // Use exact name to avoid matching the "Submitted" status filter button
    const submitBtn = screen.getByRole('button', { name: /^Submit$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole('button', {
      name: /نعم، إرسال التقرير|Yes, Submit Report/i,
    });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/reports/1/submit');
    });
  });

  it('displays supervisor feedback and resubmit button on revision_requested report', async () => {
    const revisionReport: ReportItem = {
      ...mockReport,
      id: 2,
      status: 'revision_requested',
      feedback: 'Please expand section 2 with more implementation details.',
      latest_review: {
        id: 1,
        decision: 'revision_requested',
        feedback: 'Please expand section 2 with more implementation details.',
        created_at: '2026-10-02T10:00:00.000000Z',
      },
    };

    renderComponent(createTestStore([revisionReport]));

    expect(
      screen.getByText('Please expand section 2 with more implementation details.')
    ).toBeInTheDocument();

    const resubmitBtn = screen.getByRole('button', { name: /إعادة إرسال|Resubmit/i });
    expect(resubmitBtn).toBeInTheDocument();
  });
});