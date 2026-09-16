import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface SelectContextType {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  disabled?: boolean;
  registerOption: (value: string, label: React.ReactNode) => void;
  unregisterOption: (value: string) => void;
  optionLabels: Record<string, React.ReactNode>;
}

const SelectContext = React.createContext<SelectContextType | null>(null);

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({
  value: controlledValue,
  defaultValue,
  onValueChange,
  disabled,
  children,
}) => {
  const [internalValue, setInternalValue] = React.useState<string>(defaultValue || '');
  const [open, setOpen] = React.useState(false);
  const [optionLabels, setOptionLabels] = React.useState<Record<string, React.ReactNode>>({});
  const selectRef = React.useRef<HTMLDivElement>(null);

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  const registerOption = React.useCallback((optValue: string, label: React.ReactNode) => {
    setOptionLabels((prev) => {
      if (prev[optValue] === label) return prev;
      return { ...prev, [optValue]: label };
    });
  }, []);

  const unregisterOption = React.useCallback((optValue: string) => {
    setOptionLabels((prev) => {
      if (!(optValue in prev)) return prev;
      const copy = { ...prev };
      delete copy[optValue];
      return copy;
    });
  }, []);

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (controlledValue === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
      setOpen(false);
    },
    [controlledValue, onValueChange]
  );

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <SelectContext.Provider
      value={{
        value,
        onValueChange: handleValueChange,
        open,
        setOpen,
        disabled,
        registerOption,
        unregisterOption,
        optionLabels,
      }}
    >
      <div ref={selectRef} className="relative inline-block w-full">
        {children}
      </div>
    </SelectContext.Provider>
  );
};

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectTrigger must be used within Select');

  return (
    <button
      type="button"
      ref={ref}
      disabled={context.disabled}
      onClick={() => context.setOpen((prev) => !prev)}
      className={cn(
        'flex h-9 w-full items-center justify-between rounded-md border border-border-input bg-surface px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-foreground-muted focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 text-foreground aria-invalid:border-destructive aria-invalid:focus:ring-destructive',
        className
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
    </button>
  );
});
SelectTrigger.displayName = 'SelectTrigger';

interface SelectValueProps {
  placeholder?: string;
  children?: React.ReactNode;
}

const SelectValue: React.FC<SelectValueProps> = ({ placeholder, children }) => {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectValue must be used within Select');

  const registeredLabel =
    context.value !== undefined && context.value !== ''
      ? context.optionLabels[context.value]
      : undefined;
  const displayContent =
    children ??
    registeredLabel ??
    placeholder ??
    (context.value && context.value !== '' ? context.value : '') ??
    '';
  const isPlaceholder = !children && !registeredLabel;

  return (
    <span className={cn('block truncate', isPlaceholder && 'text-foreground-muted')}>
      {displayContent}
    </span>
  );
};

const SelectContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    if (!context) throw new Error('SelectContent must be used within Select');

    return (
      <div
        ref={ref}
        className={cn(
          'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-surface p-1 text-foreground shadow-md animate-in fade-in-80',
          !context.open && 'hidden',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SelectContent.displayName = 'SelectContent';

export interface SelectItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  disabled?: boolean;
}

const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, value, disabled, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    if (!context) throw new Error('SelectItem must be used within Select');

    const isSelected = context.value === value;

    const { registerOption, unregisterOption } = context;

    React.useEffect(() => {
      registerOption(value, children);
      return () => {
        unregisterOption(value);
      };
    }, [registerOption, unregisterOption, value, children]);

    return (
      <div
        ref={ref}
        role="option"
        aria-selected={isSelected}
        onClick={() => {
          if (!disabled) {
            context.onValueChange?.(value);
          }
        }}
        className={cn(
          'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none transition-colors hover:bg-surface-hover hover:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50',
          isSelected && 'bg-surface-secondary font-medium text-university-primary',
          disabled && 'pointer-events-none opacity-50',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SelectItem.displayName = 'SelectItem';

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
