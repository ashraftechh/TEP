import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ToastProvider } from '@/context/ToastContext';
import StudentReportsView from '../StudentReportsView';
import reportReducer, { type ReportState } from '@/store/slices/reportSlice';
import lookupReducer from '@/store/slices/lookupSlice';
import type { ReportItem } from '@/types/reports';
import i18n from '@/i18n';

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

const reportTypesFixture = [
  { id: 1, code: 'weekly', name: { en: 'Weekly', ar: 'أسبوعي' }, is_active: true },
  { id: 2, code: 'monthly', name: { en: 'Monthly', ar: 'شهري' }, is_active: true },
  { id: 3, code: 'final', name: { en: 'Final', ar: 'نهائي' }, is_active: true },
];

const draftReport: ReportItem = {
  id: 100,
  training_assignment_id: 5,
  title: 'Week 1 Report',
  report_type_id: 1,
  report_type: reportTypesFixture[0],
  report_number: 1,
  content: 'Original content.',
  status: 'draft',
  grade: null,
  version: 0,
  submitted_at: null,
  due_at: null,
  created_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-09-01T10:00:00Z',
};

const submittedReport: ReportItem = {
  ...draftReport,
  id: 101,
  title: 'Week 2 Report',
  report_number: 2,
  status: 'submitted',
  submitted_at: '2026-09-08T10:00:00Z',
};

const createTestStore = (reports: ReportItem[] = []) => {
  return configureStore({
    reducer: {
      reports: reportReducer,
      lookup: lookupReducer,
    },
    preloadedState: {
      reports: {
        reports,
        isCreating: false,
        createError: null,
        createErrorCode: null,
        isUpdating: false,
        updateError: null,
        updateErrorCode: null,
        isSubmitting: false,
        submitError: null,
        submitErrorCode: null,
      } as ReportState,
      lookup: {
        majors: [],
        industries: [],
        skills: [],
        opportunityTypes: [],
        trainingCycles: [],
        reportTypes: reportTypesFixture,
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
        <StudentReportsView assignmentId={5} />
      </ToastProvider>
    </Provider>
  );
};

describe('StudentReportsView (TEP-675/676)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMock.mockResolvedValue({ data: { data: reportTypesFixture } });
    i18n.changeLanguage('en');
  });

  it('shows an empty state when there are no reports yet', () => {
    renderComponent();
    expect(screen.getByText('No reports yet')).toBeInTheDocument();
  });

  it('opens the create dialog and shows validation errors on an empty submit', async () => {
    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /New Report/i }));

    fireEvent.click(screen.getByRole('button', { name: /Save Draft/i }));

    expect(await screen.findByText('Title is required.')).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('submits a well-formed report draft and calls POST /reports', async () => {
    postMock.mockResolvedValueOnce({
      data: { data: { ...draftReport, id: 200 }, message: 'Report draft created successfully.' },
    });

    renderComponent();

    fireEvent.click(screen.getByRole('button', { name: /New Report/i }));

    fireEvent.change(screen.getByLabelText(/Title/i), {
      target: { value: 'Week 1 Report' },
    });
    fireEvent.change(screen.getByLabelText(/^Number/i), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText(/Content/i), {
      target: { value: 'This week I onboarded onto the team.' },
    });

    // Select a report type via the native trigger
    fireEvent.click(screen.getByText('Select a report type'));
    fireEvent.click(await screen.findByText('Weekly'));

    fireEvent.click(screen.getByRole('button', { name: /Save Draft/i }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/reports', {
        report_type_id: 1,
        title: 'Week 1 Report',
        report_number: 1,
        content: 'This week I onboarded onto the team.',
        due_at: null,
      });
    });
  });

  it('does not show an Edit action for a report that is no longer a draft', () => {
    renderComponent(createTestStore([submittedReport]));

    expect(screen.getByText('Week 2 Report')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Edit$/i })).not.toBeInTheDocument();
  });

  it('lets a student edit their own draft report via PATCH /reports/{id}', async () => {
    patchMock.mockResolvedValueOnce({
      data: {
        data: { ...draftReport, title: 'Week 1 Report (updated)', version: 1 },
        message: 'Report updated successfully.',
      },
    });

    renderComponent(createTestStore([draftReport]));

    fireEvent.click(screen.getByRole('button', { name: /^Edit$/i }));

    const titleInput = await screen.findByLabelText(/Title/i);
    fireEvent.change(titleInput, { target: { value: 'Week 1 Report (updated)' } });

    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith(
        '/reports/100',
        expect.objectContaining({ title: 'Week 1 Report (updated)' })
      );
    });
  });
});
