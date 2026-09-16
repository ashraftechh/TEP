import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
  isRtl?: boolean;
}

const toastStyles: Record<
  ToastType,
  {
    bg: string;
    border: string;
    text: string;
    icon: React.ComponentType<{ className?: string }>;
    iconColor: string;
  }
> = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/80',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-900 dark:text-emerald-100',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/80',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-900 dark:text-blue-100',
    icon: Info,
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/80',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-900 dark:text-amber-100',
    icon: AlertTriangle,
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-950/80',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-900 dark:text-red-100',
    icon: AlertCircle,
    iconColor: 'text-red-600 dark:text-red-400',
  },
};

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss, isRtl = false }) => {
  const { id, type, title, message } = toast;
  const config = toastStyles[type] || toastStyles.info;
  const Icon = config.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      dir={isRtl ? 'rtl' : 'ltr'}
      className={cn(
        'flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-300 pointer-events-auto',
        'animate-in fade-in slide-in-from-top-2 sm:slide-in-from-top-4 max-w-sm sm:max-w-md w-full',
        config.bg,
        config.border
      )}
    >
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', config.iconColor)} />
      <div className="flex-1 min-w-0">
        {title && <h4 className={cn('text-sm font-semibold mb-0.5', config.text)}>{title}</h4>}
        <p className={cn('text-sm leading-relaxed', config.text)}>{message}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        className={cn(
          'p-1 rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/10 shrink-0 cursor-pointer',
          config.text
        )}
      >
        <X className="h-4 w-4 opacity-70 hover:opacity-100" />
      </button>
    </div>
  );
};
