import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Conteúdo de uma aba cujo módulo ainda não existe (Timeline, Documentos,
 * Comentários, ...) — mesmo princípio de `coming-soon.tsx` (nunca simular
 * dado ou funcionalidade), mas para uso dentro de uma `Tabs` já existente,
 * sem botão "Voltar" nem página inteira.
 */
export function PlaceholderTabContent({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-border px-6 py-12 text-center">
      <Icon className="size-8 text-muted-foreground" aria-hidden="true" />
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium">{title}</p>
        <Badge variant="outline">Em breve</Badge>
      </div>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
