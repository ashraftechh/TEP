import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { ProfilePage } from '../ProfilePage';
import authReducer from '@/store/slices/authSlice';
import lookupReducer from '@/store/slices/lookupSlice';
import profileReducer from '@/store/slices/profileSlice';
import companyRepresentativesReducer from '@/store/slices/companyRepresentativesSlice';
import { api, primeCsrfCookie } from '@/lib/api';
import i18n from '@/i18n';
import { type UserProfile } from '@/types/profile';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  primeCsrfCookie: vi.fn().mockResolvedValue({}),
}));

const mockStudentProfile: UserProfile = {
  id: 1,
  name: 'Salem Student',
  email: 'salem@student.edu',
  phone: '+967 771 234 567',
  status: 'active',
  has_password: true,
  email_verified_at: '2026-08-18T00:00:00Z',
  roles: [{ id: 1, name: 'student', label: { ar: 'طالب', en: 'Student' } }],
  student_profile: {
    id: 10,
    student_number: 'STU-2026-001',
    major_id: 1,
    university_name: 'جامعة صنعاء',
    level_year: 4,
    phone: '+967 771 234 567',
    gpa: 3.85,
    bio: 'Software Engineering senior student.',
    address: "Sana'a, Yemen",
    expected_graduation: '2026-06',
    interests: ['AI', 'Web Development'],
    languages: ['Arabic', 'English'],
    achievements: ["Dean's List 2025"],
    avatar_file_id: null,
    major: { id: 1, code: 'SWE', name: { ar: 'هندسة البرمجيات', en: 'Software Engineering' } },
    skills: [{ id: 10, name: { ar: 'رياكت', en: 'React' }, proficiency: 'intermediate' }],
  },
  sso_identities: [{ id: 1, provider: 'google', provider_email: 'salem@gmail.com' }],
};

const mockAvailableSkills = [
  { id: 10, name: { en: 'React', ar: 'رياكت' }, is_active: true },
  { id: 20, name: { en: 'TypeScript', ar: 'تايب سكريبت' }, is_active: true },
  { id: 30, name: { en: 'Python', ar: 'بايثون' }, is_active: true },
];

const createTestStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      lookup: lookupReducer,
      profile: profileReducer,
      companyRepresentatives: companyRepresentativesReducer,
    },
  });

const renderProfilePage = (store = createTestStore()) =>
  render(
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={['/profile']}>
            <ProfilePage />
          </MemoryRouter>
        </ToastProvider>
      </ThemeProvider>
    </Provider>
  );

describe('ProfilePage Component (TEP-586)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
    vi.clearAllMocks();

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/profile') {
        return Promise.resolve({ data: { data: mockStudentProfile } });
      }
      if (url === '/skills') {
        return Promise.resolve({ data: { data: mockAvailableSkills } });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it('renders student profile with personal, academic, skills, and linked accounts info', async () => {
    renderProfilePage();

    const names = await screen.findAllByText('Salem Student');
    expect(names.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('salem@student.edu').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('STU-2026-001')).toBeInTheDocument();
    expect(screen.getByText('3.85')).toBeInTheDocument();
    expect(screen.getByText('هندسة البرمجيات')).toBeInTheDocument();
    expect(screen.getByText('Software Engineering senior student.')).toBeInTheDocument();
    expect(screen.getByText('رياكت')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
  });

  it('ensures GPA, Student ID, and Major are read-only elements', async () => {
    renderProfilePage();

    await screen.findAllByText('Salem Student');

    // Student ID and GPA must NOT be editable inputs
    expect(screen.queryByRole('textbox', { name: /المعدل التراكمي/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /الرقم الجامعي/i })).not.toBeInTheDocument();
  });

  it('toggles edit mode when clicking edit and cancel buttons', async () => {
    renderProfilePage();

    const editButton = await screen.findByRole('button', { name: /تعديل/i });
    fireEvent.click(editButton);

    // In edit mode, Save & Cancel buttons appear
    expect(screen.getByRole('button', { name: /حفظ التغييرات/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^إلغاء$/ })).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /^إلغاء$/ });
    fireEvent.click(cancelButton);

    expect(screen.getByRole('button', { name: /تعديل/i })).toBeInTheDocument();
  });

  it('saves updated name and bio when submitting in edit mode', async () => {
    vi.mocked(api.patch).mockResolvedValueOnce({
      data: {
        data: {
          ...mockStudentProfile,
          name: 'Salem Updated Name',
          student_profile: {
            ...mockStudentProfile.student_profile!,
            bio: 'Updated bio information.',
          },
        },
        message: 'تم تحديث الملف الشخصي بنجاح!',
      },
    });

    renderProfilePage();

    const editButton = await screen.findByRole('button', { name: /تعديل/i });
    fireEvent.click(editButton);

    const nameInput = screen.getByLabelText(/الاسم الكامل/i);
    fireEvent.change(nameInput, { target: { value: 'Salem Updated Name' } });

    const saveButton = screen.getByRole('button', { name: /حفظ التغييرات/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(primeCsrfCookie).toHaveBeenCalled();
      expect(api.patch).toHaveBeenCalledWith(
        '/profile',
        expect.objectContaining({
          name: 'Salem Updated Name',
        })
      );
      expect(screen.getByText('تم تحديث الملف الشخصي بنجاح!')).toBeInTheDocument();
    });
  });

  it('attaches and detaches skills via API calls', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({
      data: { message: 'تمت إزالة المهارة بنجاح.' },
    });

    renderProfilePage();

    const editButton = await screen.findByRole('button', { name: /تعديل/i });
    fireEvent.click(editButton);

    // Detach skill
    const removeSkillBtn = screen.getByRole('button', { name: /Remove skill/i });
    fireEvent.click(removeSkillBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/profile/skills/10');
    });
  });

  it('unlinks an SSO provider when clicking unlink button', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({
      data: { message: 'تم إلغاء ربط الحساب بنجاح.' },
    });

    renderProfilePage();

    const unlinkBtn = await screen.findByRole('button', { name: /إلغاء الربط/i });
    fireEvent.click(unlinkBtn);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/profile/sso/google');
    });
  });

  it('renders academic supervisor department information', async () => {
    const mockSupervisorProfile: UserProfile = {
      id: 2,
      name: 'Dr. Supervisor',
      email: 'supervisor@university.edu',
      phone: '+967770001122',
      status: 'active',
      email_verified_at: '2026-08-18T00:00:00Z',
      roles: [{ id: 2, name: 'academic_supervisor', label: 'مشرف أكاديمي' }],
      academic_supervisor_profile: {
        id: 1,
        department_id: 5,
        department: { id: 5, name: { en: 'Computer Science', ar: 'علوم الحاسوب' }, code: 'CS' },
      },
    };

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/profile') {
        return Promise.resolve({ data: { data: mockSupervisorProfile } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    renderProfilePage();

    const supervisorNames = await screen.findAllByText('Dr. Supervisor');
    expect(supervisorNames.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('علوم الحاسوب')).toBeInTheDocument();
    expect(screen.getByText('CS')).toBeInTheDocument();
    expect(screen.queryByText(/المعدل التراكمي/i)).not.toBeInTheDocument();
  });

  it('updates text when language changes', async () => {
    renderProfilePage();

    await screen.findAllByText('Salem Student');

    await i18n.changeLanguage('en');

    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Academic Information')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
  });
});
