import React from 'react';
import { GraduationCap } from 'lucide-react';

/**
 * Full-screen loading screen displayed while the app performs its initial
 * /auth/me session check (isInitializing === true). Prevents any protected
 * or guest page from rendering before auth state is known.
 */
export const AppLoadingScreen: React.FC = () => (
  <div
    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface-secondary"
    aria-label="Loading application"
    role="status"
  >
    <div className="flex flex-col items-center gap-4">
      {/* Brand badge with pulse animation */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-university-primary flex items-center justify-center shadow-lg animate-pulse">
          <GraduationCap className="h-8 w-8 text-white" />
        </div>
        {/* Spinner ring */}
        <div className="absolute -inset-1.5 rounded-[18px] border-2 border-university-primary/30 border-t-university-primary animate-spin" />
      </div>

      {/* Platform name */}
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-foreground">منصة التدريب التعاوني</p>
        <p className="text-xs text-foreground-muted">Cooperative Training Platform</p>
      </div>
    </div>
  </div>
);

export default AppLoadingScreen;
