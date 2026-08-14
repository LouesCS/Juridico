'use client';

import * as React from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Loader2, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { clientsApi } from '@/features/clients/api/clients.api';
import { collaboratorsApi } from '@/features/team/api/collaborators.api';
import { legalFoldersApi } from '@/features/legal-folders/api/legal-folders.api';
import { legalCasesApi } from '@/features/legal-cases/api/legal-cases.api';

export type ExtraMovementFilterValues = {
  dataDe: string;
  dataAte: string;
  criadoDe: string;
  criadoAte: string;
  clientePastaId: string;
  encarregadoPastaId: string;
  parteContrariaPastaId: string;
  pastaJuridicaId: string;
  processoId: string;
  leitura: string;
  tarefas: string;
  timeline: string;
};
type Option = { id: string; title: string; details?: string[] };
type Page = { items: Option[]; next: string | number | null };

function useDebounced(value: string) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), 300);
    return () => window.clearTimeout(timer);
  }, [value]);
  return debounced;
}

export function RemotePicker({
  label,
  placeholder,
  value,
  onChange,
  queryKey,
  load,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (id: string) => void;
  queryKey: string;
  load: (q: string, page: string | number | null) => Promise<Page>;
}) {
  const [search, setSearch] = React.useState('');
  const debounced = useDebounced(search);
  const query = useInfiniteQuery({
    queryKey: ['extra-movement-filter', queryKey, debounced],
    initialPageParam: null as string | number | null,
    queryFn: ({ pageParam }) => load(debounced, pageParam),
    getNextPageParam: (last) => last.next ?? undefined,
  });
  const options = query.data?.pages.flatMap((page) => page.items) ?? [];
  const selected = options.find((option) => option.id === value);
  return (
    <div className="min-w-0 space-y-1.5">
      <Label>{label}</Label>
      <DropdownMenu onOpenChange={(open) => !open && setSearch('')}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between font-normal"
            aria-label={label}
          >
            <span className="truncate">
              {selected?.title ?? (value ? 'Item selecionado' : placeholder)}
            </span>
            <ChevronDown className="size-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[min(32rem,calc(100vw-2rem))]" align="start">
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <div className="p-1" onKeyDown={(event) => event.stopPropagation()}>
            <Input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={placeholder}
              aria-label={`Pesquisar ${label}`}
            />
          </div>
          <DropdownMenuSeparator />
          <div
            className="scrollbar-fade max-h-72 overflow-y-auto"
            role="listbox"
            onScroll={(event) => {
              const node = event.currentTarget;
              if (
                node.scrollHeight - node.scrollTop - node.clientHeight < 48 &&
                query.hasNextPage &&
                !query.isFetchingNextPage
              )
                void query.fetchNextPage();
            }}
          >
            <DropdownMenuItem onSelect={() => onChange('')}>
              <Check className={`size-4 ${value ? 'invisible' : ''}`} />
              Todos
            </DropdownMenuItem>
            {options.map((option) => (
              <DropdownMenuItem
                key={option.id}
                role="option"
                aria-selected={option.id === value}
                className="items-start py-2.5"
                onSelect={() => onChange(option.id)}
              >
                <Check
                  className={`mt-0.5 size-4 shrink-0 ${option.id === value ? '' : 'invisible'}`}
                />
                <span className="min-w-0">
                  <span className="block font-medium break-words">{option.title}</span>
                  {option.details?.filter(Boolean).map((detail) => (
                    <span key={detail} className="block text-xs text-muted-foreground">
                      {detail}
                    </span>
                  ))}
                </span>
              </DropdownMenuItem>
            ))}
            {(query.isLoading || query.isFetchingNextPage) && (
              <div className="flex justify-center p-4">
                <Loader2 className="size-4 animate-spin" />
              </div>
            )}
            {!query.isLoading && !options.length && (
              <p className="p-5 text-center text-sm text-muted-foreground">
                Nenhum resultado encontrado.
              </p>
            )}
            {query.isError && (
              <p className="p-5 text-center text-sm text-destructive">
                Não foi possível carregar as opções.
              </p>
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function DateRange({
  label,
  from,
  to,
  onFrom,
  onTo,
}: {
  label: string;
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  const key = label.toLowerCase().replaceAll(' ', '-');
  return (
    <fieldset className="min-w-0 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="min-w-0 space-y-1">
          <Label htmlFor={`${key}-min`}>Mín</Label>
          <Input
            id={`${key}-min`}
            type="date"
            value={from}
            onChange={(e) => onFrom(e.target.value)}
          />
        </div>
        <div className="min-w-0 space-y-1">
          <Label htmlFor={`${key}-max`}>Máx</Label>
          <Input id={`${key}-max`} type="date" value={to} onChange={(e) => onTo(e.target.value)} />
        </div>
      </div>
    </fieldset>
  );
}

export function ExtrajudicialMovementFilters({
  draft,
  setDraft,
  onApply,
  onClear,
  title = 'Filtros de movimentações extrajudiciais',
}: {
  draft: ExtraMovementFilterValues;
  setDraft: React.Dispatch<React.SetStateAction<ExtraMovementFilterValues>>;
  onApply: () => void;
  onClear: () => void;
  title?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const set = (key: keyof ExtraMovementFilterValues, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <SlidersHorizontal className="size-4" />
        Mais filtros
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="scrollbar-fade w-full overflow-x-hidden overflow-y-auto sm:w-[48rem] sm:max-w-[calc(100vw-2rem)]"
        >
          <SheetTitle>{title}</SheetTitle>
          <div className="grid min-w-0 gap-4 pt-4 sm:grid-cols-2">
            <DateRange
              label="Data da movimentação"
              from={draft.dataDe}
              to={draft.dataAte}
              onFrom={(v) => set('dataDe', v)}
              onTo={(v) => set('dataAte', v)}
            />
            <DateRange
              label="Data de cadastro"
              from={draft.criadoDe}
              to={draft.criadoAte}
              onFrom={(v) => set('criadoDe', v)}
              onTo={(v) => set('criadoAte', v)}
            />
            <RemotePicker
              label="Clientes da pasta"
              placeholder="Selecione os clientes..."
              value={draft.clientePastaId}
              onChange={(v) => set('clientePastaId', v)}
              queryKey="clients"
              load={async (q, cursor) => {
                const r = await clientsApi.list({
                  q,
                  cursor: typeof cursor === 'string' ? cursor : undefined,
                  limit: 25,
                });
                return {
                  items: r.items.map((x) => ({
                    id: x.id,
                    title: x.nome,
                    details: [
                      x.tipo === 'PESSOA_FISICA' ? 'Pessoa física' : 'Pessoa jurídica',
                      x.documento ?? '',
                      x.emails[0] ?? '',
                    ],
                  })),
                  next: r.nextCursor,
                };
              }}
            />
            <RemotePicker
              label="Encarregados da pasta"
              placeholder="Selecione os colaboradores..."
              value={draft.encarregadoPastaId}
              onChange={(v) => set('encarregadoPastaId', v)}
              queryKey="members"
              load={async (q, cursor) => {
                const r = await collaboratorsApi.list({
                  q,
                  cursor: typeof cursor === 'string' ? cursor : undefined,
                  limit: 25,
                });
                return {
                  items: r.items.map((x) => ({
                    id: x.id,
                    title: x.nome,
                    details: [x.email, x.cargo?.nome ?? '', x.situacaoAcesso],
                  })),
                  next: r.nextCursor,
                };
              }}
            />
            <RemotePicker
              label="Partes contrárias da pasta"
              placeholder="Selecione as pessoas..."
              value={draft.parteContrariaPastaId}
              onChange={(v) => set('parteContrariaPastaId', v)}
              queryKey="counterparties"
              load={async (q, cursor) => {
                const r = await clientsApi.list({
                  q,
                  cursor: typeof cursor === 'string' ? cursor : undefined,
                  limit: 25,
                });
                return {
                  items: r.items.map((x) => ({
                    id: x.id,
                    title: x.nome,
                    details: [x.documento ?? '', x.emails[0] ?? ''],
                  })),
                  next: r.nextCursor,
                };
              }}
            />
            <RemotePicker
              label="Pastas"
              placeholder="Selecione as pastas..."
              value={draft.pastaJuridicaId}
              onChange={(v) => set('pastaJuridicaId', v)}
              queryKey="folders"
              load={async (q, page) => {
                const current = typeof page === 'number' ? page : 1;
                const r = await legalFoldersApi.list({ q, page: current, limit: 25 });
                return {
                  items: r.items.map((x) => ({
                    id: x.id,
                    title: x.nome,
                    details: [
                      `Assunto: ${x.assunto ?? '--'}`,
                      `Encarregado: ${x.encarregado?.nome ?? '--'}`,
                      `Cliente principal: ${x.clientePrincipal.nome}`,
                      `Parte contrária principal: ${x.parteContrariaPrincipal?.nome ?? '--'}`,
                    ],
                  })),
                  next: current * r.limit < r.total ? current + 1 : null,
                };
              }}
            />
            <div className="sm:col-span-2">
              <RemotePicker
                label="Processos"
                placeholder="Selecione os processos judiciais..."
                value={draft.processoId}
                onChange={(v) => set('processoId', v)}
                queryKey="cases"
                load={async (q, cursor) => {
                  const r = await legalCasesApi.list({
                    q,
                    cursor: typeof cursor === 'string' ? cursor : undefined,
                    limit: 25,
                  });
                  return {
                    items: r.items.map((x) => ({
                      id: x.id,
                      title: x.numeroCnj ?? x.titulo,
                      details: [x.titulo, `Cliente: ${x.cliente.nome}`],
                    })),
                    next: r.nextCursor,
                  };
                }}
              />
            </div>
            {(
              [
                [
                  'Leitura',
                  'leitura',
                  [
                    ['ALL', 'Todas'],
                    ['LIDA', 'Lidas'],
                    ['NAO_LIDA', 'Não lidas'],
                  ],
                ],
                [
                  'Vínculo em tarefas',
                  'tarefas',
                  [
                    ['ALL', 'Todas'],
                    ['COM', 'Com tarefa'],
                    ['SEM', 'Sem tarefa'],
                  ],
                ],
                [
                  'Timeline',
                  'timeline',
                  [
                    ['ALL', 'Todas'],
                    ['COM', 'Lançadas na timeline'],
                    ['SEM', 'Não lançadas na timeline'],
                  ],
                ],
              ] as const
            ).map(([label, key, options]) => (
              <div className="space-y-1.5" key={key}>
                <Label>{label}</Label>
                <Select
                  value={draft[key] || 'ALL'}
                  onValueChange={(v) => set(key, v === 'ALL' ? '' : v)}
                >
                  <SelectTrigger aria-label={label}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map(([v, text]) => (
                      <SelectItem key={v} value={v}>
                        {text}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-background py-4">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={onClear}>
              Limpar
            </Button>
            <Button
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
