import { hasPermission } from './permission-check';

/**
 * Classificação de dados (Prompt 12 §Classificação dos Dados) — conceito
 * puramente de aplicação (TypeScript), não uma coluna de banco: nenhuma
 * tela hoje precisa persistir/consultar "qual a classificação desta linha"
 * de forma dinâmica, então uma migration para isso seria especulativa.
 * Cada `FieldRule` amarra estaticamente campo → classificação → a permissão
 * que autoriza vê-lo.
 *
 * A única aplicação real deste motor era em Cliente
 * (`client-field-security.ts`, CPF/CNPJ/endereço atrás de
 * `client:read:sensitive`) — removida pela Sprint "Remover mascaramento de
 * dados do cliente em Processos" (docs/backend-implementation/
 * 21-permission-engine.md §21.4): esses campos são dados cadastrais de
 * negócio, não dado genuinamente restrito, então a proteção correta é por
 * acesso ao recurso (`client:read`), não por campo. O mecanismo em si
 * (`redactFields`/`FieldRule`) continua aqui, sem consumidor ativo hoje,
 * pronto para áreas realmente restritas quando existirem (financeiro/
 * honorários/salários — ver `ADMIN_SOCIO_RESTRITAS` em
 * 21-permission-engine.md §21.5 para o equivalente já existente no nível
 * de ação, não de campo).
 */
export enum DataClassification {
  PUBLICO = 'PUBLICO',
  INTERNO = 'INTERNO',
  CONFIDENCIAL = 'CONFIDENCIAL',
  SIGILOSO = 'SIGILOSO',
  FINANCEIRO = 'FINANCEIRO',
  ADMINISTRATIVO = 'ADMINISTRATIVO',
}

export interface FieldRule {
  /**
   * Nome do campo, deliberadamente `string` solto (não `keyof T`) — uma
   * mesma lista de regras pode precisar ser reaproveitada contra DTOs com
   * formatos diferentes (detalhe vs. listagem vs. preview de busca), então
   * amarrar a um único `T` faria o conjunto de regras deixar de ser
   * reutilizável — justamente o oposto do objetivo do Permission Engine.
   */
  field: string;
  classification: DataClassification;
  /** Permissão (ou uma das permissões) que autoriza ver o campo em texto puro. */
  requiredPermission: string;
}

/**
 * Aplica `rules` sobre `record`: campos cuja permissão exigida o portador
 * não tem viram `null` (nunca um valor parcial/mascarado por engano — quem
 * quiser mascaramento visual faz isso explicitamente antes de chamar este
 * utilitário). Campos de `rules` que não existem em `record` são ignorados
 * silenciosamente. Sem consumidor ativo hoje — ver o comentário do módulo
 * acima.
 */
export function redactFields<T extends object>(
  record: T,
  rules: ReadonlyArray<FieldRule>,
  permissions: string[],
): T {
  const result = { ...record } as Record<string, unknown>;
  for (const rule of rules) {
    if (rule.field in result && !hasPermission(permissions, rule.requiredPermission)) {
      result[rule.field] = null;
    }
  }
  return result as T;
}

/** Verdadeiro se o portador tem acesso a TODOS os campos regidos por `rules`. */
export function hasFullFieldAccess(
  rules: ReadonlyArray<FieldRule>,
  permissions: string[],
): boolean {
  return rules.every((rule) => hasPermission(permissions, rule.requiredPermission));
}
