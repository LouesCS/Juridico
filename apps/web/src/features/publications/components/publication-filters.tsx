'use client';

import * as React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { RemotePicker } from '@/features/extrajudicial-movements/components/extrajudicial-movement-filters';
import { legalCasesApi } from '@/features/legal-cases/api/legal-cases.api';
import { legalFoldersApi } from '@/features/legal-folders/api/legal-folders.api';
import { collaboratorsApi } from '@/features/team/api/collaborators.api';

export type PublicationFilterValues = {
  q: string;
  cidade: string;
  publicacaoDe: string;
  publicacaoAte: string;
  cadastroDe: string;
  cadastroAte: string;
  diario: string;
  nomeVinculo: string;
  processoNaPublicacao: string;
  orgao: string;
  vara: string;
  clientePastaId: string;
  encarregadoPastaId: string;
  parteContrariaPastaId: string;
  pastaId: string;
  processoId: string;
  vinculoTarefa: '' | 'COM' | 'SEM';
  timeline: '' | 'COM' | 'SEM';
  vinculoPasta: '' | 'COM' | 'SEM';
  visualizacao: '' | 'OCULTAS' | 'NAO_OCULTAS';
};

export const EMPTY_PUBLICATION_FILTERS: PublicationFilterValues = {
  q: '',
  cidade: '',
  publicacaoDe: '',
  publicacaoAte: '',
  cadastroDe: '',
  cadastroAte: '',
  diario: '',
  nomeVinculo: '',
  processoNaPublicacao: '',
  orgao: '',
  vara: '',
  clientePastaId: '',
  encarregadoPastaId: '',
  parteContrariaPastaId: '',
  pastaId: '',
  processoId: '',
  vinculoTarefa: '',
  timeline: '',
  vinculoPasta: '',
  visualizacao: '',
};

function TextFilter({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
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
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
}) {
  const id = label.toLowerCase().replaceAll(' ', '-');
  return (
    <fieldset className="min-w-0 rounded-lg border px-3 pt-2 pb-3">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        <div className="min-w-0 space-y-1">
          <Label htmlFor={`${id}-min`}>Mín.</Label>
          <Input
            id={`${id}-min`}
            type="date"
            value={from}
            onChange={(e) => onFrom(e.target.value)}
          />
        </div>
        <div className="min-w-0 space-y-1">
          <Label htmlFor={`${id}-max`}>Máx.</Label>
          <Input id={`${id}-max`} type="date" value={to} onChange={(e) => onTo(e.target.value)} />
        </div>
      </div>
    </fieldset>
  );
}

function RadioFilter({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="space-y-2 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {options.map(([optionValue, text]) => {
          const id = `${name}-${optionValue || 'todas'}`;
          return (
            <label key={id} htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                id={id}
                type="radio"
                name={name}
                value={optionValue}
                checked={value === optionValue}
                onChange={() => onChange(optionValue)}
                className="size-4 accent-primary"
              />
              {text}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function PublicationFilters({
  value,
  onApply,
}: {
  value: PublicationFilterValues;
  onApply: (value: PublicationFilterValues) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [mainDraft, setMainDraft] = React.useState({
    q: value.q,
    visualizacao: value.visualizacao,
  });
  const set = <K extends keyof PublicationFilterValues>(key: K, next: PublicationFilterValues[K]) =>
    setDraft((current) => ({ ...current, [key]: next }));
  const invalidDates =
    Boolean(
      draft.publicacaoDe && draft.publicacaoAte && draft.publicacaoDe > draft.publicacaoAte,
    ) || Boolean(draft.cadastroDe && draft.cadastroAte && draft.cadastroDe > draft.cadastroAte);
  const activeCount = Object.entries(value).filter(
    ([key, current]) => !['q', 'visualizacao'].includes(key) && Boolean(current),
  ).length;

  React.useEffect(() => {
    setMainDraft({ q: value.q, visualizacao: value.visualizacao });
  }, [value.q, value.visualizacao]);

  const changeOpen = (next: boolean) => {
    if (next) setDraft(value);
    setOpen(next);
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          className="min-w-0 sm:max-w-sm sm:flex-1"
          aria-label="Buscar publicações"
          placeholder="Buscar publicações..."
          value={mainDraft.q}
          onChange={(event) => setMainDraft((current) => ({ ...current, q: event.target.value }))}
        />
        <Select
          value={mainDraft.visualizacao || 'TODAS'}
          onValueChange={(next) =>
            setMainDraft((current) => ({
              ...current,
              visualizacao:
                next === 'TODAS' ? '' : (next as PublicationFilterValues['visualizacao']),
            }))
          }
        >
          <SelectTrigger className="sm:w-44" aria-label="Visualização">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODAS">Todas</SelectItem>
            <SelectItem value="OCULTAS">Ocultas</SelectItem>
            <SelectItem value="NAO_OCULTAS">Não ocultas</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => changeOpen(true)}>
          <SlidersHorizontal className="size-4" />
          Mais filtros{activeCount ? ` (${activeCount})` : ''}
        </Button>
        <Button
          onClick={() =>
            onApply({ ...value, q: mainDraft.q, visualizacao: mainDraft.visualizacao })
          }
        >
          Consultar
        </Button>
      </div>
      <Sheet open={open} onOpenChange={changeOpen}>
        <SheetContent
          side="right"
          className="scrollbar-fade !w-full max-w-full overflow-x-hidden overflow-y-auto sm:!w-[48rem] sm:max-w-[calc(100vw-2rem)]"
        >
          <SheetTitle>Mais filtros</SheetTitle>
          <div className="grid min-w-0 gap-4 pt-4 sm:grid-cols-2">
            <TextFilter
              id="publicacao-cidade"
              label="Cidade"
              value={draft.cidade}
              onChange={(v) => set('cidade', v)}
            />
            <DateRange
              label="Data da publicação"
              from={draft.publicacaoDe}
              to={draft.publicacaoAte}
              onFrom={(v) => set('publicacaoDe', v)}
              onTo={(v) => set('publicacaoAte', v)}
            />
            <DateRange
              label="Data de cadastro"
              from={draft.cadastroDe}
              to={draft.cadastroAte}
              onFrom={(v) => set('cadastroDe', v)}
              onTo={(v) => set('cadastroAte', v)}
            />
            <TextFilter
              id="publicacao-diario"
              label="Diário"
              value={draft.diario}
              onChange={(v) => set('diario', v)}
            />
            <TextFilter
              id="publicacao-nome-vinculo"
              label="Nome de vínculo"
              value={draft.nomeVinculo}
              onChange={(v) => set('nomeVinculo', v)}
            />
            <TextFilter
              id="publicacao-processo-origem"
              label="Processo na publicação"
              value={draft.processoNaPublicacao}
              onChange={(v) => set('processoNaPublicacao', v)}
            />
            <TextFilter
              id="publicacao-orgao"
              label="Órgão"
              value={draft.orgao}
              onChange={(v) => set('orgao', v)}
            />
            <TextFilter
              id="publicacao-vara"
              label="Vara"
              value={draft.vara}
              onChange={(v) => set('vara', v)}
            />
            <RemotePicker
              label="Clientes da pasta"
              placeholder="Pesquisar clientes..."
              value={draft.clientePastaId}
              onChange={(v) => set('clientePastaId', v)}
              queryKey="publication-folder-clients"
              load={async (q, cursor) => {
                const result = await clientsApi.list({
                  q,
                  cursor: typeof cursor === 'string' ? cursor : undefined,
                  limit: 25,
                });
                return {
                  items: result.items.map((item) => ({
                    id: item.id,
                    title: item.nome,
                    details: [item.documento ?? '', item.emails[0] ?? ''],
                  })),
                  next: result.nextCursor,
                };
              }}
            />
            <RemotePicker
              label="Encarregados da pasta"
              placeholder="Pesquisar colaboradores..."
              value={draft.encarregadoPastaId}
              onChange={(v) => set('encarregadoPastaId', v)}
              queryKey="publication-folder-managers"
              load={async (q, cursor) => {
                const result = await collaboratorsApi.list({
                  q,
                  cursor: typeof cursor === 'string' ? cursor : undefined,
                  limit: 25,
                });
                return {
                  items: result.items.map((item) => ({
                    id: item.id,
                    title: item.nome,
                    details: [item.email, item.cargo?.nome ?? ''],
                  })),
                  next: result.nextCursor,
                };
              }}
            />
            <RemotePicker
              label="Partes contrárias da pasta"
              placeholder="Pesquisar partes contrárias..."
              value={draft.parteContrariaPastaId}
              onChange={(v) => set('parteContrariaPastaId', v)}
              queryKey="publication-folder-counterparties"
              load={async (q, cursor) => {
                const result = await clientsApi.list({
                  q,
                  cursor: typeof cursor === 'string' ? cursor : undefined,
                  limit: 25,
                });
                return {
                  items: result.items.map((item) => ({
                    id: item.id,
                    title: item.nome,
                    details: [item.documento ?? '', item.emails[0] ?? ''],
                  })),
                  next: result.nextCursor,
                };
              }}
            />
            <RemotePicker
              label="Pastas"
              placeholder="Pesquisar pastas..."
              value={draft.pastaId}
              onChange={(v) => set('pastaId', v)}
              queryKey="publication-folders"
              load={async (q, page) => {
                const current = typeof page === 'number' ? page : 1;
                const result = await legalFoldersApi.list({ q, page: current, limit: 25 });
                return {
                  items: result.items.map((item) => ({
                    id: item.id,
                    title: item.nome,
                    details: [
                      `Cliente: ${item.clientePrincipal.nome}`,
                      `Encarregado: ${item.encarregado?.nome ?? '--'}`,
                    ],
                  })),
                  next: current * result.limit < result.total ? current + 1 : null,
                };
              }}
            />
            <div className="sm:col-span-2">
              <RemotePicker
                label="Processos"
                placeholder="Pesquisar processos judiciais..."
                value={draft.processoId}
                onChange={(v) => set('processoId', v)}
                queryKey="publication-judicial-cases"
                load={async (q, cursor) => {
                  const result = await legalCasesApi.list({
                    q,
                    tipo: 'JUDICIAL',
                    cursor: typeof cursor === 'string' ? cursor : undefined,
                    limit: 25,
                  });
                  return {
                    items: result.items.map((item) => ({
                      id: item.id,
                      title: item.numeroCnj ?? item.titulo,
                      details: [item.titulo, `Cliente: ${item.cliente.nome}`],
                    })),
                    next: result.nextCursor,
                  };
                }}
              />
            </div>
            <RadioFilter
              label="Vínculo em tarefa"
              name="publication-task-link"
              value={draft.vinculoTarefa}
              options={[
                ['', 'Todas'],
                ['COM', 'Com vínculo'],
                ['SEM', 'Sem vínculo'],
              ]}
              onChange={(v) => set('vinculoTarefa', v as PublicationFilterValues['vinculoTarefa'])}
            />
            <RadioFilter
              label="Timeline"
              name="publication-timeline"
              value={draft.timeline}
              options={[
                ['', 'Todas'],
                ['COM', 'Lançadas na timeline'],
                ['SEM', 'Não lançadas na timeline'],
              ]}
              onChange={(v) => set('timeline', v as PublicationFilterValues['timeline'])}
            />
            <RadioFilter
              label="Vínculos em pastas"
              name="publication-folder-link"
              value={draft.vinculoPasta}
              options={[
                ['', 'Todas'],
                ['COM', 'Com vínculo'],
                ['SEM', 'Sem vínculo'],
              ]}
              onChange={(v) => set('vinculoPasta', v as PublicationFilterValues['vinculoPasta'])}
            />
          </div>
          {invalidDates && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              A data mínima deve ser anterior à data máxima.
            </p>
          )}
          <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-background py-4">
            <Button variant="ghost" onClick={() => changeOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setDraft({
                  ...EMPTY_PUBLICATION_FILTERS,
                  q: mainDraft.q,
                  visualizacao: mainDraft.visualizacao,
                })
              }
            >
              Limpar
            </Button>
            <Button
              disabled={invalidDates}
              onClick={() => {
                onApply({ ...draft, q: mainDraft.q, visualizacao: mainDraft.visualizacao });
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
