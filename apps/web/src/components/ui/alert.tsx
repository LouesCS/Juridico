import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const alertVariants = cva('flex gap-3 rounded-md border p-3 text-sm', {
  variants: {
    variant: {
      default: 'border-border bg-muted text-foreground',
      destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
      warning: 'border-warning/30 bg-warning-subtle text-warning',
      success: 'border-success/30 bg-success-subtle text-success',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
  ),
);
Alert.displayName = 'Alert';

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('font-medium', className)} {...props} />;
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm opacity-90', className)} {...props} />;
}
