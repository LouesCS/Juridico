import type * as React from 'react';

/**
 * Linha rótulo/valor de painel de detalhe — extraído no Prompt 14 (Task
 * Engine) a partir de `legal-case-detail-page.tsx` (idêntico), reaproveitado
 * também por `task-detail-page.tsx`. `features/clients/`'s `InfoRow` tem um
 * estilo visual distinto (borda entre linhas) e permanece separado — não é
 * o mesmo componente, só o mesmo propósito.
 */
export function PropertyRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? '—'}</span>
    </div>
  );
}
