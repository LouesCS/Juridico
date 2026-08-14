'use client';
import * as React from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Loader2, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { legalFoldersApi } from '@/features/legal-folders/api/legal-folders.api';
import { requestsApi } from '../api/requests.api';
import { decimalToCents } from '../domain/money';

export type AdvancedRequestFilters = Record<string, string>;
const moneyRanges = [
  ['valorPedido', 'Valor pedido'],
  ['valorProvavel', 'Valor provável'],
  ['valorPossivel', 'Valor possível'],
  ['valorRemoto', 'Valor remoto'],
  ['valorFinal', 'Valor final'],
] as const;

function FolderPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useInfiniteQuery({
    queryKey: ['request-folder-picker', debounced],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => legalFoldersApi.list({ q: debounced, page: pageParam, limit: 25 }),
    getNextPageParam: (last) => (last.page * last.limit < last.total ? last.page + 1 : undefined),
  });
  const items = query.data?.pages.flatMap((x) => x.items) ?? [];
  const selected = items.find((x) => x.id === value);
  return (
    <div className="space-y-1.5">
      <Label>Pasta Jurídica</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal">
            <span className="truncate">
              {selected?.nome ?? (value ? 'Pasta selecionada' : 'Todas as Pastas')}
            </span>
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[min(32rem,calc(100vw-2rem))]" align="start">
          <div className="p-1" onKeyDown={(e) => e.stopPropagation()}>
            <Input
              autoFocus
              aria-label="Pesquisar Pasta Jurídica"
              placeholder="Buscar por nome, cliente ou assunto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <DropdownMenuSeparator />
          <div
            className="max-h-72 overflow-y-auto"
            onScroll={(e) => {
              const n = e.currentTarget;
              if (
                n.scrollHeight - n.scrollTop - n.clientHeight < 48 &&
                query.hasNextPage &&
                !query.isFetchingNextPage
              )
                void query.fetchNextPage();
            }}
          >
            <DropdownMenuItem onSelect={() => onChange('')}>
              <Check className={value ? 'invisible size-4' : 'size-4'} />
              Todas as Pastas
            </DropdownMenuItem>
            {items.map((x) => (
              <DropdownMenuItem key={x.id} onSelect={() => onChange(x.id)} className="items-start">
                <Check className={x.id === value ? 'mt-1 size-4' : 'invisible mt-1 size-4'} />
                <span>
                  <span className="block font-medium">{x.nome}</span>
                  <span className="block text-xs text-muted-foreground">
                    {x.clientePrincipal.nome} · {x.assunto ?? 'Sem assunto'}
                  </span>
                </span>
              </DropdownMenuItem>
            ))}
            {(query.isLoading || query.isFetchingNextPage) && (
              <Loader2 className="m-4 size-4 animate-spin" />
            )}
            {query.isError && (
              <div className="p-3 text-sm text-destructive">
                Não foi possível carregar.{' '}
                <Button size="sm" variant="ghost" onClick={() => query.refetch()}>
                  Tentar novamente
                </Button>
              </div>
            )}
            {!query.isLoading && !query.isError && !items.length && (
              <p className="p-4 text-sm text-muted-foreground">Nenhuma Pasta encontrada.</p>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function RequestsAdvancedFilters({
  draft,
  setDraft,
  onApply,
  onClear,
  count,
}: {
  draft: AdvancedRequestFilters;
  setDraft: React.Dispatch<React.SetStateAction<AdvancedRequestFilters>>;
  onApply: () => void;
  onClear: () => void;
  count: number;
}) {
  const [open, setOpen] = React.useState(false);
  const options = useQuery({
    queryKey: ['request-options'],
    queryFn: requestsApi.options,
    enabled: open,
  });
  const set = (k: string, v: string) => setDraft((x) => ({ ...x, [k]: v }));
  const errors: Record<string, string> = {};
  if (
    draft.dataFinalizacaoDe &&
    draft.dataFinalizacaoAte &&
    draft.dataFinalizacaoDe > draft.dataFinalizacaoAte
  )
    errors.data = 'A data inicial deve ser anterior à final.';
  const estimateMin = Number(draft.estimativaMin),
    estimateMax = Number(draft.estimativaMax);
  if (
    (draft.estimativaMin && (estimateMin < 0 || estimateMin > 100)) ||
    (draft.estimativaMax && (estimateMax < 0 || estimateMax > 100)) ||
    (draft.estimativaMin && draft.estimativaMax && estimateMin > estimateMax)
  )
    errors.estimate = 'Informe um intervalo entre 0 e 100, com mínimo menor que máximo.';
  for (const [key] of moneyRanges) {
    const min = draft[`${key}Min`],
      max = draft[`${key}Max`];
    try {
      const a = decimalToCents(min),
        b = decimalToCents(max);
      if (a && b && BigInt(a) > BigInt(b))
        errors[key] = 'O valor mínimo deve ser menor que o máximo.';
    } catch {
      errors[key] = 'Informe valores monetários válidos.';
    }
  }
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <SlidersHorizontal />
        Mais filtros
        {count > 0 && <span className="rounded-full bg-muted px-2 text-xs">{count}</span>}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:w-[48rem] sm:max-w-[calc(100vw-2rem)]"
        >
          <SheetTitle>Filtros de Pedidos</SheetTitle>
          <div className="grid gap-4 pt-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select
                value={draft.categoria || 'ALL'}
                onValueChange={(v) => set('categoria', v === 'ALL' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  {options.data?.categorias.map((x) => (
                    <SelectItem key={x.value} value={x.value}>
                      {x.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FolderPicker
              value={draft.pastaJuridicaId}
              onChange={(v) => set('pastaJuridicaId', v)}
            />
            <fieldset className="rounded-lg border p-3 sm:col-span-2">
              <legend className="px-1 text-sm font-medium">Data de finalização</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  aria-label="Finalização mínima"
                  type="date"
                  value={draft.dataFinalizacaoDe}
                  onChange={(e) => set('dataFinalizacaoDe', e.target.value)}
                />
                <Input
                  aria-label="Finalização máxima"
                  type="date"
                  value={draft.dataFinalizacaoAte}
                  onChange={(e) => set('dataFinalizacaoAte', e.target.value)}
                />
              </div>
              {errors.data && <p className="mt-1 text-xs text-destructive">{errors.data}</p>}
            </fieldset>
            <fieldset className="rounded-lg border p-3 sm:col-span-2">
              <legend className="px-1 text-sm font-medium">Estimativa de êxito (%)</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  aria-label="Êxito mínimo"
                  type="number"
                  value={draft.estimativaMin}
                  onChange={(e) => set('estimativaMin', e.target.value)}
                />
                <Input
                  aria-label="Êxito máximo"
                  type="number"
                  value={draft.estimativaMax}
                  onChange={(e) => set('estimativaMax', e.target.value)}
                />
              </div>
              {errors.estimate && (
                <p className="mt-1 text-xs text-destructive">{errors.estimate}</p>
              )}
            </fieldset>
            {moneyRanges.map(([key, label]) => (
              <fieldset key={key} className="rounded-lg border p-3">
                <legend className="px-1 text-sm font-medium">{label}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    aria-label={`${label} mínimo`}
                    inputMode="decimal"
                    placeholder="Mínimo"
                    value={draft[`${key}Min`]}
                    onChange={(e) => set(`${key}Min`, e.target.value)}
                  />
                  <Input
                    aria-label={`${label} máximo`}
                    inputMode="decimal"
                    placeholder="Máximo"
                    value={draft[`${key}Max`]}
                    onChange={(e) => set(`${key}Max`, e.target.value)}
                  />
                </div>
                {errors[key] && <p className="mt-1 text-xs text-destructive">{errors[key]}</p>}
              </fieldset>
            ))}
          </div>
          <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-background py-4">
            <Button variant="outline" onClick={onClear}>
              Limpar
            </Button>
            <Button
              disabled={Object.keys(errors).length > 0}
              onClick={() => {
                onApply();
                setOpen(false);
              }}
            >
              Consultar
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
