/**
 * Mitigação básica de prompt injection — reafirma Sprint 11 ("PromptSanitizer").
 * Nenhum conteúdo vindo de dado do usuário (nome de documento, descrição de
 * timeline, pergunta livre do chat) é confiável; `PromptBuilder` sempre passa
 * texto por aqui antes de compor a mensagem final. Não substitui a defesa
 * real (instrução de sistema tratando o bloco de contexto como dado, nunca
 * comando — ver `prompt-template.ts`), só reduz o caso mais óbvio de um
 * campo tentando se passar por uma nova instrução de sistema/assistente.
 */
const MAX_FIELD_LENGTH = 4000;

export function sanitizeUntrustedText(text: string): string {
  return text.replace(/^(system|assistant|user)\s*:/gim, '[$1]:').slice(0, MAX_FIELD_LENGTH);
}
