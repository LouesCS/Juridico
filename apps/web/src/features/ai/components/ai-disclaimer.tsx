import { Info } from 'lucide-react';

/**
 * Reafirma docs/frontend/22-ai.md §22.4 — selo obrigatório, sem exceção e
 * sem opção de esconder, em todo painel/card de IA. Nunca sugerir que a
 * saída é orientação jurídica definitiva.
 */
export function AiDisclaimer() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Info className="size-3 shrink-0" aria-hidden="true" />
      Resposta gerada por IA. Revise antes de utilizar.
    </p>
  );
}
