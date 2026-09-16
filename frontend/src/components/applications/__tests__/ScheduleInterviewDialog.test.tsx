import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { ScheduleInterviewDialog } from '../ScheduleInterviewDialog';
import applicationReducer from '@/store/slices/applicationSlice';
import type { ApplicationItem } from '@/types/application';
import i18n from '@/i18n';

const baseApplication: ApplicationItem = {
  id: 7,
  opportunity_id: 42,
  student_profile_id: 3,
  cv_file_id: 9,
  cover_note: null,
  status: 'submitted',
  interview_at: null,
  decision_reason: null,
  withdrawn_reason: null,
  version: 1,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
  can_withdraw: false,
  student_profile: {
    id: 3,
    student_number: 'STU100200',
    gpa: 3.6,
    user: { id: 20, name: 'سارة أحمد', email: 'sara@student.test' },
  },
  opportunity: {
    id: 42,
    title: { ar: 'مطور واجهات متدرب', en: 'Frontend Intern' },
    location: null,
    duration: null,
    capacity: 2,
    accepted_count: 1,
  },
};

const createTestStore = () =>
  configureStore({
    reducer: { application: applicationReducer },
  });

// A fixed future value valid for <input type="datetime-local">.
const FUTURE_LOCAL_VALUE = '2099-01-01T10:00';

describe('ScheduleInterviewDialog (TEP-653/654/655)', () => {
  beforeEach(() => {
    i18n.changeLanguage('en');
  });

  it('opens in "Schedule" mode with an empty, disabled-until-valid date field', () => {
    render(
      <Provider store={createTestStore()}>
        <ThemeProvider>
          <ToastProvider>
            <ScheduleInterviewDialog isOpen onClose={vi.fn()} application={baseApplication} />
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    );

    expect(screen.getByRole('heading', { name: 'Schedule Interview' })).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: /Schedule Interview/i });
    expect(confirmButton).toBeDisabled();

    const dateInput = screen.getByLabelText(/Interview date & time/i);
    expect(dateInput).toHaveValue('');

    fireEvent.change(dateInput, { target: { value: FUTURE_LOCAL_VALUE } });
    expect(confirmButton).not.toBeDisabled();
  });

  it('keeps the confirm button disabled for a past date and shows the future-date error', () => {
    render(
      <Provider store={createTestStore()}>
        <ThemeProvider>
          <ToastProvider>
            <ScheduleInterviewDialog isOpen onClose={vi.fn()} application={baseApplication} />
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    );

    const dateInput = screen.getByLabelText(/Interview date & time/i);
    fireEvent.change(dateInput, { target: { value: '2020-01-01T10:00' } });

    const confirmButton = screen.getByRole('button', { name: /Schedule Interview/i });
    expect(confirmButton).toBeDisabled();
    expect(screen.getByText(/must be in the future/i)).toBeInTheDocument();
  });

  it('opens in "Reschedule" mode and pre-fills the existing interview time when already interview_scheduled (TEP-654)', () => {
    const scheduledApplication: ApplicationItem = {
      ...baseApplication,
      status: 'interview_scheduled',
      interview_at: '2099-06-15T13:30:00.000Z',
    };

    render(
      <Provider store={createTestStore()}>
        <ThemeProvider>
          <ToastProvider>
            <ScheduleInterviewDialog isOpen onClose={vi.fn()} application={scheduledApplication} />
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    );

    expect(screen.getByRole('heading', { name: 'Reschedule Interview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Reschedule$/i })).toBeInTheDocument();

    const dateInput = screen.getByLabelText(/Interview date & time/i);
    // Pre-filled from application.interview_at rather than starting blank.
    expect(dateInput).not.toHaveValue('');

    // Already a valid future date, so reschedule should be submittable
    // without the user touching the field first.
    expect(screen.getByRole('button', { name: /^Reschedule$/i })).not.toBeDisabled();
  });
});
