import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshActive?: () => void;
}

/**
 * MobileSidebarDrawer — slide-in overlay for the sidebar on mobile/tablet.
 *
 * Renders the full AppSidebar inside a sheet-style drawer triggered by the
 * AppHeader hamburger button. Closes on:
 *  • Close button click
 *  • Backdrop click
 *  • Navigation (via onNavigate prop forwarded to AppSidebar)
 *  • Escape key
 */
export const MobileSidebarDrawer: React.FC<MobileSidebarDrawerProps> = ({
  isOpen,
  onClose,
  onRefreshActive,
}) => {
  const { i18n } = useTranslation('auth');
  const isRTL = (i18n.language || 'ar') === 'ar';

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Prevent background scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={cn(
          'fixed inset-y-0 inset-s-0 z-50 flex flex-col w-72 max-w-[85vw] shadow-2xl transition-transform duration-300 ease-in-out lg:hidden bg-surface',
          isOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'
        )}
        dir={isRTL ? 'rtl' : 'ltr'}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Drawer header — close button only */}
        <div className="flex items-center justify-end px-4 h-14 border-b border-border shrink-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar content — never collapsed in drawer */}
        <div className="flex-1 overflow-y-auto">
          <AppSidebar
            isCollapsed={false}
            onToggleCollapse={() => {}}
            onNavigate={onClose}
            onRefreshActive={onRefreshActive}
            hideCollapseToggle
          />
        </div>
      </div>
    </>
  );
};

export default MobileSidebarDrawer;
