import { apiClient } from '@/lib/api/client';

/**
 * Tipos manuais espelhando `apps/api/src/modules/search/` (Sprint 10).
 * Ordem de `SEARCH_GROUP_ORDER` é a mesma do backend (`GROUP_ORDER` em
 * `search-types.ts`) — o frontend nunca reordena grupos, só itera na ordem
 * que a resposta já traz (reafirma docs/frontend/21-search.md §21.2).
 */
export type SearchResultType =
  | 'clients'
  | 'legal-cases'
  | 'documents'
  | 'deadlines'
  | 'tasks'
  | 'team'
  | 'folders'
  | 'timeline'
  | 'tags'
  | 'comments'
  | 'publications'
  | 'judicial-movements'
  | 'extrajudicial-movements'
  | 'requests';

export const SEARCH_GROUP_ORDER: SearchResultType[] = [
  'clients',
  'legal-cases',
  'documents',
  'deadlines',
  'tasks',
  'team',
  'folders',
  'timeline',
  'tags',
  'comments',
  'publications',
  'judicial-movements',
  'extrajudicial-movements',
  'requests',
];

export const SEARCH_GROUP_LABELS: Record<SearchResultType, string> = {
  clients: 'Clientes',
  'legal-cases': 'Processos',
  documents: 'Documentos',
  deadlines: 'Prazos',
  tasks: 'Tarefas',
  team: 'Equipe',
  folders: 'Pastas',
  timeline: 'Timeline',
  tags: 'Tags',
  comments: 'Comentários',
  publications: 'Publicações',
  'judicial-movements': 'Movimentações',
  'extrajudicial-movements': 'Movimentações Extrajudiciais',
  requests: 'Pedidos',
};

export interface SearchResultItem {
  id: string;
  tipo: SearchResultType;
  titulo: string;
  subtitulo: string | null;
  /** HTML já sanitizado pelo backend — só `<mark>` é permitido (ver docs/api/15-search.md §15.1). */
  snippet: string | null;
  url: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface SearchGroupResult {
  type: SearchResultType;
  total: number;
  items: SearchResultItem[];
  disponivel?: boolean;
}

export interface SearchResponse {
  query: string;
  groups: SearchGroupResult[];
}

export interface QuickAction {
  label: string;
  action: 'navigate';
  url: string;
}

export interface SearchSuggestionsResponse {
  sugestoes: QuickAction[];
}

export const searchApi = {
  search: (
    q: string,
    options?: { types?: SearchResultType[]; limit?: number; signal?: AbortSignal },
  ) =>
    apiClient.get<SearchResponse>('/search', {
      query: {
        q,
        types: options?.types?.join(','),
        limit: options?.limit,
      },
      signal: options?.signal,
    }),

  suggestions: () => apiClient.get<SearchSuggestionsResponse>('/search/suggestions'),
};
