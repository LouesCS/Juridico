import type * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Card "Ações rápidas" (Prompt 11 §Ações rápidas) — cada filho é o próprio
 * `DialogTrigger` de um formulário já existente (`UploadDialog`,
 * `LegalCaseFormDialog`, `DeadlineFormDialog`, ...), já contextualizado
 * (ex.: `processoId`/`clienteId` fixos) pela página que compõe o card.
 * Deliberadamente não é um `DropdownMenu` — aninhar `Dialog` dentro de
 * `DropdownMenuItem` tem armadilhas conhecidas de foco no Radix; botões
 * empilhados em um Card evitam o problema sem perder o efeito "sempre
 * contextualizado" pedido pela Sprint.
 */
export function QuickActionsCard({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ações rápidas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">{children}</CardContent>
    </Card>
  );
}
