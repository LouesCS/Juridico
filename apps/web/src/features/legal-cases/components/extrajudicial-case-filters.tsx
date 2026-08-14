'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { RemotePicker } from '@/features/extrajudicial-movements/components/extrajudicial-movement-filters';
import { clientsApi } from '@/features/clients/api/clients.api';
import { collaboratorsApi } from '@/features/team/api/collaborators.api';
import { legalFoldersApi } from '@/features/legal-folders/api/legal-folders.api';
import { legalCasesApi } from '../api/legal-cases.api';

export type ExtrajudicialAdvancedFilters = {
  protocolo: string;
  dataDistribuicaoDe: string;
  dataDistribuicaoAte: string;
  dataEncerramentoDe: string;
  dataEncerramentoAte: string;
  parteId: string;
  pastaJuridicaId: string;
  encarregadoId: string;
  clienteId: string;
  parteContrariaId: string;
  semMovimentacoesApos: string;
};
export const EMPTY_EXTRAJUDICIAL_FILTERS: ExtrajudicialAdvancedFilters = {
  protocolo: '',
  dataDistribuicaoDe: '',
  dataDistribuicaoAte: '',
  dataEncerramentoDe: '',
  dataEncerramentoAte: '',
  parteId: '',
  pastaJuridicaId: '',
  encarregadoId: '',
  clienteId: '',
  parteContrariaId: '',
  semMovimentacoesApos: '',
};

function DateRange({
  label,
  from,
  to,
  onFrom,
  onTo,
  error,
}: {
  label: string;
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  error?: string;
}) {
  return (
    <fieldset className="min-w-0 rounded-lg border p-3 sm:col-span-2">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label>De</Label>
          <Input
            aria-label={`${label} de`}
            type="date"
            value={from}
            onChange={(e) => onFrom(e.target.value)}
          />
        </div>
        <div>
          <Label>Até</Label>
          <Input
            aria-label={`${label} até`}
            type="date"
            value={to}
            onChange={(e) => onTo(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </fieldset>
  );
}

export function ExtrajudicialCaseFilters({
  open,
  onOpenChange,
  draft,
  setDraft,
  count,
  onApply,
  onClear,
  onCancel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: ExtrajudicialAdvancedFilters;
  setDraft: React.Dispatch<React.SetStateAction<ExtrajudicialAdvancedFilters>>;
  count: number;
  onApply: () => void;
  onClear: () => void;
  onCancel: () => void;
}) {
  const set = (key: keyof ExtrajudicialAdvancedFilters, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const entryError =
    draft.dataDistribuicaoDe &&
    draft.dataDistribuicaoAte &&
    draft.dataDistribuicaoDe > draft.dataDistribuicaoAte
      ? 'A data inicial deve ser anterior ou igual à final.'
      : undefined;
  const closeError =
    draft.dataEncerramentoDe &&
    draft.dataEncerramentoAte &&
    draft.dataEncerramentoDe > draft.dataEncerramentoAte
      ? 'A data inicial deve ser anterior ou igual à final.'
      : undefined;
  return (
    <Sheet
      open={open}
      onOpenChange={(value) => {
        if (!value) onCancel();
        onOpenChange(value);
      }}
    >
      <SheetContent
        side="right"
        className="scrollbar-fade w-full overflow-x-hidden overflow-y-auto sm:w-[48rem] sm:max-w-[calc(100vw-2rem)]"
      >
        <SheetTitle>Mais filtros</SheetTitle>
        <div className="grid min-w-0 gap-4 pt-5 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="extra-protocol">Protocolo</Label>
            <Input
              id="extra-protocol"
              value={draft.protocolo}
              onChange={(e) => set('protocolo', e.target.value)}
            />
          </div>
          <DateRange
            label="Data de entrada"
            from={draft.dataDistribuicaoDe}
            to={draft.dataDistribuicaoAte}
            onFrom={(v) => set('dataDistribuicaoDe', v)}
            onTo={(v) => set('dataDistribuicaoAte', v)}
            error={entryError}
          />
          <DateRange
            label="Data de conclusão"
            from={draft.dataEncerramentoDe}
            to={draft.dataEncerramentoAte}
            onFrom={(v) => set('dataEncerramentoDe', v)}
            onTo={(v) => set('dataEncerramentoAte', v)}
            error={closeError}
          />
          <RemotePicker
            label="Partes"
            placeholder="Buscar partes..."
            value={draft.parteId}
            onChange={(v) => set('parteId', v)}
            queryKey="case-parties"
            load={async (q, cursor) => {
              const result = await legalCasesApi.partyOptions({
                q,
                tipo: 'TODAS',
                cursor: typeof cursor === 'string' ? cursor : undefined,
                limit: 25,
              });
              return {
                items: result.items.map((item) => ({
                  id: item.id,
                  title: item.nome,
                  details: [item.tipo, item.documento ?? ''],
                })),
                next: result.nextCursor,
              };
            }}
          />
          <RemotePicker
            label="Pastas"
            placeholder="Buscar Pastas..."
            value={draft.pastaJuridicaId}
            onChange={(v) => set('pastaJuridicaId', v)}
            queryKey="case-folders"
            load={async (q, page) => {
              const current = typeof page === 'number' ? page : 1;
              const result = await legalFoldersApi.list({ q, page: current, limit: 25 });
              return {
                items: result.items.map((item) => ({
                  id: item.id,
                  title: item.nome,
                  details: [
                    `Cliente: ${item.clientePrincipal.nome}`,
                    `Assunto: ${item.assunto ?? '--'}`,
                  ],
                })),
                next: current * result.limit < result.total ? current + 1 : null,
              };
            }}
          />
          <RemotePicker
            label="Encarregados"
            placeholder="Buscar colaboradores..."
            value={draft.encarregadoId}
            onChange={(v) => set('encarregadoId', v)}
            queryKey="case-members"
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
                  details: [item.email],
                })),
                next: result.nextCursor,
              };
            }}
          />
          <RemotePicker
            label="Clientes"
            placeholder="Buscar Clientes..."
            value={draft.clienteId}
            onChange={(v) => set('clienteId', v)}
            queryKey="case-clients"
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
                  details: [item.documento ?? ''],
                })),
                next: result.nextCursor,
              };
            }}
          />
          <RemotePicker
            label="Partes contrárias"
            placeholder="Buscar Requeridos..."
            value={draft.parteContrariaId}
            onChange={(v) => set('parteContrariaId', v)}
            queryKey="case-counterparties"
            load={async (q, cursor) => {
              const result = await legalCasesApi.partyOptions({
                q,
                tipo: 'REU',
                cursor: typeof cursor === 'string' ? cursor : undefined,
                limit: 25,
              });
              return {
                items: result.items.map((item) => ({
                  id: item.id,
                  title: item.nome,
                  details: [item.documento ?? ''],
                })),
                next: result.nextCursor,
              };
            }}
          />
          <div className="space-y-1.5">
            <Label htmlFor="without-movements-after">Sem movimentações após</Label>
            <Input
              id="without-movements-after"
              type="date"
              value={draft.semMovimentacoesApos}
              onChange={(e) => set('semMovimentacoesApos', e.target.value)}
            />
          </div>
        </div>
        <div className="sticky bottom-0 mt-6 flex flex-wrap justify-end gap-2 border-t bg-background py-4">
          <Button
            variant="ghost"
            onClick={() => {
              onCancel();
              onOpenChange(false);
            }}
          >
            Cancelar
          </Button>
          <Button variant="outline" onClick={onClear}>
            Limpar
          </Button>
          <Button
            disabled={Boolean(entryError || closeError)}
            onClick={() => {
              onApply();
              onOpenChange(false);
            }}
          >
            Consultar
          </Button>
          {count > 0 && <span className="sr-only">{count} filtros aplicados</span>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
