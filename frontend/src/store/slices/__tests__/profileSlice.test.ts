import { describe, it, expect } from 'vitest';
import profileReducer, {
  fetchProfile,
  updateProfile,
  attachSkill,
  detachSkill,
  unlinkSso,
  clearProfileErrors,
  resetProfileState,
  type ProfileState,
} from '../profileSlice';
import { type UserProfile } from '@/types/profile';

describe('profileSlice Reducer & Actions', () => {
  const initialState: ProfileState = {
    profile: null,
    status: 'idle',
    updateStatus: 'idle',
    avatarStatus: 'idle',
    passwordStatus: 'idle',
    skillStatus: 'idle',
    ssoStatus: 'idle',
    error: null,
    validationErrors: null,
    successMessage: null,
  };

  const mockProfile: UserProfile = {
    id: 1,
    name: 'Salem Student',
    email: 'salem@example.com',
    phone: '+967771234567',
    status: 'active',
    email_verified_at: '2026-08-18T00:00:00Z',
    roles: [{ id: 1, name: 'student', label: 'طالب' }],
    student_profile: {
      id: 1,
      student_number: 'STU-001',
      major_id: 1,
      university_name: 'Sanaa University',
      level_year: 4,
      gpa: 3.8,
      bio: 'IT Student',
      phone: '+967771234567',
      address: 'Sanaa',
      expected_graduation: '2026-06',
      interests: ['AI', 'React'],
      languages: ['Arabic', 'English'],
      achievements: ['Honor roll'],
      major: { id: 1, name: 'CS', code: 'CS' },
      skills: [{ id: 1, name: 'React', proficiency: 'advanced' }],
    },
    sso_identities: [{ id: 1, provider: 'google', provider_email: 'salem@gmail.com' }],
  };

  it('should return initial state when passed an empty action', () => {
    expect(profileReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle fetchProfile lifecycle', () => {
    let state = profileReducer(initialState, { type: fetchProfile.pending.type });
    expect(state.status).toBe('loading');

    state = profileReducer(state, {
      type: fetchProfile.fulfilled.type,
      payload: mockProfile,
    });
    expect(state.status).toBe('succeeded');
    expect(state.profile).toEqual(mockProfile);

    state = profileReducer(state, {
      type: fetchProfile.rejected.type,
      payload: { message: 'Failed to load profile' },
    });
    expect(state.status).toBe('failed');
    expect(state.error).toBe('Failed to load profile');
  });

  it('should handle updateProfile lifecycle', () => {
    let state = profileReducer(initialState, { type: updateProfile.pending.type });
    expect(state.updateStatus).toBe('loading');

    const updatedProfile = { ...mockProfile, name: 'Salem Updated' };
    state = profileReducer(state, {
      type: updateProfile.fulfilled.type,
      payload: { profile: updatedProfile, message: 'Profile updated' },
    });
    expect(state.updateStatus).toBe('succeeded');
    expect(state.profile?.name).toBe('Salem Updated');
    expect(state.successMessage).toBe('Profile updated');

    state = profileReducer(state, {
      type: updateProfile.rejected.type,
      payload: {
        message: 'Validation error',
        errors: { name: ['Name is required'] },
      },
    });
    expect(state.updateStatus).toBe('failed');
    expect(state.error).toBe('Validation error');
    expect(state.validationErrors).toEqual({ name: ['Name is required'] });
  });

  it('should handle attachSkill and detachSkill lifecycle', () => {
    let state = profileReducer(initialState, { type: attachSkill.pending.type });
    expect(state.skillStatus).toBe('loading');

    state = profileReducer(state, { type: attachSkill.fulfilled.type });
    expect(state.skillStatus).toBe('succeeded');

    state = profileReducer(state, {
      type: attachSkill.rejected.type,
      payload: { message: 'Skill duplicate' },
    });
    expect(state.skillStatus).toBe('failed');
    expect(state.error).toBe('Skill duplicate');

    state = profileReducer(state, { type: detachSkill.pending.type });
    expect(state.skillStatus).toBe('loading');

    state = profileReducer(state, { type: detachSkill.fulfilled.type });
    expect(state.skillStatus).toBe('succeeded');
  });

  it('should handle unlinkSso lifecycle', () => {
    let state = profileReducer(initialState, { type: unlinkSso.pending.type });
    expect(state.ssoStatus).toBe('loading');

    state = profileReducer(state, { type: unlinkSso.fulfilled.type });
    expect(state.ssoStatus).toBe('succeeded');

    state = profileReducer(state, {
      type: unlinkSso.rejected.type,
      payload: { message: 'Cannot unlink last auth method' },
    });
    expect(state.ssoStatus).toBe('failed');
    expect(state.error).toBe('Cannot unlink last auth method');
  });

  it('should handle clearProfileErrors and resetProfileState', () => {
    const errorState: ProfileState = {
      ...initialState,
      avatarStatus: 'idle',
      error: 'Some error',
      validationErrors: { name: ['Invalid'] },
      successMessage: 'Success',
    };

    let state = profileReducer(errorState, clearProfileErrors());
    expect(state.error).toBeNull();
    expect(state.validationErrors).toBeNull();
    expect(state.successMessage).toBeNull();

    state = profileReducer({ ...errorState, profile: mockProfile }, resetProfileState());
    expect(state).toEqual(initialState);
  });
});
