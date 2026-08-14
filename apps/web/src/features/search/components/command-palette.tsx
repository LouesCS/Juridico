'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search as SearchIcon, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils/cn';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useCommandPaletteStore } from '@/stores/command-palette.store';
import { useUniversalSearch, useSearchSuggestions } from '../api/queries';
import {
  SEARCH_GROUP_LABELS,
  SEARCH_GROUP_ORDER,
  type QuickAction,
  type SearchResultItem,
  type SearchResultType,
} from '../api/search.api';
import { parsePrefixedQuery } from '../domain/prefix-scope';
import { getRecentItems, pushRecentItem, type RecentItem } from '../domain/recent-items';
import { clearSearchHistory, getSearchHistory, pushSearchTerm } from '../domain/search-history';
import { logSearchTelemetry } from '../domain/search-telemetry';
import { useCommandPaletteShortcut } from '../hooks/use-command-palette-shortcut';
import { SearchEmptyState } from './search-empty-state';
import { SearchPreviewPanel } from './search-preview-panel';
import { SearchResultRow } from './search-result-row';

const CHIP_SCOPES: Array<SearchResultType | 'all'> = [
  'all',
  'legal-cases',
  'documents',
  'clients',
  'deadlines',
  'tasks',
  'team',
];
const CHIP_LABELS: Record<string, string> = { all: 'Todos', ...SEARCH_GROUP_LABELS };

/**
 * Command Palette (`Ctrl+K`/`⌘K`) — reafirma docs/ux/09-busca-global.md.
 * Montado uma única vez em `(app)/layout.tsx`, nunca remontado por rota.
 */
export function CommandPalette() {
  useCommandPaletteShortcut();
  const router = useRouter();
  const isOpen = useCommandPaletteStore((s) => s.isOpen);
  const close = useCommandPaletteStore((s) => s.close);

  const [query, setQuery] = React.useState('');
  const [scope, setScope] = React.useState<SearchResultType | 'all'>('all');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [recentItems, setRecentItems] = React.useState<RecentItem[]>([]);
  const [history, setHistory] = React.useState<string[]>([]);
  const searchStartedAt = React.useRef<number | null>(null);
  const telemetryLoggedFor = React.useRef<string | null>(null);

  const debouncedQuery = useDebouncedValue(query, 200);
  const hasQuery = debouncedQuery.trim().length >= 2;
  const types = scope === 'all' ? undefined : [scope];
  const limit = scope === 'all' ? 8 : 20;

  const searchResult = useUniversalSearch(debouncedQuery, types, limit);
  const suggestionsResult = useSearchSuggestions(isOpen && !hasQuery);

  React.useEffect(() => {
    if (isOpen) {
      setRecentItems(getRecentItems());
      setHistory(getSearchHistory());
    } else {
      setQuery('');
      setScope('all');
      setActiveIndex(0);
      searchStartedAt.current = null;
      telemetryLoggedFor.current = null;
    }
  }, [isOpen]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [debouncedQuery, scope]);

  React.useEffect(() => {
    if (hasQuery) searchStartedAt.current ??= performance.now();
  }, [debouncedQuery, hasQuery]);

  React.useEffect(() => {
    if (!hasQuery || !searchResult.data || searchStartedAt.current === null) return;
    if (telemetryLoggedFor.current === debouncedQuery) return;
    telemetryLoggedFor.current = debouncedQuery;
    const duracaoMs = performance.now() - searchStartedAt.current;
    const total = searchResult.data.groups.reduce((acc, g) => acc + g.items.length, 0);
    logSearchTelemetry({ tipo: 'busca', duracaoMs, quantidadeResultados: total });
    pushSearchTerm(debouncedQuery);
    searchStartedAt.current = null;
  }, [searchResult.data, hasQuery, debouncedQuery]);

  const flatItems: SearchResultItem[] = hasQuery
    ? (searchResult.data?.groups.flatMap((g) => g.items) ?? [])
    : [];
  const flatCount = hasQuery
    ? flatItems.length
    : recentItems.length + (suggestionsResult.data?.sugestoes.length ?? 0);

  function handleQueryChange(value: string) {
    const parsed = parsePrefixedQuery(value);
    if (parsed.scope && parsed.rest !== value) {
      setScope(parsed.scope);
      setQuery(parsed.rest);
      return;
    }
    setQuery(value);
  }

  function openUrl(url: string) {
    close();
    router.push(url);
  }

  function selectResult(item: SearchResultItem) {
    logSearchTelemetry({ tipo: 'categoria_escolhida', categoria: item.tipo });
    pushRecentItem({
      id: item.id,
      tipo: item.tipo,
      titulo: item.titulo,
      subtitulo: item.subtitulo,
      url: item.url,
    });
    openUrl(item.url);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (flatCount > 0) setActiveIndex((i) => (i + 1) % flatCount);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (flatCount > 0) setActiveIndex((i) => (i - 1 + flatCount) % flatCount);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      logSearchTelemetry({ tipo: 'atalho_utilizado', atalho: 'Tab' });
      setScope((current) => CHIP_SCOPES[(CHIP_SCOPES.indexOf(current) + 1) % CHIP_SCOPES.length]);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (hasQuery) {
        const item = flatItems[activeIndex];
        if (item) selectResult(item);
      } else if (activeIndex < recentItems.length) {
        const item = recentItems[activeIndex];
        if (item) openUrl(item.url);
      } else {
        const action = suggestionsResult.data?.sugestoes[activeIndex - recentItems.length];
        if (action) openUrl(action.url);
      }
    }
  }

  const activeItem = hasQuery ? flatItems[activeIndex] : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="top-[12%] flex max-h-[76vh] w-[calc(100vw-2rem)] max-w-2xl translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:w-full"
      >
        <DialogTitle className="sr-only">Busca global</DialogTitle>
        <div className="flex items-center gap-2 border-b border-border px-4">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar processos, clientes, documentos, prazos…"
            role="combobox"
            aria-expanded={isOpen}
            aria-controls="palette-listbox"
            aria-activedescendant={flatCount > 0 ? `palette-option-${activeIndex}` : undefined}
            className="h-12 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {searchResult.isFetching && (
            <Loader2
              className="size-4 shrink-0 animate-spin text-muted-foreground"
              aria-hidden="true"
            />
          )}
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Limpar busca"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
          <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground sm:inline-block">
            Esc
          </kbd>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2">
          {CHIP_SCOPES.map((chipScope) => (
            <button
              key={chipScope}
              type="button"
              onClick={() => setScope(chipScope)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                scope === chipScope
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {CHIP_LABELS[chipScope]}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1">
          <div id="palette-listbox" className="scrollbar-fade min-w-0 flex-1 overflow-y-auto p-3">
            {!hasQuery && (
              <SearchEmptyState
                recentItems={recentItems}
                suggestions={suggestionsResult.data?.sugestoes ?? []}
                history={history}
                activeIndex={activeIndex}
                onSelectRecent={(item) => openUrl(item.url)}
                onSelectSuggestion={(action: QuickAction) => openUrl(action.url)}
                onSelectHistoryTerm={(term) => setQuery(term)}
                onClearHistory={() => {
                  clearSearchHistory();
                  setHistory([]);
                }}
              />
            )}

            {hasQuery && searchResult.isError && (
              <p role="alert" className="px-1 py-8 text-center text-sm text-muted-foreground">
                Busca temporariamente indisponível. Tente novamente em instantes.
              </p>
            )}

            {hasQuery && !searchResult.isError && searchResult.data && flatItems.length === 0 && (
              <div className="px-1 py-8 text-center text-sm text-muted-foreground">
                <p>Nenhum resultado para &ldquo;{debouncedQuery}&rdquo;.</p>
                <p className="mt-1">Verifique a ortografia ou tente outro termo.</p>
              </div>
            )}

            {hasQuery && !searchResult.isError && searchResult.data && flatItems.length > 0 && (
              <ul role="listbox" className="space-y-3">
                {SEARCH_GROUP_ORDER.map((type) => {
                  const group = searchResult.data!.groups.find((g) => g.type === type);
                  if (!group || group.items.length === 0) return null;
                  return (
                    <li key={type}>
                      <div className="mb-1 flex items-baseline justify-between px-1">
                        <h3 className="text-xs font-medium text-muted-foreground uppercase">
                          {SEARCH_GROUP_LABELS[type]}
                        </h3>
                        <span className="text-xs text-muted-foreground">{group.total}</span>
                      </div>
                      <ul>
                        {group.items.map((item) => {
                          const index = flatItems.indexOf(item);
                          return (
                            <SearchResultRow
                              key={`${item.tipo}-${item.id}`}
                              item={item}
                              active={activeIndex === index}
                              optionId={`palette-option-${index}`}
                              onSelect={() => selectResult(item)}
                              onMouseEnter={() => setActiveIndex(index)}
                            />
                          );
                        })}
                      </ul>
                      {group.total > group.items.length && scope === 'all' && (
                        <button
                          type="button"
                          onClick={() => setScope(type)}
                          className="mt-0.5 px-3 text-xs text-primary hover:underline"
                        >
                          Ver mais {group.total - group.items.length} em {SEARCH_GROUP_LABELS[type]}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {activeItem && (
            <div className="hidden w-72 shrink-0 border-l border-border md:block">
              <SearchPreviewPanel item={activeItem} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border px-1">↑</kbd>
            <kbd className="rounded border border-border px-1">↓</kbd> Navegar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border px-1">↵</kbd> Abrir
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border px-1">Tab</kbd> Filtrar
          </span>
          <span className="ml-auto flex items-center gap-1">
            <kbd className="rounded border border-border px-1">Esc</kbd> Fechar
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
