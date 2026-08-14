import { Clock3, History as HistoryIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SEARCH_GROUP_ICONS } from '../domain/group-icons';
import type { QuickAction } from '../api/search.api';
import type { RecentItem } from '../domain/recent-items';

/**
 * Estado de campo vazio — reafirma docs/ux/09-busca-global.md §9.4/§9.7/§9.9:
 * Recentes (itens abertos) + Sugestões (ações rápidas) + Histórico (termos
 * digitados, acessível por scroll, "Limpar histórico" sempre visível).
 */
export function SearchEmptyState({
  recentItems,
  suggestions,
  history,
  activeIndex,
  onSelectRecent,
  onSelectSuggestion,
  onSelectHistoryTerm,
  onClearHistory,
}: {
  recentItems: RecentItem[];
  suggestions: QuickAction[];
  history: string[];
  activeIndex: number;
  onSelectRecent: (item: RecentItem) => void;
  onSelectSuggestion: (action: QuickAction) => void;
  onSelectHistoryTerm: (term: string) => void;
  onClearHistory: () => void;
}) {
  let flatIndex = -1;

  return (
    <div className="space-y-5 py-2">
      {recentItems.length > 0 && (
        <section>
          <h3 className="mb-1 px-1 text-xs font-medium text-muted-foreground uppercase">
            Recentes
          </h3>
          <ul role="listbox" className="space-y-0.5">
            {recentItems.map((item) => {
              flatIndex++;
              const index = flatIndex;
              const Icon = SEARCH_GROUP_ICONS[item.tipo];
              return (
                <li
                  key={`recent-${item.tipo}-${item.id}`}
                  id={`palette-option-${index}`}
                  role="option"
                  aria-selected={activeIndex === index}
                  onClick={() => onSelectRecent(item)}
                  className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm ${
                    activeIndex === index ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                  }`}
                >
                  <Clock3 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{item.titulo}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {suggestions.length > 0 && (
        <section>
          <h3 className="mb-1 px-1 text-xs font-medium text-muted-foreground uppercase">
            Sugestões
          </h3>
          <ul role="listbox" className="space-y-0.5">
            {suggestions.map((action) => {
              flatIndex++;
              const index = flatIndex;
              return (
                <li
                  key={action.url}
                  id={`palette-option-${index}`}
                  role="option"
                  aria-selected={activeIndex === index}
                  onClick={() => onSelectSuggestion(action)}
                  className={`flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm ${
                    activeIndex === index ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                  }`}
                >
                  <span className="text-primary" aria-hidden="true">
                    +
                  </span>
                  <span className="min-w-0 flex-1 truncate">{action.label}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {recentItems.length === 0 && suggestions.length === 0 && (
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">
          Digite ao menos 2 caracteres para buscar processos, clientes, documentos e mais.
        </p>
      )}

      {history.length > 0 && (
        <section>
          <div className="mb-1 flex items-center justify-between px-1">
            <h3 className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase">
              <HistoryIcon className="size-3" aria-hidden="true" />
              Histórico
            </h3>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClearHistory}>
              <X className="mr-1 size-3" aria-hidden="true" />
              Limpar
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 px-1">
            {history.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => onSelectHistoryTerm(term)}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {term}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
