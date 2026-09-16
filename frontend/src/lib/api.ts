import axios from 'axios';
import i18n from '@/i18n';

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // required for Sanctum's cookie-based SPA auth
  withXSRFToken: true, // Axios 1.x: explicitly send the XSRF-TOKEN cookie as X-XSRF-TOKEN header
  headers: { Accept: 'application/json' },
});

// Attach active language to every request so backend returns localized validation/error messages
api.interceptors.request.use((config) => {
  const currentLang =
    i18n.language ||
    (typeof document !== 'undefined' ? document.documentElement.lang : 'ar') ||
    'ar';
  const locale = currentLang.startsWith('ar') ? 'ar' : 'en';
  config.headers['Accept-Language'] = locale;
  config.headers['X-Locale'] = locale;
  return config;
});

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler) => {
  unauthorizedHandler = handler;
};

/**
 * Centralized 401 response handler.
 *
 * When the server returns 401 on any non-auth endpoint (session expired or
 * invalidated server-side), we invoke the registered handler to reset Redux
 * auth state. React Router's <ProtectedRoute> will then redirect to /login
 * seamlessly with zero flash.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login') &&
      !error.config?.url?.includes('/auth/logout') &&
      !error.config?.url?.includes('/auth/me') &&
      !error.config?.url?.includes('/auth/forgot-password') &&
      !error.config?.url?.includes('/auth/reset-password')
    ) {
      if (unauthorizedHandler) {
        unauthorizedHandler();
      } else if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Sanctum requires priming the CSRF cookie before the first
// state-changing request in a session — call this once before login/
// register, not on every request.
export const primeCsrfCookie = () =>
  axios.get('/sanctum/csrf-cookie', {
    baseURL: '/',
    withCredentials: true,
  });
