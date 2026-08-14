import { apiClient } from '@/lib/api/client';
import type { ExtraFieldDTO } from '@/features/configuration/api/configuration.api';

export interface LegalFolderSummary {
  id: string;
  nome: string;
  prefixo: string | null;
  sequencial: number | null;
  numeroInterno: string | null;
  assunto: string | null;
  categoria: string | null;
  etapa: string | null;
  situacao: string;
  confidencial: boolean;
  clientePrincipal: { id: string; nome: string };
  parteContrariaPrincipal: { id: string; nome: string } | null;
  encarregado: {
    id: string;
    nome: string;
    numeroOab?: string | null;
    cargo?: string | null;
  } | null;
  processos: Array<{
    processo: {
      id: string;
      titulo: string;
      numeroCnj: string | null;
      tipo: 'JUDICIAL' | 'ADMINISTRATIVO' | 'CONSULTIVO' | 'EXTRAJUDICIAL';
    };
  }>;
  _count?: { processos: number; configuracoesCaptura: number };
  vinculosClientes?: Array<{
    tipo: 'CLIENTE' | 'PARTE_CONTRARIA' | 'INTERESSADO';
    cliente: { id: string; nome: string };
  }>;
  criadoEm: string;
  atualizadoEm: string;
  arquivadoEm: string | null;
}

export interface LegalFolderDetail extends LegalFolderSummary {
  observacoes: string | null;
  camposExtrasValores: Record<string, string>;
  dataConclusao: string | null;
  configuracoesCaptura: Array<{
    id: string;
    numeroCnj: string;
    status: string;
    ultimaSincronizacaoEm: string | null;
    novidadesUltimaCaptura: number;
  }>;
  vinculosClientes: Array<{
    tipo: 'CLIENTE' | 'PARTE_CONTRARIA' | 'INTERESSADO';
    cliente: { id: string; nome: string };
  }>;
  processos: Array<{
    processo: LegalFolderSummary['processos'][number]['processo'] & {
      assunto: string | null;
      status: string;
      configuracoesCaptura: LegalFolderDetail['configuracoesCaptura'];
      publicacoesCapturadas: Array<{
        id: string;
        dataPublicacao: string | null;
        conteudo: string | null;
      }>;
      movimentosCapturados: Array<{
        id: string;
        dataMovimento: string;
        tipo: string;
        descricao: string;
      }>;
      documentos: Array<{ id: string; nome: string; extensao: string; atualizadoEm: string }>;
      partes: Array<{
        id: string;
        nome: string;
        tipo: string;
        natureza: string;
        ehNossoCliente: boolean;
        clienteId: string | null;
      }>;
      equipe: Array<{
        membroId: string;
        funcaoNoProcesso: string | null;
        responsavelPrincipal: boolean;
      }>;
    };
  }>;
}

export interface LegalFolderFilters {
  q?: string;
  clienteId?: string;
  situacao?: string;
  encarregadoId?: string;
  assunto?: string;
  categoria?: string;
  parteContraria?: string;
  processo?: string;
  cnj?: string;
  criadoDe?: string;
  criadoAte?: string;
  possuiProcesso?: boolean;
  possuiCaptura?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface UpsertLegalFolder {
  assunto?: string | null;
  categoria?: string | null;
  situacao?: string;
  confidencial?: boolean;
  clientePrincipalId: string;
  parteContrariaPrincipalId?: string | null;
  encarregadoId: string;
  observacoes?: string | null;
  dataConclusao?: string | null;
  processoIds?: string[];
  outrosClienteIds?: string[];
  outrasPartesContrariasIds?: string[];
  interessadoIds?: string[];
  camposExtrasValores?: Record<string, string>;
}

export const legalFoldersApi = {
  options: () =>
    apiClient.get<{
      categorias: Array<{ valor: string; label: string }>;
      situacoes: Array<{ valor: string; label: string }>;
      etapaInicial: string;
      camposExtras: ExtraFieldDTO[];
    }>('/legal-folders/options'),
  list: (query: LegalFolderFilters = {}) =>
    apiClient.get<{ items: LegalFolderSummary[]; total: number; page: number; limit: number }>(
      '/legal-folders',
      { query: { ...query } },
    ),
  get: (id: string) => apiClient.get<LegalFolderDetail>(`/legal-folders/${id}`),
  create: (input: UpsertLegalFolder) =>
    apiClient.post<{ id: string; nome: string }>('/legal-folders', input),
  update: (id: string, input: Partial<UpsertLegalFolder>) =>
    apiClient.patch<{ id: string }>(`/legal-folders/${id}`, input),
  archive: (id: string) => apiClient.post<void>(`/legal-folders/${id}/archive`),
  complete: (id: string) =>
    apiClient.post<{ id: string; dataConclusao: string }>(`/legal-folders/${id}/complete`),
  copy: (id: string) => apiClient.post<{ id: string; nome: string }>(`/legal-folders/${id}/copy`),
};
