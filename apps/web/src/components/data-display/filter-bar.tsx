import * as React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * `activeCount`/`onClear` (Prompt 11 §Filtros) são opcionais — páginas que
 * ainda não os passam continuam funcionando como antes. Quando presentes,
 * mostra um badge com a contagem de filtros ativos e um botão "Limpar
 * filtros" ao final da barra.
 */
export function FilterBar({
  children,
  activeCount = 0,
  onClear,
}: {
  children: React.ReactNode;
  activeCount?: number;
  onClear?: () => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {children}
      {onClear && activeCount > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {activeCount} {activeCount === 1 ? 'filtro ativo' : 'filtros ativos'}
          </Badge>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="size-3.5" aria-hidden="true" />
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
}
