import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { useOnline } from '@/hooks/useOnline';
import { useT } from '@/i18n';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Held while offline (see useOnline). Defaults to true for type="submit". */
  needsNetwork?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent-600 text-white hover:bg-accent-700 active:bg-accent-800 shadow-soft',
  secondary: 'bg-white text-surface-800 border border-surface-200 hover:bg-surface-100',
  ghost: 'text-surface-700 hover:bg-surface-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

const sizes: Record<Size, string> = {
  // Looks 32px tall, but the invisible ::after stretches the tap area to 44px (WCAG 2.5.5).
  sm: "relative h-8 px-3 text-sm rounded-lg after:absolute after:inset-x-0 after:-inset-y-1.5 after:content-['']",
  md: 'h-10 px-4 text-sm rounded-xl',
  lg: 'h-12 px-6 text-base rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, needsNetwork, children, ...props }, ref) => {
    const online = useOnline();
    const t = useT();
    const offlineHold = (needsNetwork ?? props.type === 'submit') && !online;
    return (
    <button
      ref={ref}
      disabled={disabled || loading || offlineHold}
      title={offlineHold ? t.common.offline : props.title}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
    );
  },
);
Button.displayName = 'Button';
