import { cn } from '@/lib/utils/cn';

/**
 * Reafirma docs/frontend/13-design-system.md §13.4 — usado só para
 * carregamentos >300ms (docs/ux/09-busca-global.md §9.13); abaixo disso,
 * indicador discreto em vez de skeleton.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'skeleton-shimmer rounded-md motion-safe:[animation:shimmer_1.6s_ease-in-out_infinite] motion-reduce:animate-pulse motion-reduce:bg-muted',
        className,
      )}
      role="status"
      aria-label="Carregando"
      {...props}
    />
  );
}
