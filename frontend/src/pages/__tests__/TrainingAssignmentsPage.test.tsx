import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router';
import { TrainingAssignmentsPage } from '../TrainingAssignmentsPage';
import trainingAssignmentReducer from '@/store/slices/trainingAssignmentSlice';
import attendanceReducer from '@/store/slices/attendanceSlice';
import type { TrainingAssignmentItem } from '@/types/trainingAssignment';
import type { User } from '@/store/slices/authSlice';
import i18n from '@/i18n';

let mockListResponse: { data: TrainingAssignmentItem[]; meta: Record<string, unknown> } = {
  data: [],
  meta: { current_page: 1, last_page: 1, per_page: 15, total: 0, from: null, to: null },
};
let mockMyAssignmentResponse: TrainingAssignmentItem | null = null;
let mockMyAssignmentShouldReject = false;

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/my/training-assignment')) {
        if (mockMyAssignmentShouldReject) {
          return Promise.reject({
            isAxiosError: true,
            response: {
              status: 404,
              data: { message: 'No active placement', error_code: 'no_active_assignment' },
            },
          });
        }
        return Promise.resolve({ data: { data: mockMyAssignmentResponse } });
      }
      if (typeof url === 'string' && url.includes('/training-assignments')) {
        return Promise.resolve({
          data: { data: mockListResponse.data, meta: mockListResponse.meta },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    }),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  primeCsrfCookie: vi.fn().mockResolvedValue({}),
}));

function makeAssignment(overrides: Partial<TrainingAssignmentItem> = {}): TrainingAssignmentItem {
  return {
    id: 1,
    application_id: 1,
    student_profile_id: 1,
    company_id: 1,
    opportunity_id: 1,
    academic_supervisor_id: 2,
    field_supervisor_id: null,
    training_coordinator_id: null,
    status: 'active',
    start_date: '2026-01-01',
    end_date: '2026-05-01',
    progress_percentage: 50,
    required_reports_count: 4,
    total_reports: 4,
    reports_submitted_count: 2,
    latest_attendance_status: null,
    suspension_reason: null,
    termination_reason: null,
    version: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    company: { id: 1, name: { en: 'Tech Co', ar: 'شركة تقنية' } },
    opportunity: { id: 1, title: { en: 'Backend Trainee', ar: 'متدرب خلفية' } },
    student_profile: {
      id: 1,
      student_number: 'STU001',
      gpa: '3.8',
      major: { id: 1, name: { en: 'Computer Science', ar: 'علوم الحاسب' } },
      user: { id: 3, name: 'Ahmed Ali', email: 'ahmed@example.com' },
    },
    academic_supervisor: { id: 2, name: 'Dr. Saeed', email: 'saeed@example.com' },
    field_supervisor: null,
    training_coordinator: null,
    ...overrides,
  };
}

function makeUser(role: string): User {
  return {
    id: 99,
    name: 'Test User',
    email: 'user@example.com',
    status: 'active',
    roles: [{ id: 1, name: role }],
    permissions: ['training_assignments.own.view'],
  };
}

const createTestStore = (role: string) =>
  configureStore({
    reducer: {
      trainingAssignment: trainingAssignmentReducer,
      attendance: attendanceReducer,
      auth: (state = { user: makeUser(role) }) => state,
    },
  });

const renderPage = (role: string) =>
  render(
    <Provider store={createTestStore(role)}>
      <MemoryRouter>
        <TrainingAssignmentsPage />
      </MemoryRouter>
    </Provider>
  );

describe('TrainingAssignmentsPage — role-based view rendering (TEP-666/667)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.changeLanguage('en');
    mockListResponse = {
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 15, total: 0, from: null, to: null },
    };
    mockMyAssignmentResponse = null;
    mockMyAssignmentShouldReject = false;
  });

  it('renders the company Table view for company_representative', async () => {
    mockListResponse.data = [makeAssignment()];
    mockListResponse.meta.total = 1;

    renderPage('company_representative');

    expect(await screen.findByText('Ahmed Ali')).toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('STU001')).toBeInTheDocument();
  });

  it('renders the supervisor Card list view for academic_supervisor', async () => {
    mockListResponse.data = [makeAssignment()];
    mockListResponse.meta.total = 1;

    renderPage('academic_supervisor');

    expect(await screen.findByText('Ahmed Ali')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders the student single-placement view for student', async () => {
    mockMyAssignmentResponse = makeAssignment();

    renderPage('student');

    expect(await screen.findByText('Backend Trainee')).toBeInTheDocument();
  });

  it('shows the empty-placement state when a student has no assignment yet', async () => {
    mockMyAssignmentShouldReject = true;

    renderPage('student');

    expect(await screen.findByText(/no active training placement/i)).toBeInTheDocument();
  });

  it('renders a fallback message for a role with no matching view', async () => {
    renderPage('training_coordinator');

    expect(await screen.findByText('Training Assignments')).toBeInTheDocument();
  });

  it.each([
    ['active', 'Active'],
    ['suspended', 'Suspended'],
    ['completed', 'Completed'],
    ['terminated', 'Terminated'],
  ] as const)('renders the %s status badge as "%s" (TEP-666/667)', async (status, label) => {
    mockListResponse.data = [makeAssignment({ status })];
    mockListResponse.meta.total = 1;

    renderPage('company_representative');

    await waitFor(() => expect(screen.getByText(label)).toBeInTheDocument());
  });
});
