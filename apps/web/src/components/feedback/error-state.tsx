import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Reafirma docs/frontend/23-errors.md — mensagem genérica sem detalhe
 * técnico, `role="alert"` para leitores de tela, ação de retry opcional
 * (usada nos cards do Dashboard, §7 do Prompt 6C: uma falha parcial não
 * pode bloquear a tela inteira).
 */
export function ErrorState({
  title = 'Não foi possível carregar esta informação.',
  description = 'Verifique sua conexão e tente novamente.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-6 py-8 text-center"
    >
      <AlertTriangle className="size-6 text-destructive" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
