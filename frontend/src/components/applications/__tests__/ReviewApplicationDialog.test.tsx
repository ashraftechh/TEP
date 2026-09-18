import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { ReviewApplicationDialog } from '../ReviewApplicationDialog';
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
  submitted_at: '2026-08-01T00:00:00Z',
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

const createTestStore = (initialStateOverrides = {}) =>
  configureStore({
    reducer: { application: applicationReducer },
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
        ...initialStateOverrides,
      },
    },
  });

describe('ReviewApplicationDialog (TEP-652)', () => {
  beforeEach(() => {
    i18n.changeLanguage('en');
  });

  it('renders student details and confirmation button', () => {
    render(
      <Provider store={createTestStore()}>
        <ThemeProvider>
          <ToastProvider>
            <ReviewApplicationDialog isOpen onClose={vi.fn()} application={baseApplication} />
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    );

    expect(screen.getByText('Mark as Under Review')).toBeInTheDocument();
    expect(screen.getByText(/سارة أحمد/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Review/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /Cancel/i })).not.toBeDisabled();
  });

  it('calls onClose when Cancel is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Provider store={createTestStore()}>
        <ThemeProvider>
          <ToastProvider>
            <ReviewApplicationDialog isOpen onClose={handleClose} application={baseApplication} />
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('shows error message if reviewError exists in state', () => {
    render(
      <Provider store={createTestStore({ reviewError: 'Application status is invalid.' })}>
        <ThemeProvider>
          <ToastProvider>
            <ReviewApplicationDialog isOpen onClose={vi.fn()} application={baseApplication} />
          </ToastProvider>
        </ThemeProvider>
      </Provider>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Application status is invalid.');
  });
});
