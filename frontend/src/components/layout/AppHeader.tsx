import React from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { UserNavDropdown } from '@/components/layout/UserNavDropdown';
import { Bell, Menu } from 'lucide-react';

interface AppHeaderProps {
  onMobileMenuOpen: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onMobileMenuOpen }) => {
  const { i18n } = useTranslation('auth');
  const isRTL = (i18n.language || 'ar') === 'ar';

  return (
    <header
      className="sticky top-0 z-40 h-16 flex items-center justify-between px-4 sm:px-8 bg-surface/95 backdrop-blur-md border-b border-border shrink-0 transition-colors duration-200 shadow-xs"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── Start: Brand Lockup & Mobile Menu ─────────────────────────── */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
        <button
          onClick={onMobileMenuOpen}
          className="lg:hidden p-2 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer shrink-0"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link to="/dashboard" className="flex items-center min-w-0 shrink-0">
          <Logo size="md" showSubtitle={true} hideTextOnMobile={true} />
        </Link>
      </div>

      {/* ── End: Language Switcher, Theme Toggle, Notifications, User Avatar Dropdown (last) ── */}
      <div className="flex items-center gap-1.5 sm:gap-3.5 shrink-0">
        {/* 1. Language Switcher */}
        <LanguageSwitcher />

        {/* 2. Theme Toggle */}
        <ThemeToggle />

        {/* 3. Notification Bell with Red Badge */}
        <button
          type="button"
          className="relative p-2 rounded-full text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-foreground" />
          <span className="absolute top-1 -end-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
            3
          </span>
        </button>

        {/* 4. User circular avatar with Dropdown menu (LAST one in navbar order) */}
        <UserNavDropdown />
      </div>
    </header>
  );
};

export default AppHeader;
