import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';
import { CompanyProfilePage } from '../CompanyProfilePage';
import authReducer from '@/store/slices/authSlice';
import companyReducer from '@/store/slices/companySlice';
import lookupReducer from '@/store/slices/lookupSlice';
import { api, primeCsrfCookie } from '@/lib/api';
import i18n from '@/i18n';
import { type CompanyData } from '@/types/company';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  primeCsrfCookie: vi.fn().mockResolvedValue({}),
}));

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
  stats: {
    available_opportunities: 5,
    accepted_students: 18,
  },
  created_at: '2026-08-20T10:00:00Z',
  updated_at: '2026-08-20T10:00:00Z',
};

const mockIndustries = [
  {
    id: 2,
    code: 'IT',
    name: { en: 'Information Technology', ar: 'تكنولوجيا المعلومات' },
    is_active: true,
  },
  {
    id: 3,
    code: 'FIN',
    name: { en: 'Finance', ar: 'المالية' },
    is_active: true,
  },
];

const createTestStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      company: companyReducer,
      lookup: lookupReducer,
    },
  });

const renderCompanyProfilePage = (store = createTestStore()) =>
  render(
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={['/company/profile']}>
            <CompanyProfilePage />
          </MemoryRouter>
        </ToastProvider>
      </ThemeProvider>
    </Provider>
  );

describe('CompanyProfilePage (TEP-608)', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('ar');
    vi.clearAllMocks();

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/company') {
        return Promise.resolve({ data: { data: mockCompany } });
      }
      if (url === '/industries') {
        return Promise.resolve({ data: { data: mockIndustries } });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it('renders company profile with localized name, industry, and contact info', async () => {
    renderCompanyProfilePage();

    expect(await screen.findByRole('heading', { name: 'ملف الشركة' })).toBeInTheDocument();
    expect(screen.getAllByText('شركة مبتكرو التقنية').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('تكنولوجيا المعلومات').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('CR-102938').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('info@techinnovators.com')).toBeInTheDocument();
    expect(screen.getByText('+967771234567')).toBeInTheDocument();
    expect(screen.getByText('شركة تقنية رائدة')).toBeInTheDocument();
  });

  it('renders real stats values for available opportunities and accepted students', async () => {
    renderCompanyProfilePage();

    expect(await screen.findByRole('heading', { name: 'ملف الشركة' })).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
  });

  it('shows changes_requested status alert with status_reason', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/company') {
        return Promise.resolve({
          data: {
            data: {
              ...mockCompany,
              status: 'changes_requested',
              status_reason: 'Please update the company description.',
            },
          },
        });
      }
      if (url === '/industries') {
        return Promise.resolve({ data: { data: mockIndustries } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    renderCompanyProfilePage();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Please update the company description.')).toBeInTheDocument();
    expect(screen.getByText('مطلوب تعديل بيانات')).toBeInTheDocument();
  });

  it('toggles edit mode and shows bilingual name inputs', async () => {
    renderCompanyProfilePage();

    const editButton = await screen.findByRole('button', { name: /تعديل الملف/i });
    fireEvent.click(editButton);

    expect(screen.getByRole('button', { name: /حفظ التغييرات/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^إلغاء$/ })).toBeInTheDocument();

    const nameAr = screen.getByLabelText(/اسم الشركة \(بالعربية\)/i);
    const nameEn = screen.getByLabelText(/اسم الشركة \(بالإنجليزية\)/i);
    expect(nameAr).toHaveValue('شركة مبتكرو التقنية');
    expect(nameEn).toHaveValue('Tech Innovators Co.');

    fireEvent.click(screen.getByRole('button', { name: /^إلغاء$/ }));
    expect(screen.getByRole('button', { name: /تعديل الملف/i })).toBeInTheDocument();
  });

  it('updates bilingual inputs and submits the profile payload', async () => {
    vi.mocked(api.patch).mockResolvedValueOnce({
      data: {
        data: {
          ...mockCompany,
          name: { en: 'Updated Co.', ar: 'شركة محدثة' },
          description: { en: 'Updated EN', ar: 'وصف محدث' },
        },
        message: 'تم تحديث بيانات الشركة بنجاح.',
      },
    });

    renderCompanyProfilePage();

    const editButton = await screen.findByRole('button', { name: /تعديل الملف/i });
    fireEvent.click(editButton);

    fireEvent.change(screen.getByLabelText(/اسم الشركة \(بالعربية\)/i), {
      target: { value: 'شركة محدثة' },
    });
    fireEvent.change(screen.getByLabelText(/اسم الشركة \(بالإنجليزية\)/i), {
      target: { value: 'Updated Co.' },
    });
    fireEvent.change(screen.getByLabelText(/نبذة عن الشركة \(بالعربية\)/i), {
      target: { value: 'وصف محدث' },
    });
    fireEvent.change(screen.getByLabelText(/نبذة عن الشركة \(بالإنجليزية\)/i), {
      target: { value: 'Updated EN' },
    });
    fireEvent.change(screen.getByLabelText(/رقم السجل التجاري/i), {
      target: { value: 'CR-998877' },
    });

    fireEvent.click(screen.getByRole('button', { name: /حفظ التغييرات/i }));

    await waitFor(() => {
      expect(primeCsrfCookie).toHaveBeenCalled();
      expect(api.patch).toHaveBeenCalledWith(
        '/company',
        expect.objectContaining({
          name_ar: 'شركة محدثة',
          name_en: 'Updated Co.',
          description_ar: 'وصف محدث',
          description_en: 'Updated EN',
          industry_id: 2,
          registration_number: 'CR-998877',
        })
      );
    });

    expect(await screen.findByText('تم تحديث بيانات الشركة بنجاح.')).toBeInTheDocument();
  });

  it('renders English labels when language is switched', async () => {
    renderCompanyProfilePage();

    await screen.findByRole('heading', { name: 'ملف الشركة' });
    await i18n.changeLanguage('en');

    expect(await screen.findByRole('heading', { name: 'Company Profile' })).toBeInTheDocument();
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
  });
});
