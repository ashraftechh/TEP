import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { AcceptApplicationDialog } from '../AcceptApplicationDialog';
import { RejectApplicationDialog } from '../RejectApplicationDialog';
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

describe('AcceptApplicationDialog (TEP-650/651)', () => {
  beforeEach(() => {
    i18n.changeLanguage('en');
  });

  it('shows the current accepted_count/capacity and allows confirming when under capacity', () => {
    render(
      <Provider store={createTestStore()}>
        <ThemeProvider>
          <ToastProvider>
            <AcceptApplicationDialog isOpen onClose={vi.fn()} application={baseApplication} />
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    );

    expect(screen.getByText('1 of 2 slots filled')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accept Application/i })).not.toBeDisabled();
  });

  it('disables the confirm button once capacity is visibly reached (TEP-651)', () => {
    const atCapacityApplication: ApplicationItem = {
      ...baseApplication,
      opportunity: { ...baseApplication.opportunity!, capacity: 2, accepted_count: 2 },
    };

    render(
      <Provider store={createTestStore()}>
        <ThemeProvider>
          <ToastProvider>
            <AcceptApplicationDialog isOpen onClose={vi.fn()} application={atCapacityApplication} />
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    );

    expect(screen.getByText('2 of 2 slots filled')).toBeInTheDocument();
    expect(screen.getByText(/already reached its accepted-student capacity/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accept Application/i })).toBeDisabled();
  });
});

describe('RejectApplicationDialog (TEP-650/651)', () => {
  beforeEach(() => {
    i18n.changeLanguage('en');
  });

  it('blocks submission until a reason is entered (TEP-651)', () => {
    render(
      <Provider store={createTestStore()}>
        <ThemeProvider>
          <ToastProvider>
            <RejectApplicationDialog isOpen onClose={vi.fn()} application={baseApplication} />
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    );

    const confirmButton = screen.getByRole('button', { name: /Reject Application/i });
    expect(confirmButton).toBeDisabled();

    const textarea = screen.getByPlaceholderText(/Explain why this application is being rejected/i);
    fireEvent.change(textarea, { target: { value: '   ' } });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(textarea, { target: { value: 'Not a strong skills match.' } });
    expect(confirmButton).not.toBeDisabled();
  });
});
