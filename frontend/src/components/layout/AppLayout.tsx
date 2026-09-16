import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { MobileSidebarDrawer } from '@/components/layout/MobileSidebarDrawer';

/**
 * AppLayout — top-level application shell.
 *
 * Structure:
 * ┌─────────────────────────────────────────────────────────┐
 * │   Header: Logo (university), App Title, Lang, Theme,    │
 * │           User Avatar Dropdown                          │
 * ├──────────────┬──────────────────────────────────────────┤
 * │   Sidebar    │       <Outlet />                         │
 * │   (sticky)   │       (page content, window scrolls)     │
 * └──────────────┴──────────────────────────────────────────┘
 *
 * Header stays fixed at top (sticky top-0, h-16, z-30).
 * Sidebar stays sticky just below the header (top-16).
 * Main content grows naturally and the whole window scrolls.
 *
 * On mobile the sidebar is hidden; the AppHeader's hamburger opens a
 * MobileSidebarDrawer instead.
 *
 * Used as a layout route in react-router:
 *   <Route element={<ProtectedRoute />}>
 *     <Route element={<AppLayout />}>
 *       <Route path="/dashboard" element={<DashboardPage />} />
 *       <Route path="/profile"   element={<ProfilePage />} />
 *     </Route>
 *   </Route>
 */
const AppLayout: React.FC = () => {
  const { i18n } = useTranslation('auth');
  const isRTL = (i18n.language || 'ar') === 'ar';
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const location = useLocation();

  const handleRefreshActive = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div
      className="min-h-screen bg-surface-secondary text-foreground transition-colors duration-200"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Top header — sticky, stays at top on window scroll */}
      <AppHeader onMobileMenuOpen={() => setIsMobileOpen(true)} />

      <div className="flex">
        {/* Desktop sidebar — sticky below header, viewport-height, scrolls independently */}
        <div
          className={`hidden lg:flex shrink-0 sticky top-16 self-start h-[calc(100vh-4rem)] transition-all duration-300 ${isSidebarCollapsed ? 'w-18' : 'w-64'}`}
        >
          <AppSidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}
            onRefreshActive={handleRefreshActive}
          />
        </div>

        {/* Mobile sidebar drawer */}
        <MobileSidebarDrawer
          isOpen={isMobileOpen}
          onClose={() => setIsMobileOpen(false)}
          onRefreshActive={handleRefreshActive}
        />

        {/* Main content — grows naturally, the whole window scrolls */}
        <main className="flex-1 min-w-0 outline-none" id="main-content" tabIndex={-1}>
          <Outlet key={`${location.pathname}-${refreshKey}`} />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
