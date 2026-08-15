import { apiClient } from '@/lib/api/client';

export type AuditResourceType =
  | 'PASTA_JURIDICA'
  | 'PROCESSO'
  | 'MOVIMENTACAO_JUDICIAL'
  | 'MOVIMENTACAO_EXTRAJUDICIAL'
  | 'PEDIDO'
  | 'PUBLICACAO';

export interface AuditItem {
  id: string;
  acao: string;
  resultado: 'SUCESSO' | 'FALHA' | 'NEGADO';
  atorTipo: 'USUARIO' | 'SISTEMA' | 'API';
  atorId: string | null;
  atorNome: string | null;
  recursoTipo: string;
  recursoId: string | null;
  dadosAntes: unknown | null;
  dadosDepois: unknown | null;
  criadoEm: string;
  motivo: string | null;
}

export const auditApi = {
  context: (
    resourceType: AuditResourceType,
    resourceId: string,
    page: number,
    limit = 10,
    period: 'RECENTES' | 'ANTIGAS' = 'RECENTES',
  ) =>
    apiClient.get<{
      items: AuditItem[];
      total: number;
      page: number;
      limit: number;
      period: 'RECENTES' | 'ANTIGAS';
      cutoff: string;
    }>('/audit/context', { query: { resourceType, resourceId, page, limit, period } }),
};
