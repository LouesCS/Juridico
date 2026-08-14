'use client';

import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

/**
 * Botão de favoritar genérico (estrela) — extraído de
 * `features/documents/` (Sprint 09) para `components/data-display/` no
 * Prompt 14 (Task Engine) porque o Task Engine precisava do mesmo
 * comportamento (`TarefaFavorito`, mesmo padrão de `DocumentoFavorito`) e
 * o componente já era 100% agnóstico de domínio — generalizar em vez de
 * duplicar.
 */
export function FavoriteButton({
  favorito,
  onToggle,
  isPending,
  label,
}: {
  favorito: boolean;
  onToggle: () => void;
  isPending?: boolean;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      disabled={isPending}
      aria-pressed={favorito}
      aria-label={label}
      className="size-8"
    >
      <Star
        className={cn('size-4 transition-colors', favorito ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')}
        aria-hidden="true"
      />
    </Button>
  );
}
