import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { CompanyRepresentativesSection } from '../CompanyRepresentativesSection';
import authReducer from '@/store/slices/authSlice';
import companyRepresentativesReducer from '@/store/slices/companyRepresentativesSlice';
import profileReducer from '@/store/slices/profileSlice';
import { api } from '@/lib/api';
import type { CompanyRepresentativeItem } from '@/types/representative';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  primeCsrfCookie: vi.fn().mockResolvedValue({}),
}));

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
    user_id: 20,
    name: 'Sara Recruiter',
    email: 'sara@company.com',
    phone: '+967 770 000 002',
    job_title: 'Talent Lead',
    is_primary: false,
    avatar_url: null,
    joined_at: '2026-08-05T00:00:00Z',
    created_at: '2026-08-05T00:00:00Z',
    updated_at: '2026-08-05T00:00:00Z',
  },
];

const createTestStore = (userId: number = 10, isAdmin: boolean = true) =>
  configureStore({
    reducer: {
      auth: authReducer,
      companyRepresentatives: companyRepresentativesReducer,
      profile: profileReducer,
    },
    preloadedState: {
      auth: {
        user: {
          id: userId,
          name: userId === 10 ? 'Ahmed Admin' : 'Sara Recruiter',
          email: userId === 10 ? 'ahmed@company.com' : 'sara@company.com',
          status: 'active' as const,
        },
        registeredEmail: null,
        isInitializing: false,
        status: 'idle' as const,
        error: null,
        errorCode: null,
        validationErrors: null,
        verificationStatus: 'idle' as const,
        verificationError: null,
        verificationMessage: null,
        isLoginRequiredForVerification: false,
        resendStatus: 'idle' as const,
        resendMessage: null,
        resendError: null,
      },
      companyRepresentatives: {
        representatives: mockReps,
        isAdmin,
        status: 'succeeded' as const,
        inviteStatus: 'idle' as const,
        updateStatus: 'idle' as const,
        removeStatus: 'idle' as const,
        error: null,
        validationErrors: null,
      },
    },
  });

const renderComponent = (store = createTestStore()) =>
  render(
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>
          <MemoryRouter>
            <CompanyRepresentativesSection />
          </MemoryRouter>
        </ToastProvider>
      </ThemeProvider>
    </Provider>
  );

describe('CompanyRepresentativesSection Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        data: mockReps,
        is_admin: true,
        message: 'Representatives retrieved successfully.',
      },
    });
  });

  it('renders representatives list correctly with names and emails', async () => {
    renderComponent();

    expect(screen.getByText('Ahmed Admin')).toBeInTheDocument();
    expect(screen.getByText('ahmed@company.com')).toBeInTheDocument();
    expect(screen.getByText('Sara Recruiter')).toBeInTheDocument();
    expect(screen.getByText('sara@company.com')).toBeInTheDocument();
    expect(screen.getByText('HR Director')).toBeInTheDocument();
    expect(screen.getByText('Talent Lead')).toBeInTheDocument();
  });

  it('renders invite form for admin user', async () => {
    renderComponent(createTestStore(10, true));

    // Admin should see invite card
    expect(screen.getByPlaceholderText('colleague@company.com')).toBeInTheDocument();
  });

  it('does NOT render invite form for non-admin user', async () => {
    renderComponent(createTestStore(20, false));

    // Non-admin should not see invite card
    expect(screen.queryByPlaceholderText('colleague@company.com')).not.toBeInTheDocument();
  });

  it('allows admin to submit an invite to a colleague', async () => {
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        data: { invite_url: 'http://frontend/join' },
        message: 'Invitation sent successfully.',
      },
    });

    renderComponent(createTestStore(10, true));

    const emailInput = screen.getByPlaceholderText('colleague@company.com');
    fireEvent.change(emailInput, { target: { value: 'new_colleague@company.com' } });

    const submitBtn = screen.getByRole('button', { name: /Send Invite/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/company/representatives/invite', {
        email: 'new_colleague@company.com',
      });
    });
  });

  it('allows representative to inline edit job title', async () => {
    (api.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        data: { ...mockReps[0], job_title: 'Chief HR Officer' },
        message: 'Updated',
      },
    });

    renderComponent(createTestStore(10, true));

    const editBtns = screen.getAllByTitle(/Edit Job Title/i);
    fireEvent.click(editBtns[0]);

    const titleInput = screen.getByDisplayValue('HR Director');
    fireEvent.change(titleInput, { target: { value: 'Chief HR Officer' } });

    const saveBtn = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/company/representatives/me', {
        job_title: 'Chief HR Officer',
      });
    });
  });

  it('opens confirmation modal and executes removal', async () => {
    (api.delete as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { message: 'Representative removed successfully.' },
    });

    renderComponent(createTestStore(10, true));

    const removeBtn = screen.getByTitle('Remove');
    fireEvent.click(removeBtn);

    // Modal should be visible
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /Yes, Remove Member/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/company/representatives/2');
    });
  });
});
