import { describe, it, expect } from 'vitest';
import companyRepresentativesReducer, {
  fetchCompanyRepresentatives,
  inviteCompanyRepresentative,
  updateCompanyRepresentativeMe,
  updateCompanyRepresentative,
  removeCompanyRepresentative,
  resetRepresentativesState,
  clearRepresentativeErrors,
} from '../companyRepresentativesSlice';
import type {
  CompanyRepresentativesState,
  CompanyRepresentativeItem,
} from '@/types/representative';

describe('companyRepresentativesSlice Reducer & Actions', () => {
  const initialState: CompanyRepresentativesState = {
    representatives: [],
    isAdmin: false,
    status: 'idle',
    inviteStatus: 'idle',
    updateStatus: 'idle',
    removeStatus: 'idle',
    error: null,
    validationErrors: null,
  };

  const mockReps: CompanyRepresentativeItem[] = [
    {
      id: 1,
      user_id: 10,
      name: 'Ahmed Admin',
      email: 'ahmed@company.com',
      phone: '+967 770 000 001',
      job_title: 'HR Director',
      is_primary: true,
      avatar_url: null,
      joined_at: '2026-08-01T00:00:00Z',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
    },
    {
      id: 2,
      user_id: 11,
      name: 'Sara Recruiter',
      email: 'sara@company.com',
      phone: '+967 770 000 002',
      job_title: 'Talent Acquisition',
      is_primary: false,
      avatar_url: null,
      joined_at: '2026-08-05T00:00:00Z',
      created_at: '2026-08-05T00:00:00Z',
      updated_at: '2026-08-05T00:00:00Z',
    },
  ];

  it('should return initial state when passed an empty action', () => {
    expect(companyRepresentativesReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle fetchCompanyRepresentatives lifecycle', () => {
    let state = companyRepresentativesReducer(initialState, {
      type: fetchCompanyRepresentatives.pending.type,
    });
    expect(state.status).toBe('loading');

    state = companyRepresentativesReducer(state, {
      type: fetchCompanyRepresentatives.fulfilled.type,
      payload: {
        data: mockReps,
        is_admin: true,
        message: 'Loaded',
      },
    });
    expect(state.status).toBe('succeeded');
    expect(state.representatives).toEqual(mockReps);
    expect(state.isAdmin).toBe(true);

    state = companyRepresentativesReducer(state, {
      type: fetchCompanyRepresentatives.rejected.type,
      payload: { message: 'Network error' },
    });
    expect(state.status).toBe('failed');
    expect(state.error).toBe('Network error');
  });

  it('should handle inviteCompanyRepresentative lifecycle', () => {
    let state = companyRepresentativesReducer(initialState, {
      type: inviteCompanyRepresentative.pending.type,
    });
    expect(state.inviteStatus).toBe('loading');

    state = companyRepresentativesReducer(state, {
      type: inviteCompanyRepresentative.fulfilled.type,
      payload: { invite_url: 'http://localhost/join', message: 'Invite sent' },
    });
    expect(state.inviteStatus).toBe('succeeded');

    state = companyRepresentativesReducer(state, {
      type: inviteCompanyRepresentative.rejected.type,
      payload: {
        message: 'Validation failed',
        errors: { email: ['Email is invalid'] },
      },
    });
    expect(state.inviteStatus).toBe('failed');
    expect(state.error).toBe('Validation failed');
    expect(state.validationErrors).toEqual({ email: ['Email is invalid'] });
  });

  it('should handle updateCompanyRepresentativeMe lifecycle', () => {
    const stateWithReps: CompanyRepresentativesState = {
      ...initialState,
      representatives: [...mockReps],
    };

    let state = companyRepresentativesReducer(stateWithReps, {
      type: updateCompanyRepresentativeMe.pending.type,
    });
    expect(state.updateStatus).toBe('loading');

    const updatedRep = { ...mockReps[0], job_title: 'Senior HR Director' };
    state = companyRepresentativesReducer(state, {
      type: updateCompanyRepresentativeMe.fulfilled.type,
      payload: { data: updatedRep, message: 'Updated' },
    });
    expect(state.updateStatus).toBe('succeeded');
    expect(state.representatives[0].job_title).toBe('Senior HR Director');
  });

  it('should handle updateCompanyRepresentative lifecycle', () => {
    const stateWithReps: CompanyRepresentativesState = {
      ...initialState,
      representatives: [...mockReps],
    };

    let state = companyRepresentativesReducer(stateWithReps, {
      type: updateCompanyRepresentative.pending.type,
    });
    expect(state.updateStatus).toBe('loading');

    const updatedColleague = { ...mockReps[1], job_title: 'Head of Talent' };
    state = companyRepresentativesReducer(state, {
      type: updateCompanyRepresentative.fulfilled.type,
      payload: { data: updatedColleague, message: 'Updated' },
    });
    expect(state.updateStatus).toBe('succeeded');
    expect(state.representatives[1].job_title).toBe('Head of Talent');
  });

  it('should handle removeCompanyRepresentative lifecycle', () => {
    const stateWithReps: CompanyRepresentativesState = {
      ...initialState,
      representatives: [...mockReps],
    };

    let state = companyRepresentativesReducer(stateWithReps, {
      type: removeCompanyRepresentative.pending.type,
    });
    expect(state.removeStatus).toBe('loading');

    state = companyRepresentativesReducer(state, {
      type: removeCompanyRepresentative.fulfilled.type,
      payload: { id: 2, message: 'Removed' },
    });
    expect(state.removeStatus).toBe('succeeded');
    expect(state.representatives.length).toBe(1);
    expect(state.representatives[0].id).toBe(1);
  });

  it('should handle resetRepresentativesState and clearRepresentativeErrors', () => {
    const errorState: CompanyRepresentativesState = {
      ...initialState,
      error: 'Some error',
      validationErrors: { email: ['Invalid'] },
    };

    let state = companyRepresentativesReducer(errorState, clearRepresentativeErrors());
    expect(state.error).toBeNull();
    expect(state.validationErrors).toBeNull();

    state = companyRepresentativesReducer(state, resetRepresentativesState());
    expect(state).toEqual(initialState);
  });
});
