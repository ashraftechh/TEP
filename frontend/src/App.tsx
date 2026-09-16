import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Provider } from 'react-redux';
import { store } from '@/store';
import { resetAuthState } from '@/store/slices/authSlice';
import { setUnauthorizedHandler } from '@/lib/api';
import { ThemeProvider } from '@/context/ThemeContext';
import { ToastProvider } from '@/context/ToastContext';

// Wire up global 401 unauthorized handler to synchronize Redux state
setUnauthorizedHandler(() => {
  store.dispatch(resetAuthState());
});

// Auth infrastructure
import { AuthInitializer } from '@/components/auth/AuthInitializer';
import { ProtectedRoute } from '@/components/routing/ProtectedRoute';
import { GuestRoute } from '@/components/routing/GuestRoute';
import { CompleteRegistrationRoute } from '@/components/routing/CompleteRegistrationRoute';
import { PermissionRoute } from '@/components/routing/PermissionRoute';

// Authenticated application shell
import AppLayout from '@/components/layout/AppLayout';

// Pages
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { CompleteRegistrationPage } from '@/pages/CompleteRegistrationPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { OAuthCallbackPage } from '@/pages/OAuthCallbackPage';
import { RegisterCompanyPage } from '@/pages/RegisterCompanyPage';
import { CompanyJoinPage } from '@/pages/CompanyJoinPage';
import { CompanyTeamPage } from '@/pages/CompanyTeamPage';
import { CompanyProfilePage } from '@/pages/CompanyProfilePage';
import { OpportunitiesPage } from '@/pages/OpportunitiesPage';
import { OpportunityDetailsPage } from '@/pages/OpportunityDetailsPage';
import { MyApplicationsPage } from '@/pages/MyApplicationsPage';
import { ApplicationHistoryPage } from '@/pages/ApplicationHistoryPage';
import { CompanyApplicationsPage } from '@/pages/CompanyApplicationsPage';
import { TrainingAssignmentsPage } from '@/pages/TrainingAssignmentsPage';
import { ReportsPage } from '@/pages/ReportsPage';

/**
 * Route Architecture
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * AuthInitializer  — Calls GET /auth/me once on app mount. Renders a full-screen
 *                    loading screen until the check completes (isInitializing).
 *                    This is the ONLY place the startup session check happens.
 *
 * GuestRoute       — Redirects authenticated users to /dashboard.
 *                    Routes: /, /login, /register
 *
 * ProtectedRoute   — Redirects unauthenticated users to /login.
 *                    Routes: /dashboard, /profile (wrapped in AppLayout)
 *
 * CompleteRegistrationRoute — Only accessible to authenticated users with
 *                    status=incomplete. All others are redirected.
 *
 * Public routes    — Accessible to both guests and authenticated users.
 *                    Routes: /verify-email, /forgot-password, /reset-password
 *
 * Route Access Matrix:
 * ┌──────────────────────────┬───────┬───────────────┬──────────────────────┐
 * │ Route                    │ Guest │ Authenticated │ Guard                │
 * ├──────────────────────────┼───────┼───────────────┼──────────────────────┤
 * │ /                        │ ✅    │ → /dashboard  │ GuestRoute           │
 * │ /login                   │ ✅    │ → /dashboard  │ GuestRoute           │
 * │ /register                │ ✅    │ → /dashboard  │ GuestRoute           │
 * │ /forgot-password         │ ✅    │ ✅            │ Public               │
 * │ /reset-password          │ ✅    │ ✅            │ Public               │
 * │ /verify-email            │ ✅    │ ✅            │ Public               │
 * │ /verify-email/:id/:hash  │ ✅    │ ✅            │ Public               │
 * │ /companies/join/:company │ ✅    │ ✅            │ Public (signed URL)  │
 * │ /complete-registration   │ → /login │ incomplete only │ CompleteRegistrationRoute │
 * │ /dashboard               │ → /login │ ✅          │ ProtectedRoute       │
 * │ /profile                 │ → /login │ ✅          │ ProtectedRoute       │
 * │ *                        │ → /login │ → /dashboard│ Catch-all fallback   │
 * └──────────────────────────┴───────┴───────────────┴──────────────────────┘
 */
export function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <ToastProvider>
          <BrowserRouter>
            {/*
             * AuthInitializer must be inside BrowserRouter (it renders
             * children as routes) but wraps all Routes so it can block
             * rendering until the session check is complete.
             */}
            <AuthInitializer>
              <Routes>
                {/* ── Guest-only routes ─────────────────────────────────── */}
                <Route element={<GuestRoute />}>
                  <Route path="/" element={<LoginPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                </Route>

                {/* ── Public routes (guest + authenticated) ─────────────── */}
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/verify-email/:id/:hash" element={<VerifyEmailPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
                <Route path="/register-company" element={<RegisterCompanyPage />} />
                <Route path="/companies/join/:company" element={<CompanyJoinPage />} />

                {/* ── Complete Registration (authenticated + incomplete) ─── */}
                <Route element={<CompleteRegistrationRoute />}>
                  <Route path="/complete-registration" element={<CompleteRegistrationPage />} />
                </Route>

                {/* ── Protected routes (authenticated + AppLayout shell) ─── */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/profile" element={<ProfilePage />} />

                    {/* Opportunities viewing */}
                    <Route element={<PermissionRoute permission="opportunities.view_any" />}>
                      <Route path="/opportunities" element={<OpportunitiesPage />} />
                    </Route>
                    <Route element={<PermissionRoute permission="opportunities.view" />}>
                      <Route path="/opportunities/:id" element={<OpportunityDetailsPage />} />
                    </Route>

                    {/* My Applications — student own list (TEP-636/637) */}
                    <Route element={<PermissionRoute permission="applications.own.view" />}>
                      <Route path="/my-applications" element={<MyApplicationsPage />} />
                      {/* Application History / Timeline (TEP-657/658) — destination of
                          MyApplicationsPage's "View History" button */}
                      <Route
                        path="/applications/:id/history"
                        element={<ApplicationHistoryPage />}
                      />
                    </Route>

                    {/* Company Profile (requires companies.own.update) */}
                    <Route element={<PermissionRoute permission="companies.own.update" />}>
                      <Route path="/company" element={<Navigate to="/company/profile" replace />} />
                      <Route path="/company/profile" element={<CompanyProfilePage />} />
                    </Route>

                    {/* Company Team (requires company_representatives.own.view) */}
                    <Route
                      element={<PermissionRoute permission="company_representatives.own.view" />}
                    >
                      <Route path="/company/team" element={<CompanyTeamPage />} />
                    </Route>

                    {/* Company Applications review */}
                    <Route element={<PermissionRoute permission="applications.company.view" />}>
                      <Route path="/company/applications" element={<CompanyApplicationsPage />} />
                    </Route>

                    {/* TEP-666 — one route, role-aware component: renders the
                        company/supervisor list view or the student's own
                        single-placement view depending on who's logged in.
                        training_assignments.own.view covers all 3 frontend
                        roles (student/academic_supervisor/company_representative)
                        per the seeded permission catalog — training_coordinator/
                        super_admin are Filament-only (see FRONTEND_ROLES) and
                        never reach this route. */}
                    <Route element={<PermissionRoute permission="training_assignments.own.view" />}>
                      <Route path="/training-assignments" element={<TrainingAssignmentsPage />} />
                    </Route>

                    {/* Reports — student reports & drafting (TEP-674/675) */}
                    <Route
                      element={
                        <PermissionRoute anyPermissions={['reports.own.view', 'reports.review']} />
                      }
                    >
                      <Route path="/reports" element={<ReportsPage />} />
                    </Route>
                  </Route>
                </Route>

                {/* ── Catch-all fallback ────────────────────────────────── */}
                {/*
                 * Unknown URLs redirect to /login for guests (ProtectedRoute
                 * will handle) and /dashboard for authenticated users.
                 * We use /login here; ProtectedRoute is not wrapping this, so
                 * we simply redirect everyone to /login — GuestRoute will then
                 * forward authenticated users to /dashboard.
                 */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </AuthInitializer>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </Provider>
  );
}

export default App;
