import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store';
import { logoutUser } from '@/store/slices/authSlice';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const UserNavDropdown: React.FC = () => {
  const { t, i18n } = useTranslation('profile');
  const isArabic = (i18n.language || 'ar') === 'ar';
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, status } = useAppSelector((state) => state.auth);
  const isLoggingOut = status === 'loading';

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
    : 'أما';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    setIsOpen(false);
    await dispatch(logoutUser());
    navigate('/login');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-university-primary/20 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-university-primary"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User menu"
      >
        <Avatar className="h-9 w-9 ring-1 ring-border">
          {user?.avatar_url && (
            <AvatarImage src={user.avatar_url} alt={user.name} className="object-cover" />
          )}
          <AvatarFallback className="bg-university-primary/10 text-university-primary text-xs font-bold">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-foreground-muted transition-transform duration-200 hidden sm:block',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={cn(
            'absolute inset-e-0 mt-2 w-56 rounded-xl bg-surface border border-border shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150',
            isArabic ? 'text-right' : 'text-left'
          )}
          role="menu"
          aria-orientation="vertical"
        >
          {/* User header */}
          {user && (
            <div className="px-4 py-2.5 border-b border-border">
              <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
              <p className="text-xs text-foreground-muted truncate font-mono mt-0.5">
                {user.email}
              </p>
            </div>
          )}

          {/* Menu links */}
          <div className="py-1">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-surface-hover hover:text-university-primary transition-colors cursor-pointer"
              role="menuitem"
            >
              <User className="h-4 w-4 text-foreground-muted shrink-0" />
              <span>{t('nav.profile')}</span>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer text-start disabled:opacity-50"
              role="menuitem"
            >
              <LogOut className={cn('h-4 w-4 shrink-0', isArabic && 'scale-x-[-1]')} />
              <span>{isLoggingOut ? t('nav.loggingOut') : t('nav.logout')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserNavDropdown;
