import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';

/**
 * Reafirma docs/frontend/14-dashboard.md-a-ser-implementado (ainda não
 * existe — ver docs/frontend/03-rotas.md §3.3): cada bloco do Dashboard é
 * um `Card` independente com seu próprio loading/erro/vazio — uma falha
 * num card nunca bloqueia os demais, porque cada um usa sua própria
 * `useQuery`. O selo "Dados reais"/"Mock" torna explícito qual fonte
 * alimenta o card, exigência literal do Prompt 6C §2.
 */
export function DashboardCard({
  title,
  source,
  isLoading,
  isError,
  onRetry,
  isEmpty,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  action,
  children,
}: {
  title: string;
  source: 'real' | 'mock';
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        <Badge variant={source === 'real' ? 'success' : 'outline'} className="shrink-0">
          {source === 'real' ? 'Dados reais' : 'Mock'}
        </Badge>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}
        {!isLoading && isError && <ErrorState onRetry={onRetry} />}
        {!isLoading && !isError && isEmpty && (
          <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
        )}
        {!isLoading && !isError && !isEmpty && children}
      </CardContent>
      {action}
    </Card>
  );
}
