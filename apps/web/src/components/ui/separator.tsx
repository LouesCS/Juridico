import * as React from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Sem dependência do Radix — `@radix-ui/react-separator` não está instalado
 * nesta rodada e um separador visual não precisa de estado/interação;
 * `role="separator"` manual cobre a mesma semântica de acessibilidade.
 */
export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = 'horizontal', ...props }, ref) => (
    <div
      ref={ref}
      role="separator"
      aria-orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  ),
);
Separator.displayName = 'Separator';
