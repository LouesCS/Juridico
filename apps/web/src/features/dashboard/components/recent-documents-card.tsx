'use client';

import Link from 'next/link';
import { FileText, Star } from 'lucide-react';
import { useDocumentsDashboardSummary } from '@/features/documents/api/queries';
import { DashboardCard } from './dashboard-card';

/**
 * Real desde a Sprint 09 — reaproveita `GET /documents/dashboard-summary`
 * (agregado real, mesmo racional de `GET /deadlines`/`GET /timeline`).
 * "Uploads recentes"/"Últimos arquivos modificados" (Sprint 09) convergem
 * para a mesma lista `recentes` (ordenada por `atualizadoEm`) — o backend
 * não distingue "hora do upload" de "hora da última modificação" como dois
 * timestamps separados, então não há dado real para duas listas distintas.
 */
export function RecentDocumentsCard() {
  const { data, isLoading, isError, refetch } = useDocumentsDashboardSummary();
  const recentes = data?.recentes ?? [];
  const favoritos = data?.favoritos ?? [];

  return (
    <DashboardCard
      title="Documentos Recentes"
      source="real"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      isEmpty={recentes.length === 0}
      emptyIcon={FileText}
      emptyTitle="Nenhum documento recente"
    >
      <ul className="space-y-3">
        {recentes.slice(0, 5).map((document) => (
          <li key={document.id} className="flex items-center gap-2 text-sm">
            <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate font-medium">{document.nome}</p>
              <p className="truncate text-xs text-muted-foreground">
                {new Date(document.atualizadoEm).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {favoritos.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden="true" /> Favoritos
          </p>
          <ul className="space-y-2">
            {favoritos.slice(0, 3).map((document) => (
              <li key={document.id} className="truncate text-sm">
                {document.nome}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link href="/documentos" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
        Ver todos →
      </Link>
    </DashboardCard>
  );
}
