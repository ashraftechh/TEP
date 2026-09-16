import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store';
import { logoutUser } from '@/store/slices/authSlice';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Logo } from '@/components/Logo';
import { LogOut, LayoutDashboard, User as UserIcon, Languages } from 'lucide-react';

export const AppNavbar: React.FC = () => {
  const { t, i18n } = useTranslation('auth');
  const isArabic = i18n.language === 'ar';
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { user, status } = useAppSelector((state) => state.auth);
  const isLoggingOut = status === 'loading';

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login');
  };

  const toggleLanguage = () => {
    const nextLang = isArabic ? 'en' : 'ar';
    i18n.changeLanguage(nextLang);
  };

  const isCurrentPath = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-surface/95 backdrop-blur-md shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
            <Logo />
          </Link>

          {/* Navigation Links */}
          <nav className="hidden sm:flex items-center gap-1">
            <Link
              to="/dashboard"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isCurrentPath('/dashboard')
                  ? 'bg-university-primary/10 text-university-primary dark:text-university-secondary font-semibold'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{t('nav.dashboard')}</span>
            </Link>

            <Link
              to="/profile"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                isCurrentPath('/profile')
                  ? 'bg-university-primary/10 text-university-primary dark:text-university-secondary font-semibold'
                  : 'text-foreground-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <UserIcon className="w-4 h-4" />
              <span>{t('nav.profile')}</span>
            </Link>
          </nav>
        </div>

        {/* Right: Controls, User Info & Logout Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user && (
            <div className="hidden md:flex flex-col text-end rtl:text-start leading-tight">
              <span className="text-xs font-semibold text-foreground truncate max-w-[150px]">
                {user.name}
              </span>
              <span className="text-[10px] text-foreground-muted truncate max-w-[150px] font-mono">
                {user.email}
              </span>
            </div>
          )}

          {/* Mobile Profile Link */}
          <Link
            to="/profile"
            className="sm:hidden p-2 text-foreground-muted hover:text-foreground rounded-lg hover:bg-surface-hover cursor-pointer"
            aria-label={t('nav.profile')}
          >
            <UserIcon className="w-4 h-4" />
          </Link>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Language Switcher */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 cursor-pointer border-border bg-surface hover:bg-surface-hover text-foreground h-9 px-2.5 sm:px-3 text-xs shadow-xs"
            aria-label="Toggle language"
          >
            <Languages className="h-4 w-4 text-foreground-muted" />
            <span className="text-xs font-semibold uppercase hidden sm:inline">
              {isArabic ? 'English' : 'العربية'}
            </span>
          </Button>

          {/* Logout Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-1.5 cursor-pointer text-error hover:text-error hover:bg-error/10 border-error/20 h-9 px-3 text-xs font-medium transition-colors shadow-xs"
            aria-label={t('nav.logout')}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">
              {isLoggingOut ? t('nav.loggingOut') : t('nav.logout')}
            </span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppNavbar;
