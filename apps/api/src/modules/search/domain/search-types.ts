/**
 * Reafirma docs/api/15-search.md e docs/ux/09-busca-global.md — tipos
 * compartilhados por todos os adapters de busca (`application/search-adapters.ts`)
 * e pelo use case agregador (`application/use-cases/universal-search.use-case.ts`).
 *
 * Extensão deliberada além do payload de exemplo de docs/api/15-search.md §15.1
 * (que só documenta `legal-cases`/`documents`/`clients`/`tags`/`comments`): o
 * Sprint 10 pede também Prazos, Pastas, Timeline e Equipe/Usuários — os 4
 * grupos adicionais abaixo (`deadlines`, `folders`, `timeline`, `team`) somam-se
 * aos 5 originais, na ordem fixa listada em `GROUP_ORDER`. "Equipe" (modelo
 * `Equipe`) e "Usuários" (modelo `Membro`/`Usuario`), citados como categorias
 * separadas no prompt, foram consolidados num único grupo `team` — mesmo
 * racional de consolidação já aplicado a três widgets de Dashboard na
 * Sprint 09 (registrado em docs/backend-implementation/20-context-next-step.md).
 */

import type { AuthUser } from '../../../common/decorators/current-user.decorator';

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

/**
 * Ordem fixa de exibição dos grupos — reafirma docs/api/15-search.md §15.1.
 * `tasks` adicionado no Prompt 14 (Task Engine) — toda tarefa deve aparecer
 * na Busca Global automaticamente, respeitando Permission Engine + Scope
 * Resolver (mesma garantia que já vale para Processo/Documento/Cliente).
 */
export const GROUP_ORDER: SearchResultType[] = [
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

export interface SearchResultItem {
  id: string;
  tipo: SearchResultType;
  titulo: string;
  subtitulo: string | null;
  /** Trecho com `<mark>` ao redor do termo — já sanitizado (texto plano escapado antes de injetar a tag). */
  snippet: string | null;
  url: string;
  /** 0–1, só para ordenação — nunca exibido ao usuário (reafirma docs/api/15-search.md §15.1). */
  score: number;
  /** Campos extras por tipo (status, tags, cliente/processo relacionado, data) — sustenta o preview lateral sem round-trip extra. */
  metadata: Record<string, unknown>;
}

export interface SearchGroupResult {
  type: SearchResultType;
  total: number;
  items: SearchResultItem[];
  /** Presente (e `false`) apenas para grupos sem dado real ainda — mesmo padrão de "compartilhados" em Documents (Sprint 09). */
  disponivel?: boolean;
}

/**
 * Contrato comum a todo adapter de entidade — reafirma pedido explícito do
 * Sprint 10 ("criar arquitetura preparada para crescimento... preparar para
 * OpenSearch/Elastic futuramente"): trocar a implementação Postgres por um
 * adapter que chama um motor externo não exige mudar `UniversalSearchUseCase`,
 * só a classe que implementa esta interface.
 */
export interface SearchAdapter {
  readonly type: SearchResultType;
  search(ctx: SearchContext): Promise<SearchGroupResult>;
}

export interface SearchContext {
  escritorioId: string;
  user: AuthUser;
  q: string;
  limit: number;
}
