import { PromptContext } from '../application/prompts/prompt-builder';

export type AiScopeType = 'PROCESSO' | 'DOCUMENTO' | 'CLIENTE' | 'TAREFA';
export type ChatScopeType = 'PROCESSO' | 'DOCUMENTO' | 'GLOBAL';

/**
 * Rascunho de uma linha de `FonteIA` — todo `ContextBuilder`
 * (`context-builders/*.ts`) devolve a lista de fontes já na ordem de
 * relevância; `hashFonte` é calculado a partir do conteúdo citado (permite
 * detectar depois que a fonte mudou desde a citação, reafirma
 * docs/database/06-entidades-ia-notificacoes-auditoria.md §6.2).
 */
export interface FonteIaDraft {
  sourceType:
    'DOCUMENTO' | 'EVENTO_TIMELINE' | 'METADADO_PROCESSO' | 'PROCESSO' | 'CLIENTE' | 'TAREFA';
  documentoId?: string;
  eventoTimelineId?: string;
  processoId?: string;
  clienteId?: string;
  /** Adicionado no Prompt 14 (Task Engine). */
  tarefaId?: string;
  trechoOuReferencia: string;
  hashFonte: string;
}

/** Resultado de um `ContextBuilder` — insumo para `PromptBuilder` + fontes para persistir. */
export interface AiContextResult {
  promptContext: PromptContext;
  fontes: FonteIaDraft[];
}
