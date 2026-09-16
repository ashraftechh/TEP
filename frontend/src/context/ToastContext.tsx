import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Toast, type ToastMessage, type ToastType } from '@/components/ui/toast';
import { useTranslation } from 'react-i18next';

export interface ToastOptions {
  type?: ToastType;
  title?: string;
  duration?: number;
}

export interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (message: string, options?: ToastOptions) => string;
  success: (message: string, title?: string, duration?: number) => string;
  error: (message: string, title?: string, duration?: number) => string;
  info: (message: string, title?: string, duration?: number) => string;
  warning: (message: string, title?: string, duration?: number) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const DEFAULT_DURATION = 4000;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, options?: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = options?.duration ?? DEFAULT_DURATION;

      const newToast: ToastMessage = {
        id,
        message,
        type: options?.type || 'info',
        title: options?.title,
        duration,
      };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast]
  );

  const success = useCallback(
    (message: string, title?: string, duration?: number) =>
      showToast(message, { type: 'success', title, duration }),
    [showToast]
  );

  const error = useCallback(
    (message: string, title?: string, duration?: number) =>
      showToast(message, { type: 'error', title, duration }),
    [showToast]
  );

  const info = useCallback(
    (message: string, title?: string, duration?: number) =>
      showToast(message, { type: 'info', title, duration }),
    [showToast]
  );

  const warning = useCallback(
    (message: string, title?: string, duration?: number) =>
      showToast(message, { type: 'warning', title, duration }),
    [showToast]
  );

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      success,
      error,
      info,
      warning,
      dismissToast,
    }),
    [toasts, showToast, success, error, info, warning, dismissToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Notification Container with Logical Positioning */}
      <aside
        aria-label="Notifications"
        className="fixed top-4 end-4 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none p-2 sm:p-0"
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} isRtl={isRtl} />
        ))}
      </aside>
    </ToastContext.Provider>
  );
};

const fallbackToastContext: ToastContextType = {
  toasts: [],
  showToast: () => 'fallback-id',
  success: () => 'fallback-id',
  error: () => 'fallback-id',
  info: () => 'fallback-id',
  warning: () => 'fallback-id',
  dismissToast: () => {},
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    return fallbackToastContext;
  }
  return context;
};
