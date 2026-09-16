import { describe, it, expect } from 'vitest';
import companyReducer, {
  submitCompanyRegistrationRequest,
  fetchCompanyProfile,
  updateCompanyProfile,
  uploadCompanyLogo,
  resetCompanyRequestState,
  clearCompanyRequestError,
  setCompanyProfile,
  clearCompanyProfileError,
  resetCompanyUpdateStatus,
  resetCompanyLogoStatus,
  clearCompanyErrors,
  type CompanyState,
} from '../companySlice';
import { type CompanyData } from '@/types/company';

describe('companySlice Reducer & Actions', () => {
  const initialState: CompanyState = {
    status: 'idle',
    successMessage: null,
    error: null,
    validationErrors: null,
    company: null,
    profileStatus: 'idle',
    profileError: null,
    updateStatus: 'idle',
    updateError: null,
    updateValidationErrors: null,
    updateSuccessMessage: null,
    logoStatus: 'idle',
    logoError: null,
    logoValidationErrors: null,
    logoSuccessMessage: null,
  };

  const mockCompany: CompanyData = {
    id: 10,
    name: { en: 'Tech Innovators Co.', ar: 'شركة مبتكرو التقنية' },
    registration_number: 'CR-102938',
    industry_id: 2,
    industry: {
      id: 2,
      code: 'IT',
      name: { en: 'Information Technology', ar: 'تكنولوجيا المعلومات' },
      is_active: true,
    },
    description: { en: 'Leading tech firm', ar: 'شركة تقنية رائدة' },
    email: 'info@techinnovators.com',
    contact_email: 'info@techinnovators.com',
    phone: '+967771234567',
    website: 'https://techinnovators.com',
    address: 'Hadda St, Sanaa',
    city: 'Sanaa',
    established_year: 2020,
    employees_count: '50-100',
    logo: 'http://localhost/storage/logos/tech.png',
    logo_url: 'http://localhost/storage/logos/tech.png',
    logo_file_id: 5,
    status: 'approved',
    status_reason: null,
    created_at: '2026-08-20T10:00:00Z',
    updated_at: '2026-08-20T10:00:00Z',
  };

  it('should return initial state when passed an empty action', () => {
    expect(companyReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle submitCompanyRegistrationRequest lifecycle', () => {
    let state = companyReducer(initialState, {
      type: submitCompanyRegistrationRequest.pending.type,
    });
    expect(state.status).toBe('loading');
    expect(state.error).toBeNull();
    expect(state.validationErrors).toBeNull();

    state = companyReducer(state, {
      type: submitCompanyRegistrationRequest.fulfilled.type,
      payload: 'Request submitted successfully',
    });
    expect(state.status).toBe('succeeded');
    expect(state.successMessage).toBe('Request submitted successfully');
    expect(state.error).toBeNull();

    state = companyReducer(state, {
      type: submitCompanyRegistrationRequest.rejected.type,
      payload: {
        message: 'Validation failed',
        errors: { name: ['Company name is required'] },
      },
    });
    expect(state.status).toBe('failed');
    expect(state.error).toBe('Validation failed');
    expect(state.validationErrors).toEqual({ name: ['Company name is required'] });
  });

  it('should handle fetchCompanyProfile lifecycle', () => {
    let state = companyReducer(initialState, {
      type: fetchCompanyProfile.pending.type,
    });
    expect(state.profileStatus).toBe('loading');
    expect(state.profileError).toBeNull();

    state = companyReducer(state, {
      type: fetchCompanyProfile.fulfilled.type,
      payload: mockCompany,
    });
    expect(state.profileStatus).toBe('succeeded');
    expect(state.company).toEqual(mockCompany);
    expect(state.profileError).toBeNull();

    state = companyReducer(state, {
      type: fetchCompanyProfile.rejected.type,
      payload: { message: 'No company is associated with your account.' },
    });
    expect(state.profileStatus).toBe('failed');
    expect(state.profileError).toBe('No company is associated with your account.');
  });

  it('should handle updateCompanyProfile lifecycle', () => {
    let state = companyReducer(initialState, {
      type: updateCompanyProfile.pending.type,
    });
    expect(state.updateStatus).toBe('loading');
    expect(state.updateError).toBeNull();
    expect(state.updateValidationErrors).toBeNull();
    expect(state.updateSuccessMessage).toBeNull();

    const updatedCompany: CompanyData = {
      ...mockCompany,
      name: { en: 'Updated Tech Co.', ar: 'شركة التقنية المحدثة' },
    };

    state = companyReducer(state, {
      type: updateCompanyProfile.fulfilled.type,
      payload: {
        company: updatedCompany,
        message: 'Profile updated successfully',
      },
    });
    expect(state.updateStatus).toBe('succeeded');
    expect(state.company).toEqual(updatedCompany);
    expect(state.updateSuccessMessage).toBe('Profile updated successfully');
    expect(state.updateError).toBeNull();

    state = companyReducer(state, {
      type: updateCompanyProfile.rejected.type,
      payload: {
        message: 'Validation failed',
        errors: { name_ar: ['The name_ar field is required.'] },
      },
    });
    expect(state.updateStatus).toBe('failed');
    expect(state.updateError).toBe('Validation failed');
    expect(state.updateValidationErrors).toEqual({
      name_ar: ['The name_ar field is required.'],
    });
  });

  it('should handle uploadCompanyLogo lifecycle', () => {
    let state = companyReducer(initialState, {
      type: uploadCompanyLogo.pending.type,
    });
    expect(state.logoStatus).toBe('loading');
    expect(state.logoError).toBeNull();
    expect(state.logoValidationErrors).toBeNull();
    expect(state.logoSuccessMessage).toBeNull();

    const companyWithNewLogo: CompanyData = {
      ...mockCompany,
      logo: 'http://localhost/storage/company_logos/new_logo.png',
      logo_url: 'http://localhost/storage/company_logos/new_logo.png',
      logo_file_id: 20,
    };

    state = companyReducer(state, {
      type: uploadCompanyLogo.fulfilled.type,
      payload: {
        company: companyWithNewLogo,
        message: 'Logo uploaded successfully',
      },
    });
    expect(state.logoStatus).toBe('succeeded');
    expect(state.company).toEqual(companyWithNewLogo);
    expect(state.logoSuccessMessage).toBe('Logo uploaded successfully');

    state = companyReducer(state, {
      type: uploadCompanyLogo.rejected.type,
      payload: {
        message: 'File too large',
        errors: { logo: ['The logo must not be greater than 2048 kilobytes.'] },
      },
    });
    expect(state.logoStatus).toBe('failed');
    expect(state.logoError).toBe('File too large');
    expect(state.logoValidationErrors).toEqual({
      logo: ['The logo must not be greater than 2048 kilobytes.'],
    });
  });

  it('should handle helper actions: resetCompanyUpdateStatus, resetCompanyLogoStatus, clearCompanyErrors, setCompanyProfile, clearCompanyProfileError, resetCompanyRequestState, clearCompanyRequestError', () => {
    let state = companyReducer(initialState, setCompanyProfile(mockCompany));
    expect(state.company).toEqual(mockCompany);

    state = companyReducer(
      { ...state, profileError: 'Some profile error' },
      clearCompanyProfileError()
    );
    expect(state.profileError).toBeNull();

    state = companyReducer(
      {
        ...state,
        status: 'failed',
        error: 'Req error',
        validationErrors: { email: ['Invalid'] },
        successMessage: 'Done',
      },
      clearCompanyRequestError()
    );
    expect(state.error).toBeNull();
    expect(state.validationErrors).toBeNull();

    state = companyReducer(state, resetCompanyRequestState());
    expect(state.status).toBe('idle');
    expect(state.successMessage).toBeNull();
    expect(state.error).toBeNull();

    state = companyReducer(
      {
        ...initialState,
        updateStatus: 'failed',
        updateError: 'Some update error',
        updateValidationErrors: { name_ar: ['Required'] },
        updateSuccessMessage: 'Success',
      },
      resetCompanyUpdateStatus()
    );
    expect(state.updateStatus).toBe('idle');
    expect(state.updateError).toBeNull();
    expect(state.updateValidationErrors).toBeNull();
    expect(state.updateSuccessMessage).toBeNull();

    state = companyReducer(
      {
        ...state,
        logoStatus: 'failed',
        logoError: 'Some logo error',
        logoValidationErrors: { logo: ['Invalid image'] },
        logoSuccessMessage: 'Success',
      },
      resetCompanyLogoStatus()
    );
    expect(state.logoStatus).toBe('idle');
    expect(state.logoError).toBeNull();
    expect(state.logoValidationErrors).toBeNull();
    expect(state.logoSuccessMessage).toBeNull();

    state = companyReducer(
      {
        ...state,
        error: 'Err 1',
        validationErrors: { email: ['Invalid'] },
        profileError: 'Err 2',
        updateError: 'Err 3',
        updateValidationErrors: { name: ['Required'] },
        logoError: 'Err 4',
        logoValidationErrors: { logo: ['Invalid'] },
      },
      clearCompanyErrors()
    );
    expect(state.error).toBeNull();
    expect(state.validationErrors).toBeNull();
    expect(state.profileError).toBeNull();
    expect(state.updateError).toBeNull();
    expect(state.updateValidationErrors).toBeNull();
    expect(state.logoError).toBeNull();
    expect(state.logoValidationErrors).toBeNull();
  });
});
