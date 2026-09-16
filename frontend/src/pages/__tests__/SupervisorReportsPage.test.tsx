import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { ReportsPage } from '../ReportsPage';
import { SupervisorReportsPage } from '../SupervisorReportsPage';
import reportReducer from '@/store/slices/reportSlice';
import type { ReportItem } from '@/types/reports';

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  primeCsrfCookie: vi.fn().mockResolvedValue({}),
}));

const mockSupervisorReports: ReportItem[] = [
  {
    id: 101,
    training_assignment_id: 1,
    report_type_id: 1,
    report_type: {
      id: 1,
      code: 'weekly',
      name: { ar: 'أسبوعي', en: 'Weekly' },
      is_active: true,
    },
    report_number: 1,
    title: 'Weekly Report 1 - Backend Setup',
    content: 'Completed backend database migrations and seeders.',
    status: 'submitted',
    grade: null,
    feedback: null,
    version: 1,
    submitted_at: '2026-10-01T10:00:00.000000Z',
    due_at: '2026-10-07T00:00:00.000000Z',
    created_at: '2026-10-01T10:00:00.000000Z',
    updated_at: '2026-10-01T10:00:00.000000Z',
    student: {
      id: 1,
      name: 'Ali Student',
      student_number: 'STU123456',
      email: 'ali@example.com',
    },
    files: [
      {
        id: 1,
        original_name: 'week1_notes.pdf',
        url: 'https://example.com/week1_notes.pdf',
        mime_type: 'application/pdf',
        size_bytes: 1024 * 50,
      },
    ],
  },
  {
    id: 102,
    training_assignment_id: 1,
    report_type_id: 1,
    report_type: {
      id: 1,
      code: 'weekly',
      name: { ar: 'أسبوعي', en: 'Weekly' },
      is_active: true,
    },
    report_number: 2,
    title: 'Weekly Report 2 - Authentication',
    content: 'Implemented sanctum authentication and permissions.',
    status: 'approved',
    grade: 92,
    feedback: 'Well done! Clean code and good test coverage.',
    version: 2,
    submitted_at: '2026-10-08T10:00:00.000000Z',
    due_at: '2026-10-14T00:00:00.000000Z',
    created_at: '2026-10-08T10:00:00.000000Z',
    updated_at: '2026-10-09T10:00:00.000000Z',
    student: {
      id: 1,
      name: 'Ali Student',
      student_number: 'STU123456',
      email: 'ali@example.com',
    },
  },
];

const createSupervisorStore = (initialReports: ReportItem[] = mockSupervisorReports) => {
  return configureStore({
    reducer: {
      reports: reportReducer,
      auth: (
        state = {
          user: {
            id: 10,
            name: 'Dr. Supervisor',
            email: 'supervisor@example.com',
            status: 'active',
            roles: [
              {
                id: 3,
                name: 'academic_supervisor',
                label: { ar: 'مشرف أكاديمي', en: 'Academic Supervisor' },
              },
            ],
            permissions: ['reports.review'],
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
            { id: 3, code: 'final', name: { ar: 'نهائي', en: 'Final' }, is_active: true },
          ],
          isLoading: false,
        }
      ) => state,
    },
    preloadedState: {
      reports: {
        reports: initialReports,
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

describe('SupervisorReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMock.mockImplementation((url: string) => {
      if (url === '/reports') {
        return Promise.resolve({ data: { data: mockSupervisorReports } });
      }
      if (url.includes('/reviews')) {
        return Promise.resolve({ data: { data: [] } });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  const renderComponent = (store = createSupervisorStore()) => {
    return render(
      <Provider store={store}>
        <ThemeProvider>
          <ToastProvider>
            <MemoryRouter>
              <SupervisorReportsPage />
            </MemoryRouter>
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    );
  };

  it('renders supervisor dashboard with metrics and reports list', () => {
    renderComponent();

    // Check header and cards
    expect(screen.getByText('Weekly Report 1 - Backend Setup')).toBeInTheDocument();
    expect(screen.getByText('Weekly Report 2 - Authentication')).toBeInTheDocument();
    expect(screen.getAllByText('Ali Student', { selector: 'span' })[0]).toBeInTheDocument();
    expect(screen.getAllByText('STU123456')[0]).toBeInTheDocument();
  });

  it('dispatches to SupervisorReportsPage via ReportsPage dispatcher when user is academic_supervisor', () => {
    const store = createSupervisorStore();
    render(
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

    // Should render supervisor page instead of student page (no "Create New Report" button)
    expect(
      screen.queryByRole('button', { name: /إنشاء تقرير جديد|Create New Report/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText('Weekly Report 1 - Backend Setup')).toBeInTheDocument();
  });

  it('opens review dialog when clicking View & Review on submitted report', async () => {
    renderComponent();

    const reviewBtn = screen.getByRole('button', { name: /عرض ومراجعة|View & Review/i });
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(
        within(dialog).getByText('Completed backend database migrations and seeders.')
      ).toBeInTheDocument();
    });
  });

  it('validates grade and feedback when approving report', async () => {
    renderComponent();

    const reviewBtn = screen.getByRole('button', { name: /عرض ومراجعة|View & Review/i });
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Select Approve decision
    const approveBtn = screen.getByRole('button', { name: /اعتماد|Approve/i });
    fireEvent.click(approveBtn);

    // Attempt to submit without grade or feedback
    const submitDecisionBtn = screen.getByRole('button', {
      name: /تأكيد القرار|Confirm Decision/i,
    });
    fireEvent.click(submitDecisionBtn);

    await waitFor(() => {
      expect(screen.getByText(/A grade is required|الدرجة مطلوبة/i)).toBeInTheDocument();
      expect(screen.getByText(/Feedback is required|الملاحظات مطلوبة/i)).toBeInTheDocument();
    });
  });

  it('successfully submits approval with grade and feedback', async () => {
    postMock.mockResolvedValueOnce({
      data: {
        data: {
          ...mockSupervisorReports[0],
          status: 'approved',
          grade: 95,
          feedback: 'Excellent work!',
        },
        message: 'Report evaluated successfully.',
      },
    });

    renderComponent();

    const reviewBtn = screen.getByRole('button', { name: /عرض ومراجعة|View & Review/i });
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Select Approve
    const approveBtn = screen.getByRole('button', { name: /اعتماد|Approve/i });
    fireEvent.click(approveBtn);

    // Fill grade and feedback
    const gradeInput = screen.getByLabelText(/Grade|الدرجة/i);
    fireEvent.change(gradeInput, { target: { value: '95' } });

    const feedbackInput = screen.getByLabelText(/Feedback|الملاحظات/i);
    fireEvent.change(feedbackInput, { target: { value: 'Excellent work on the migrations!' } });

    // Submit decision
    const submitDecisionBtn = screen.getByRole('button', {
      name: /تأكيد القرار|Confirm Decision/i,
    });
    fireEvent.click(submitDecisionBtn);

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/reports/101/review', {
        decision: 'approved',
        grade: 95,
        feedback: 'Excellent work on the migrations!',
      });
    });
  });

  it('filters reports list by search query', async () => {
    renderComponent();

    const searchInput = screen.getByPlaceholderText(/Search by report title|البحث بعنوان التقرير/i);
    fireEvent.change(searchInput, { target: { value: 'Authentication' } });

    expect(
      screen.getByRole('heading', { name: /Weekly Report 2 - Authentication/i })
    ).toBeInTheDocument();
    expect(screen.queryByText('Weekly Report 1 - Backend Setup')).not.toBeInTheDocument();
  });

  it('validates decision-aware feedback message when rejecting without feedback', async () => {
    renderComponent();

    const reviewBtn = screen.getByRole('button', { name: /عرض ومراجعة|View & Review/i });
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Select Reject
    const rejectBtn = screen.getByRole('button', { name: /رفض|Reject/i });
    fireEvent.click(rejectBtn);

    // Click submit with empty feedback
    const submitDecisionBtn = screen.getByRole('button', {
      name: /تأكيد القرار|Confirm Decision/i,
    });
    fireEvent.click(submitDecisionBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/A reason is required to reject a report|يجب إبداء سبب لرفض التقرير/i)
      ).toBeInTheDocument();
    });
  });

  it('validates decision-aware feedback message when requesting revision without feedback', async () => {
    renderComponent();

    const reviewBtn = screen.getByRole('button', { name: /عرض ومراجعة|View & Review/i });
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Select Revision Requested
    const revisionBtn = screen.getByRole('button', { name: /طلب تعديل|Request Revision/i });
    fireEvent.click(revisionBtn);

    // Click submit with empty feedback
    const submitDecisionBtn = screen.getByRole('button', {
      name: /تأكيد القرار|Confirm Decision/i,
    });
    fireEvent.click(submitDecisionBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          /A reason is required to request revision on a report|يجب إبداء سبب لطلب تعديل التقرير/i
        )
      ).toBeInTheDocument();
    });
  });
});
