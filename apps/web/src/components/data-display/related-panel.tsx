import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';

export interface RelatedItem {
  label: string;
  icon: LucideIcon;
  /** Ausente = entidade relacionada existe conceitualmente mas o módulo
   * ainda não tem uma tela real (ex.: Contratos de um Cliente) — o item
   * aparece esmaecido, não clicável, em vez de simular um link morto. */
  href?: string;
  count?: number;
}

/**
 * Painel "Relacionados" (Prompt 11 §Painel "Relacionados") — reaproveitado
 * em todas as páginas de detalhe de entidade (Cliente/Processo/Documento).
 * Cada item clicável abre imediatamente a tela relacionada; itens sem
 * `href` (módulo ainda não implementado) ficam visíveis, mas esmaecidos —
 * nunca escondidos, para que o usuário saiba que o relacionamento existe
 * na arquitetura mesmo antes do módulo nascer.
 */
export function RelatedPanel({ items }: { items: RelatedItem[] }) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Relacionados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const row = (
            <span
              className={cn(
                'flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                item.href ? 'hover:bg-accent' : 'text-muted-foreground opacity-60',
              )}
            >
              <span className="flex items-center gap-2">
                <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                {item.label}
              </span>
              {typeof item.count === 'number' && (
                <span className="text-xs text-muted-foreground tabular-nums">{item.count}</span>
              )}
            </span>
          );

          if (!item.href) {
            return (
              <div key={item.label} aria-disabled="true">
                {row}
              </div>
            );
          }

          return (
            <Link key={item.label} href={item.href} className="block">
              {row}
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
