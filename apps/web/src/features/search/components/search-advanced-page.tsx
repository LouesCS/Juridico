'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search as SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useUniversalSearch } from '../api/queries';
import { SEARCH_GROUP_LABELS, SEARCH_GROUP_ORDER, type SearchResultType } from '../api/search.api';
import { pushRecentItem } from '../domain/recent-items';
import { SearchResultRow } from './search-result-row';

/**
 * Busca avançada (`/busca`) — reafirma docs/ux/09-busca-global.md §9.1: "modo
 * primário é sempre o overlay [Command Palette]", esta tela existe para
 * resultados extensos (mais itens por grupo do que cabem no palette, sem o
 * limite de 8/20 por página inteira). Lê `?q=` (já enviado pela Topbar desde
 * o Prompt 6C) e mantém a URL sincronizada para permitir compartilhar/voltar.
 */
export function SearchAdvancedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = React.useState(searchParams.get('q') ?? '');
  const [scope, setScope] = React.useState<SearchResultType | 'all'>('all');
  const debouncedQuery = useDebouncedValue(query, 200);
  const hasQuery = debouncedQuery.trim().length >= 2;

  React.useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('q', debouncedQuery);
    router.replace(`/busca${params.toString() ? `?${params}` : ''}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const types = scope === 'all' ? undefined : [scope];
  const { data, isLoading, isError, refetch } = useUniversalSearch(debouncedQuery, types, 20);

  return (
    <div>
      <PageHeader
        title="Busca"
        description="Encontre processos, clientes, documentos, prazos e mais."
      />

      <div className="relative mb-4 max-w-xl">
        <SearchIcon
          className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar…"
          aria-label="Busca avançada"
          className="pl-9"
          autoFocus
        />
      </div>

      <Tabs
        value={scope}
        onValueChange={(value) => setScope(value as SearchResultType | 'all')}
        className="mb-4"
      >
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">Todos</TabsTrigger>
          {SEARCH_GROUP_ORDER.map((type) => (
            <TabsTrigger key={type} value={type}>
              {SEARCH_GROUP_LABELS[type]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {!hasQuery && (
        <EmptyState
          icon={SearchIcon}
          title="Digite ao menos 2 caracteres"
          description="Busque por nome, número de processo (CNJ), CPF/CNPJ, nome de arquivo e mais."
        />
      )}

      {hasQuery && isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {hasQuery && isError && (
        <ErrorState
          title="Busca temporariamente indisponível."
          description="Tente novamente em instantes."
          onRetry={() => refetch()}
        />
      )}

      {hasQuery && !isLoading && !isError && data && (
        <div className="space-y-6">
          {data.groups.every((g) => g.items.length === 0) && (
            <EmptyState
              icon={SearchIcon}
              title={`Nenhum resultado para "${debouncedQuery}"`}
              description="Verifique a ortografia ou tente um termo mais genérico."
            />
          )}

          {data.groups.map((group) => {
            if (group.items.length === 0) return null;
            return (
              <section key={group.type}>
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 className="text-sm font-semibold">{SEARCH_GROUP_LABELS[group.type]}</h2>
                  <span className="text-xs text-muted-foreground">{group.total} resultado(s)</span>
                </div>
                <ul className="divide-y divide-border rounded-md border border-border">
                  {group.items.map((item) => (
                    <SearchResultRow
                      key={`${item.tipo}-${item.id}`}
                      item={item}
                      active={false}
                      optionId={`advanced-${item.tipo}-${item.id}`}
                      onSelect={() => {
                        pushRecentItem({
                          id: item.id,
                          tipo: item.tipo,
                          titulo: item.titulo,
                          subtitulo: item.subtitulo,
                          url: item.url,
                        });
                        router.push(item.url);
                      }}
                      onMouseEnter={() => {}}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
