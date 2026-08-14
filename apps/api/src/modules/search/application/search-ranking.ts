/**
 * Reafirma docs/ux/09-busca-global.md §9.3 (ranking) e §9.13 (percepção de
 * velocidade) e docs/database/09-indices-busca-performance.md §9.3.3
 * (`ts_rank_cd`/`ts_headline`, versão conceitual). Cada adapter (ver
 * `search-adapters.ts`) chama estas funções puras — nenhuma duplica a lógica
 * de rank/snippet/score.
 *
 * DESVIO CONSCIENTE do FTS/trigram descrito em
 * docs/database/09-indices-busca-performance.md §9.3: as colunas `buscaTsv`
 * são `Unsupported("tsvector")` no Prisma Client (não filtráveis pela query
 * builder tipada) e as extensões `pg_trgm`/`unaccent` só existem numa
 * migration nunca aplicada (sem Postgres neste ambiente, mesma limitação de
 * todas as rodadas). Reescrever a mesma lógica de autorização (segredo de
 * justiça, confidencialidade, escopo `assigned/team/all`) em SQL bruto para
 * usar `$queryRaw` duplicaria — sem poder testar contra Postgres real — a
 * regra de segurança mais sensível do produto; risco considerado maior que o
 * ganho. Por isso a busca usa `contains`/`mode:"insensitive"` (ILIKE via
 * Prisma, já usado por `ListClientsUseCase`/`ListLegalCasesUseCase`) sobre os
 * mesmos `where` de escopo já testados, com ranking e destaque calculados em
 * memória sobre a página retornada. Consequência honesta: não há tolerância a
 * erro de digitação nem normalização de acento (ex.: "prócesso" não encontra
 * "processo") — a infraestrutura GIN/trigram/unaccent já existe na migration
 * para quando integração real contra Postgres permitir validar SQL bruto com
 * segurança (ver docs/backend-implementation/20-context-next-step.md).
 */

export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Query "numérica" (CPF/CNPJ/CNJ/telefone) quando, após remover não-dígitos, sobra um número relevante. */
export function isNumericQuery(q: string): boolean {
  return onlyDigits(q).length >= 4;
}

export type MatchRank = 0 | 1 | 2 | 3;

/**
 * 0 = correspondência exata (reafirma regra 1 de docs/ux/09-busca-global.md
 * §9.3 — número exato sobe ao topo absoluto); 1 = começa com o termo; 2 =
 * contém o termo; 3 = não bate no campo primário (só teria chegado aqui por
 * outro campo do OR do `where`, ranking mínimo).
 */
export function textRank(
  q: string,
  primary: string | null | undefined,
  exact: Array<string | null | undefined> = [],
): MatchRank {
  const nq = normalizeText(q);
  if (exact.some((c) => c && normalizeText(c) === nq)) return 0;
  if (!primary) return 3;
  const np = normalizeText(primary);
  if (np === nq) return 0;
  if (np.startsWith(nq)) return 1;
  if (np.includes(nq)) return 2;
  return 3;
}

/** Converte o rank em score 0–1 (docs/api/15-search.md §15.1) + leve boost de recência. */
export function computeScore(rank: MatchRank, atualizadoEm?: Date | null): number {
  const base = { 0: 1, 1: 0.85, 2: 0.6, 3: 0.4 }[rank];
  if (!atualizadoEm) return base;
  const diasDesdeAtualizacao = (Date.now() - atualizadoEm.getTime()) / (1000 * 60 * 60 * 24);
  const boost = diasDesdeAtualizacao < 30 ? 0.05 * (1 - diasDesdeAtualizacao / 30) : 0;
  return Math.min(1, base + boost);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Gera o trecho com `<mark>` ao redor do termo (equivalente simplificado de
 * `ts_headline`, docs/database/09-indices-busca-performance.md §9.3.3). Texto
 * ao redor é HTML-escapado ANTES de injetar a tag — o frontend usa
 * `dangerouslySetInnerHTML` só com este campo, nunca com dado bruto do
 * usuário (reafirma "sanitizado no backend antes de sair", docs/api/15-search.md §15.1).
 */
export function buildSnippet(
  text: string | null | undefined,
  q: string,
  maxLen = 100,
): string | null {
  if (!text) return null;
  const idx = normalizeText(text).indexOf(normalizeText(q));
  if (idx === -1) {
    const truncated = text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
    return escapeHtml(truncated);
  }

  const start = Math.max(0, idx - 40);
  const end = Math.min(text.length, idx + q.length + 40);
  const before = escapeHtml(text.slice(start, idx));
  const match = escapeHtml(text.slice(idx, idx + q.length));
  const after = escapeHtml(text.slice(idx + q.length, end));
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${before}<mark>${match}</mark>${after}${suffix}`;
}
