'use client';

import * as React from 'react';
import Link from 'next/link';
import { Clock3, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getRecentItems, getSearchHistory, type RecentItem } from '@/features/search';

/**
 * "Busca recente" / "Últimos acessos" do Dashboard (Sprint 10) — reafirma
 * pedido explícito: "apenas quando houver dados". Fonte é 100% client-side
 * (`localStorage`, mesmo dado real do usuário que alimenta o Command
 * Palette — reafirma docs/frontend/21-search.md §21.4), não um endpoint de
 * backend; por isso não usa `DashboardCard`/selo "Dados reais" (não há
 * `isLoading`/`isError` de rede) e simplesmente não renderiza nada se não
 * houver histórico nem itens recentes — nunca um card vazio-de-propósito.
 * "Favoritos" (pedido no mesmo bloco do Sprint 10) já é coberto pelos cards
 * dedicados existentes (`RecentDocumentsCard`/`RecentCasesCard`), evitando
 * um card quase-duplicado.
 */
export function RecentSearchesCard() {
  const [recentItems, setRecentItems] = React.useState<RecentItem[]>([]);
  const [history, setHistory] = React.useState<string[]>([]);

  React.useEffect(() => {
    setRecentItems(getRecentItems());
    setHistory(getSearchHistory());
  }, []);

  if (recentItems.length === 0 && history.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <CardTitle className="text-base">Busca recente</CardTitle>
      </CardHeader>
      <CardContent>
        {recentItems.length > 0 && (
          <ul className="space-y-2">
            {recentItems.map((item) => (
              <li key={`${item.tipo}-${item.id}`}>
                <Link
                  href={item.url}
                  className="flex items-center gap-2 text-sm hover:text-primary"
                >
                  <Clock3 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{item.titulo}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {history.length > 0 && (
          <div className={recentItems.length > 0 ? 'mt-4 border-t border-border pt-3' : ''}>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <Search className="size-3" aria-hidden="true" /> Termos buscados
            </p>
            <div className="flex flex-wrap gap-1.5">
              {history.slice(0, 6).map((term) => (
                <Link
                  key={term}
                  href={`/busca?q=${encodeURIComponent(term)}`}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {term}
                </Link>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
