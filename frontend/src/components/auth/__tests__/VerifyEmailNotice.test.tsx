import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { VerifyEmailNotice } from '../VerifyEmailNotice';
import i18n from '@/i18n';

describe('VerifyEmailNotice Component', () => {
  it('renders confirmation screen in Arabic with email address', async () => {
    await i18n.changeLanguage('ar');
    render(<VerifyEmailNotice email="student@example.com" showResend={true} />);

    expect(screen.getByText('تحقق من بريدك الإلكتروني')).toBeInTheDocument();
    expect(screen.getByText('student@example.com')).toBeInTheDocument();
    // Logout button (uses nav.logout translation key)
    expect(screen.getByRole('button', { name: /تسجيل الخروج/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /إعادة إرسال/i })).toBeInTheDocument();
  });

  it('renders confirmation screen in English', async () => {
    await i18n.changeLanguage('en');
    render(<VerifyEmailNotice email="company@example.com" showResend={true} />);

    expect(screen.getByText('Check Your Email')).toBeInTheDocument();
    expect(screen.getByText('company@example.com')).toBeInTheDocument();
    // Logout button
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
    // Resend button
    expect(screen.getByRole('button', { name: /resend verification link/i })).toBeInTheDocument();
  });

  it('triggers onLogout callback when logout button is clicked', async () => {
    await i18n.changeLanguage('en');
    const onLogoutMock = vi.fn();
    render(<VerifyEmailNotice email="user@example.com" onLogout={onLogoutMock} />);

    const logoutButton = screen.getByRole('button', { name: /log out/i });
    fireEvent.click(logoutButton);

    expect(onLogoutMock).toHaveBeenCalledTimes(1);
  });

  it('triggers onBackToLogin callback (via logout handler fallback) when no onLogout provided', async () => {
    await i18n.changeLanguage('en');
    const onBackToLoginMock = vi.fn();
    render(<VerifyEmailNotice email="user@example.com" onBackToLogin={onBackToLoginMock} />);

    const logoutButton = screen.getByRole('button', { name: /log out/i });
    fireEvent.click(logoutButton);

    expect(onBackToLoginMock).toHaveBeenCalledTimes(1);
  });

  it('handles resend email action and shows success status', async () => {
    await i18n.changeLanguage('en');
    const onResendMock = vi.fn().mockResolvedValue(undefined);
    render(<VerifyEmailNotice email="user@example.com" onResendEmail={onResendMock} />);

    const resendBtn = screen.getByRole('button', { name: /resend verification link/i });
    fireEvent.click(resendBtn);

    await waitFor(() => {
      expect(onResendMock).toHaveBeenCalledTimes(1);
      expect(
        screen.getByText(/A new verification link has been sent to your email address/i)
      ).toBeInTheDocument();
    });
  });
});
