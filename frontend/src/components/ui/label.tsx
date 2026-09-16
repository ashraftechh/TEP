import * as React from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70 inline-block mb-1.5',
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="text-destructive ms-1 font-semibold" aria-hidden="true">
          *
        </span>
      )}
    </label>
  )
);
Label.displayName = 'Label';

export { Label };
