'use client';

import * as React from 'react';
import { Check, ChevronDown, Search, SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
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
import type { CaptureConfiguration, CaptureStatus } from '../api/judicial-capture.api';

export const captureStatusLabels: Record<CaptureStatus, string> = {
  ATIVA: 'Ativa',
  PAUSADA: 'Pausada',
  SINCRONIZANDO: 'Sincronizando',
  ERRO: 'Com problema',
};

export type CaptureFilterValues = {
  q: string;
  pasta: string;
  status: string;
  sort: string;
  cadastroDe: string;
  cadastroAte: string;
  atualizadoDe: string;
  atualizadoAte: string;
  cliente: string;
  processo: string;
  ativa: '' | 'true' | 'false';
  syncDe: string;
  syncAte: string;
};

type FolderOption = {
  id: string;
  nome: string;
  assunto?: string | null;
  responsavel?: string | null;
  cliente?: string;
  parteContraria?: string | null;
  processo?: string;
  cnj?: string | null;
};

export function folderOptionsFrom(configurations: CaptureConfiguration[]): FolderOption[] {
  const unique = new Map<string, FolderOption>();
  for (const configuration of configurations) {
    const process = configuration.processo;
    if (!process) continue;
    for (const { pastaJuridica: folder } of process.pastasJuridicas ?? []) {
      if (unique.has(folder.id)) continue;
      unique.set(folder.id, {
        id: folder.id,
        nome: folder.nome,
        assunto: process.assunto,
        responsavel: process.responsavelPrincipal?.nome,
        cliente: process.cliente.nome,
        parteContraria: process.partes?.find((party) => !party.ehNossoCliente)?.nome,
        processo: process.titulo,
        cnj: process.numeroCnj ?? configuration.numeroCnj,
      });
    }
  }
  return [...unique.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

function FolderSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (id: string) => void;
  options: FolderOption[];
}) {
  const [search, setSearch] = React.useState('');
  const selected = options.find((option) => option.id === value);
  const normalized = search.trim().toLocaleLowerCase('pt-BR');
  const visible = options.filter((option) =>
    [option.nome, option.cliente, option.processo, option.cnj, option.assunto, option.responsavel]
      .filter(Boolean)
      .some((text) => text!.toLocaleLowerCase('pt-BR').includes(normalized)),
  );
  return (
    <DropdownMenu onOpenChange={(open) => !open && setSearch('')}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="min-w-0 justify-between sm:w-52" aria-label="Pasta">
          <span className="truncate">{selected?.nome ?? 'Pasta'}</span>
          <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(26rem,calc(100vw-2rem))]">
        <DropdownMenuLabel>Selecionar Pasta</DropdownMenuLabel>
        <div className="p-1" onKeyDown={(event) => event.stopPropagation()}>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar Pasta, cliente, processo ou CNJ..."
            aria-label="Pesquisar Pastas"
            autoFocus
          />
        </div>
        <DropdownMenuSeparator />
        <div
          className="scrollbar-fade max-h-72 overflow-y-auto"
          role="listbox"
          aria-label="Pastas disponíveis"
        >
          <DropdownMenuItem onSelect={() => onChange('')} className="min-h-10">
            {!value && <Check className="size-4" aria-hidden="true" />}
            Todas as Pastas
          </DropdownMenuItem>
          {visible.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onSelect={() => onChange(option.id)}
              className="items-start py-2.5"
              role="option"
              aria-selected={value === option.id}
            >
              <Check
                className={`mt-0.5 size-4 shrink-0 ${value === option.id ? '' : 'invisible'}`}
                aria-hidden="true"
              />
              <span className="min-w-0 space-y-0.5">
                <span className="block font-medium break-words">{option.nome}</span>
                {option.assunto && (
                  <span className="block text-xs text-muted-foreground">
                    Assunto: {option.assunto}
                  </span>
                )}
                {option.responsavel && (
                  <span className="block text-xs text-muted-foreground">
                    Encarregado: {option.responsavel}
                  </span>
                )}
                {option.cliente && (
                  <span className="block text-xs text-muted-foreground">
                    Cliente principal: {option.cliente}
                  </span>
                )}
                {option.parteContraria && (
                  <span className="block text-xs text-muted-foreground">
                    Parte contrária principal: {option.parteContraria}
                  </span>
                )}
              </span>
            </DropdownMenuItem>
          ))}
          {visible.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhuma Pasta encontrada.
            </p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function StatusSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const selected = value.split(',').filter(Boolean) as CaptureStatus[];
  const toggle = (status: CaptureStatus) => {
    const next = selected.includes(status)
      ? selected.filter((item) => item !== status)
      : [...selected, status];
    onChange(next.join(','));
  };
  const summary =
    selected.length === 0
      ? 'Situação'
      : selected.length === 1
        ? captureStatusLabels[selected[0]]
        : `${selected.length} situações`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="justify-between sm:w-44"
          aria-label="Situação"
          aria-haspopup="listbox"
        >
          <span className="truncate">{summary}</span>
          <ChevronDown className="size-4 shrink-0 opacity-60" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" aria-label="Selecionar situações">
        <DropdownMenuLabel>Situação</DropdownMenuLabel>
        {(Object.keys(captureStatusLabels) as CaptureStatus[]).map((status) => (
          <DropdownMenuCheckboxItem
            key={status}
            checked={selected.includes(status)}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={() => toggle(status)}
          >
            {captureStatusLabels[status]}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DateRange({
  title,
  prefix,
  draft,
  setDraft,
}: {
  title: string;
  prefix: 'cadastro' | 'atualizado' | 'sync';
  draft: CaptureFilterValues;
  setDraft: React.Dispatch<React.SetStateAction<CaptureFilterValues>>;
}) {
  const from = `${prefix}De` as keyof CaptureFilterValues;
  const to = `${prefix}Ate` as keyof CaptureFilterValues;
  return (
    <fieldset className="space-y-2 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">{title}</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${prefix}-de`}>Data inicial</Label>
          <Input
            id={`${prefix}-de`}
            type="date"
            value={draft[from]}
            onChange={(event) =>
              setDraft((current) => ({ ...current, [from]: event.target.value }))
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${prefix}-ate`}>Data final</Label>
          <Input
            id={`${prefix}-ate`}
            type="date"
            value={draft[to]}
            onChange={(event) => setDraft((current) => ({ ...current, [to]: event.target.value }))}
          />
        </div>
      </div>
    </fieldset>
  );
}

export function CaptureFilters({
  draft,
  setDraft,
  folders,
  advancedCount,
  onApply,
}: {
  draft: CaptureFilterValues;
  setDraft: React.Dispatch<React.SetStateAction<CaptureFilterValues>>;
  folders: FolderOption[];
  advancedCount: number;
  onApply: (values: CaptureFilterValues) => void;
}) {
  const [advancedOpen, setAdvancedOpen] = React.useState(false);
  return (
    <>
      <Input
        aria-label="Buscar configurações de captura"
        placeholder="Buscar por CNJ, processo ou cliente..."
        value={draft.q}
        onChange={(event) => setDraft((current) => ({ ...current, q: event.target.value }))}
        className="min-w-0 sm:max-w-xs sm:flex-1"
      />
      <FolderSelect
        value={draft.pasta}
        onChange={(pasta) => setDraft((current) => ({ ...current, pasta }))}
        options={folders}
      />
      <StatusSelect
        value={draft.status}
        onChange={(status) => setDraft((current) => ({ ...current, status }))}
      />
      <Select
        value={draft.sort}
        onValueChange={(sort) => setDraft((current) => ({ ...current, sort }))}
      >
        <SelectTrigger aria-label="Ordenação" className="sm:w-60">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="-criadoEm">Cadastro mais recente</SelectItem>
          <SelectItem value="criadoEm">Cadastro mais antigo</SelectItem>
          <SelectItem value="-atualizadoEm">Última atualização mais recente</SelectItem>
          <SelectItem value="atualizadoEm">Última atualização mais antiga</SelectItem>
          <SelectItem value="cnj">CNJ crescente</SelectItem>
          <SelectItem value="-cnj">CNJ decrescente</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" onClick={() => setAdvancedOpen(true)}>
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Mais filtros
        {advancedCount > 0 && (
          <Badge variant="secondary" className="ml-1">
            {advancedCount}
          </Badge>
        )}
      </Button>
      <Button onClick={() => onApply(draft)}>
        <Search className="size-4" aria-hidden="true" />
        Consultar
      </Button>
      <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <SheetContent side="right" className="scrollbar-fade w-full overflow-y-auto sm:w-[30rem]">
          <SheetTitle>Mais filtros</SheetTitle>
          <div className="flex flex-col gap-4 pt-2">
            <DateRange
              title="Data de cadastro"
              prefix="cadastro"
              draft={draft}
              setDraft={setDraft}
            />
            <DateRange
              title="Última atualização"
              prefix="atualizado"
              draft={draft}
              setDraft={setDraft}
            />
            <div className="space-y-1">
              <Label htmlFor="capture-client">Cliente</Label>
              <Input
                id="capture-client"
                value={draft.cliente}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, cliente: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="capture-process">Processo</Label>
              <Input
                id="capture-process"
                value={draft.processo}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, processo: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="capture-active-filter">Captura ativa</Label>
              <Select
                value={draft.ativa || 'TODAS'}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    ativa: value === 'TODAS' ? '' : (value as 'true' | 'false'),
                  }))
                }
              >
                <SelectTrigger id="capture-active-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS">Todas</SelectItem>
                  <SelectItem value="true">Ativas</SelectItem>
                  <SelectItem value="false">Pausadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DateRange
              title="Última sincronização"
              prefix="sync"
              draft={draft}
              setDraft={setDraft}
            />
            <Button
              onClick={() => {
                onApply(draft);
                setAdvancedOpen(false);
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
