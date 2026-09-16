import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DialogContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextType | undefined>(undefined);

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open = false, onOpenChange, children }) => {
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange?.(newOpen);
  };

  return (
    <DialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

export interface DialogTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const DialogTrigger: React.FC<DialogTriggerProps> = ({ children, onClick }) => {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error('DialogTrigger must be used within a Dialog');

  const handleClick = () => {
    onClick?.();
    context.onOpenChange(true);
  };

  if (React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
    return React.cloneElement(child, {
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e);
        handleClick();
      },
    });
  }

  return (
    <button type="button" onClick={handleClick}>
      {children}
    </button>
  );
};

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  dir?: 'rtl' | 'ltr' | 'auto';
}

export const DialogContent: React.FC<DialogContentProps> = ({
  children,
  className,
  dir,
  ...props
}) => {
  const context = React.useContext(DialogContext);
  if (!context) throw new Error('DialogContent must be used within a Dialog');

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && context.open) {
        context.onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [context]);

  if (!context.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={() => context.onOpenChange(false)}
        aria-hidden="true"
      />
      {/* Dialog container */}
      <div
        role="dialog"
        aria-modal="true"
        dir={dir}
        className={cn(
          'relative z-50 w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-2xl transition-all duration-200 animate-in fade-in zoom-in-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100',
          className
        )}
        {...props}
      >
        <button
          type="button"
          onClick={() => context.onOpenChange(false)}
          className="absolute top-4 right-4 rtl:right-auto rtl:left-4 rounded-sm p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none cursor-pointer"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </div>
  );
};

export const DialogHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => <div className={cn('flex flex-col space-y-1.5 text-start mb-4', className)}>{children}</div>;

export const DialogTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <h2
    className={cn(
      'text-lg font-semibold leading-none tracking-tight text-gray-900 dark:text-white',
      className
    )}
  >
    {children}
  </h2>
);

export const DialogDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => <p className={cn('text-sm text-gray-500 dark:text-gray-400', className)}>{children}</p>;

export const DialogFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 mt-6',
      className
    )}
  >
    {children}
  </div>
);
