import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-university-primary text-white hover:bg-university-secondary shadow-sm',
        secondary: 'border-border bg-surface-secondary text-foreground hover:bg-surface-hover',
        destructive:
          'border-transparent bg-destructive text-white hover:bg-destructive/90 shadow-sm',
        outline: 'text-foreground border-border bg-surface',
        success:
          'border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export type BadgeProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };
