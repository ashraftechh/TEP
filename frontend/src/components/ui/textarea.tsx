import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    const isInvalid = !!error || props['aria-invalid'] === true || props['aria-invalid'] === 'true';

    return (
      <textarea
        aria-invalid={isInvalid}
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border bg-surface px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-foreground-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150',
          isInvalid ? 'border-destructive focus-visible:ring-destructive' : 'border-border',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
