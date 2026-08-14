'use client';

import { Button } from '@/components/ui/button';
import { isApiError } from '@/lib/api/errors';

/**
 * Reafirma docs/frontend/23-errors.md §23.2/§23.4 — `correlationId`
 * sempre visível, nunca protagonista; nunca expõe `detail` técnico bruto.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const correlationId = isApiError(error) ? error.correlationId : error.digest;

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-lg font-semibold">Não foi possível completar a ação</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Verifique sua conexão e tente novamente.
      </p>
      {correlationId && (
        <p className="text-xs text-muted-foreground">Referência: {correlationId}</p>
      )}
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
