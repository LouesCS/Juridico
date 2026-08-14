import { Star } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { SearchResultItem } from '../api/search.api';
import { SEARCH_GROUP_ICONS } from '../domain/group-icons';

/** Uma linha de resultado — reafirma docs/ux/09-busca-global.md §9.1/§9.10 (foco visível de 2px, nunca implícito). */
export function SearchResultRow({
  item,
  active,
  optionId,
  onSelect,
  onMouseEnter,
}: {
  item: SearchResultItem;
  active: boolean;
  optionId: string;
  onSelect: () => void;
  onMouseEnter: () => void;
}) {
  const Icon = SEARCH_GROUP_ICONS[item.tipo];
  const isFavorito = Boolean(item.metadata.favorito);

  return (
    <li
      id={optionId}
      role="option"
      aria-selected={active}
      onMouseEnter={onMouseEnter}
      onClick={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        active ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
      )}
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">{item.titulo}</span>
          {isFavorito && (
            <Star className="size-3 shrink-0 fill-warning text-warning" aria-hidden="true" />
          )}
        </div>
        {item.subtitulo && (
          <p className="truncate text-xs text-muted-foreground">{item.subtitulo}</p>
        )}
        {item.snippet && (
          <p
            className="mt-0.5 truncate text-xs text-muted-foreground [&_mark]:rounded-sm [&_mark]:bg-warning-subtle [&_mark]:px-0.5 [&_mark]:text-foreground"
            // Seguro: `snippet` é HTML-escapado no backend, só `<mark>` é
            // injetado (reafirma docs/api/15-search.md §15.1) — nunca dado
            // bruto do usuário.
            dangerouslySetInnerHTML={{ __html: item.snippet }}
          />
        )}
      </div>
      {active && (
        <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground sm:inline-block">
          ↵
        </kbd>
      )}
    </li>
  );
}
