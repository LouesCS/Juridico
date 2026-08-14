'use client';

import { HardDrive } from 'lucide-react';
import { useDocumentsDashboardSummary } from '@/features/documents/api/queries';
import { formatBytes } from '@/features/documents/domain/file-meta';
import { DashboardCard } from './dashboard-card';

/** Real desde a Sprint 09 — reaproveita `GET /documents/dashboard-summary`. Quota por plano é um placeholder de produto (nenhum módulo de billing real ainda define isso). */
export function StorageIndicatorCard() {
  const { data, isLoading, isError, refetch } = useDocumentsDashboardSummary();
  const armazenamento = data?.armazenamento;

  return (
    <DashboardCard
      title="Armazenamento"
      source="real"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      isEmpty={false}
      emptyIcon={HardDrive}
      emptyTitle="Sem dados de armazenamento"
    >
      {armazenamento && (
        <div className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, armazenamento.percentualUsado)}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatBytes(armazenamento.bytesUsados)} de {formatBytes(armazenamento.bytesQuota)} usados (
            {armazenamento.percentualUsado}%)
          </p>
          <p className="text-xs text-muted-foreground">{data?.totalDocumentos ?? 0} documentos no total</p>
        </div>
      )}
    </DashboardCard>
  );
}
