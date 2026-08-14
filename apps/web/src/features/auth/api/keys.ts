/**
 * `['me']` é a única query desta rodada que NÃO é escopada por `officeId`
 * — é o bootstrap que resolve qual é o escritório ativo antes de qualquer
 * outra chave poder existir (docs/frontend/10-tanstack-query.md §10.2
 * trata isso como o caso especial esperado; toda chave de qualquer outro
 * módulo é escopada). Registrado em
 * docs/frontend-implementation/19-decisions.md.
 */
export const authKeys = {
  me: () => ['me'] as const,
};
