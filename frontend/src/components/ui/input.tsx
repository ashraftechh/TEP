import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, dir, ...props }, ref) => {
    const isInvalid = !!error || props['aria-invalid'] === true || props['aria-invalid'] === 'true';
    const resolvedDir = type === 'date' ? (dir ?? 'ltr') : dir;
    const resolvedLang = type === 'date' ? 'en' : undefined;

    return (
      <input
        type={type}
        dir={resolvedDir}
        lang={resolvedLang}
        aria-invalid={isInvalid}
        className={cn(
          'flex h-9 w-full rounded-md border bg-surface px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50',
          isInvalid
            ? 'border-destructive focus-visible:ring-destructive'
            : 'border-border-input focus-visible:ring-ring',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
