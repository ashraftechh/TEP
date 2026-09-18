import { describe, it, expect } from 'vitest';
import applicationReducer, {
  withdrawApplication,
  fetchMyApplications,
  clearWithdrawError,
  reviewApplication,
  clearReviewError,
  type ApplicationState,
} from '../applicationSlice';
import type { ApplicationItem } from '@/types/application';

describe('applicationSlice Reducer & Actions — withdrawApplication (TEP-640/641)', () => {
  const initialState: ApplicationState = {
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
  };

  const mockApplication: ApplicationItem = {
    id: 1,
    opportunity_id: 10,
    student_profile_id: 5,
    cv_file_id: 2,
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
  };

  it('should return initial state when passed an empty action', () => {
    expect(applicationReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle withdrawApplication.pending', () => {
    const state = applicationReducer(
      { ...initialState, withdrawError: 'stale error' },
      { type: withdrawApplication.pending.type }
    );
    expect(state.isWithdrawing).toBe(true);
    expect(state.withdrawError).toBeNull();
  });

  it('should handle withdrawApplication.fulfilled by updating the matching item in myApplications', () => {
    const startState: ApplicationState = {
      ...initialState,
      isWithdrawing: true,
      myApplications: [
        mockApplication,
        { ...mockApplication, id: 2, status: 'under_review' as const },
      ],
    };

    const withdrawnApplication: ApplicationItem = {
      ...mockApplication,
      status: 'withdrawn',
      withdrawn_reason: 'Accepted a different offer.',
      version: 2,
      can_withdraw: false,
    };

    const state = applicationReducer(startState, {
      type: withdrawApplication.fulfilled.type,
      payload: {
        application: withdrawnApplication,
        message: 'Your application has been withdrawn.',
      },
    });

    expect(state.isWithdrawing).toBe(false);
    expect(state.withdrawError).toBeNull();
    expect(state.myApplications).toHaveLength(2);
    expect(state.myApplications[0].status).toBe('withdrawn');
    expect(state.myApplications[0].withdrawn_reason).toBe('Accepted a different offer.');
    expect(state.myApplications[0].can_withdraw).toBe(false);
    // The other application in the list is untouched.
    expect(state.myApplications[1].id).toBe(2);
    expect(state.myApplications[1].status).toBe('under_review');
  });

  it('should handle withdrawApplication.fulfilled gracefully when the item is not in the loaded list', () => {
    const state = applicationReducer(
      { ...initialState, isWithdrawing: true, myApplications: [] },
      {
        type: withdrawApplication.fulfilled.type,
        payload: {
          application: { ...mockApplication, status: 'withdrawn' as const },
          message: 'Your application has been withdrawn.',
        },
      }
    );

    expect(state.isWithdrawing).toBe(false);
    expect(state.myApplications).toEqual([]);
  });

  it('should handle withdrawApplication.rejected (e.g. terminal-status 409)', () => {
    const state = applicationReducer(
      { ...initialState, isWithdrawing: true },
      {
        type: withdrawApplication.rejected.type,
        payload: 'This application cannot be withdrawn from its current status.',
      }
    );

    expect(state.isWithdrawing).toBe(false);
    expect(state.withdrawError).toBe(
      'This application cannot be withdrawn from its current status.'
    );
  });

  it('clearWithdrawError should reset withdrawError without touching other state', () => {
    const state = applicationReducer(
      { ...initialState, withdrawError: 'some error', myApplications: [mockApplication] },
      clearWithdrawError()
    );

    expect(state.withdrawError).toBeNull();
    expect(state.myApplications).toHaveLength(1);
  });

  it('withdrawApplication reducer changes are independent of fetchMyApplications state', () => {
    let state = applicationReducer(initialState, {
      type: fetchMyApplications.fulfilled.type,
      payload: { data: [mockApplication], meta: null },
    });
    expect(state.myApplications).toHaveLength(1);

    state = applicationReducer(state, { type: withdrawApplication.pending.type });
    expect(state.isWithdrawing).toBe(true);
    expect(state.myApplications).toHaveLength(1);
  });

  it('should handle reviewApplication.pending and reviewApplication.fulfilled on companyApplications', () => {
    let state = applicationReducer(
      {
        ...initialState,
        reviewError: 'stale review error',
        companyApplications: [mockApplication],
      },
      { type: reviewApplication.pending.type }
    );
    expect(state.isReviewing).toBe(true);
    expect(state.reviewError).toBeNull();

    const reviewedApp: ApplicationItem = {
      ...mockApplication,
      status: 'under_review',
      version: 2,
    };

    state = applicationReducer(state, {
      type: reviewApplication.fulfilled.type,
      payload: { application: reviewedApp, message: 'Application is now under review.' },
    });

    expect(state.isReviewing).toBe(false);
    expect(state.companyApplications[0].status).toBe('under_review');
    expect(state.companyApplications[0].version).toBe(2);
  });

  it('clearReviewError should reset reviewError', () => {
    const state = applicationReducer(
      { ...initialState, reviewError: 'Failed to review' },
      clearReviewError()
    );
    expect(state.reviewError).toBeNull();
  });
});
