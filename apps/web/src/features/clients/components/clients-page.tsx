'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Download,
  MoreHorizontal,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Upload,
  UserRound,
} from 'lucide-react';
import { parseAsInteger, parseAsString, parseAsStringEnum, useQueryStates } from 'nuqs';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { FavoriteButton } from '@/components/data-display/favorite-button';
import { FilterBar } from '@/components/data-display/filter-bar';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePermission } from '@/hooks/use-permission';
import { isApiError } from '@/lib/api/errors';
import type { ClientMaritalStatus, ClientSummaryDTO, ClientType } from '../api/clients.api';
import { clientsApi } from '../api/clients.api';
import { useDeleteClient, useDuplicateClient, useToggleClientFavorite } from '../api/mutations';
import { useClient, useClients } from '../api/queries';
import { ClientFormDialog } from './client-form-dialog';

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatDocumento(doc: string | null, tipo: ClientType): string {
  if (!doc) return '—';
  return tipo === 'PESSOA_FISICA'
    ? doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    : doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h] ?? '')).join(',')),
  ];
  return lines.join('\n');
}

/** `useQueryStates` (nuqs) — reafirma FASE 0 do Prompt "Clientes e Contatos": primeiro uso real de sincronização de filtros com a URL no app; recarregar a página mantém tudo aplicado. */
const QUICK_FILTERS = {
  q: parseAsString.withDefault(''),
  tipo: parseAsStringEnum<ClientType | 'TODOS'>([
    'TODOS',
    'PESSOA_FISICA',
    'PESSOA_JURIDICA',
  ]).withDefault('TODOS'),
  sort: parseAsStringEnum<
    'nome' | '-nome' | '-criadoEm' | 'criadoEm' | 'atualizadoEm' | '-atualizadoEm'
  >(['nome', '-nome', '-criadoEm', 'criadoEm', 'atualizadoEm', '-atualizadoEm']).withDefault(
    '-criadoEm',
  ),
};

const ADVANCED_FILTERS = {
  nome: parseAsString.withDefault(''),
  telefone: parseAsString.withDefault(''),
  celular: parseAsString.withDefault(''),
  email: parseAsString.withDefault(''),
  cpf: parseAsString.withDefault(''),
  cnpj: parseAsString.withDefault(''),
  nomeMae: parseAsString.withDefault(''),
  nomePai: parseAsString.withDefault(''),
  profissao: parseAsString.withDefault(''),
  estadoCivil: parseAsString.withDefault(''),
  diaNascimento: parseAsInteger,
  mesNascimento: parseAsInteger,
  anoNascimento: parseAsInteger,
  dataCadastro: parseAsString.withDefault(''),
  periodoCadastroInicio: parseAsString.withDefault(''),
  periodoCadastroFim: parseAsString.withDefault(''),
  ultimaAlteracao: parseAsString.withDefault(''),
};

interface AdvancedFilterValues {
  nome: string;
  telefone: string;
  celular: string;
  email: string;
  cpf: string;
  cnpj: string;
  nomeMae: string;
  nomePai: string;
  profissao: string;
  estadoCivil: string;
  diaNascimento: number | null;
  mesNascimento: number | null;
  anoNascimento: number | null;
  dataCadastro: string;
  periodoCadastroInicio: string;
  periodoCadastroFim: string;
  ultimaAlteracao: string;
}

function AdvancedFiltersSheet({
  open,
  onOpenChange,
  values,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: AdvancedFilterValues;
  onApply: (values: Partial<AdvancedFilterValues>) => void;
}) {
  const toDraft = (v: AdvancedFilterValues): Record<keyof AdvancedFilterValues, string> =>
    Object.fromEntries(
      Object.entries(v).map(([k, val]) => [k, val === null ? '' : String(val)]),
    ) as Record<keyof AdvancedFilterValues, string>;

  const [draft, setDraft] = React.useState(() => toDraft(values));

  React.useEffect(() => {
    if (open) setDraft(toDraft(values));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function field(key: keyof typeof draft) {
    return {
      value: draft[key],
      onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        setDraft((d) => ({ ...d, [key]: event.target.value })),
    };
  }

  function commit() {
    const NUMERIC_KEYS = new Set(['diaNascimento', 'mesNascimento', 'anoNascimento']);
    const parsed: Partial<AdvancedFilterValues> = {};
    for (const [key, value] of Object.entries(draft)) {
      if (NUMERIC_KEYS.has(key)) {
        (parsed as Record<string, number | null>)[key] = value ? Number(value) : null;
      } else {
        (parsed as Record<string, string>)[key] = value;
      }
    }
    onApply(parsed);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="scrollbar-fade w-96 overflow-y-auto">
        <SheetTitle>Mais filtros</SheetTitle>
        <div className="flex flex-col gap-3 pt-2">
          <Input placeholder="Nome" aria-label="Filtrar por nome" {...field('nome')} />
          <Input placeholder="Telefone" aria-label="Filtrar por telefone" {...field('telefone')} />
          <Input placeholder="Celular" aria-label="Filtrar por celular" {...field('celular')} />
          <Input placeholder="E-mail" aria-label="Filtrar por e-mail" {...field('email')} />
          <Input placeholder="CPF" aria-label="Filtrar por CPF" {...field('cpf')} />
          <Input placeholder="CNPJ" aria-label="Filtrar por CNPJ" {...field('cnpj')} />
          <Input
            placeholder="Nome da mãe"
            aria-label="Filtrar por nome da mãe"
            {...field('nomeMae')}
          />
          <Input
            placeholder="Nome do pai"
            aria-label="Filtrar por nome do pai"
            {...field('nomePai')}
          />
          <Input
            placeholder="Profissão"
            aria-label="Filtrar por profissão"
            {...field('profissao')}
          />
          <Select
            value={draft.estadoCivil || 'TODOS'}
            onValueChange={(value) =>
              setDraft((current) => ({ ...current, estadoCivil: value === 'TODOS' ? '' : value }))
            }
          >
            <SelectTrigger aria-label="Filtrar por estado civil">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos os estados civis</SelectItem>
              <SelectItem value="SOLTEIRO">Solteiro(a)</SelectItem>
              <SelectItem value="CASADO">Casado(a)</SelectItem>
              <SelectItem value="DIVORCIADO">Divorciado(a)</SelectItem>
              <SelectItem value="VIUVO">Viúvo(a)</SelectItem>
              <SelectItem value="UNIAO_ESTAVEL">União estável</SelectItem>
            </SelectContent>
          </Select>
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              min={1}
              max={31}
              placeholder="Dia"
              aria-label="Dia de nascimento"
              {...field('diaNascimento')}
            />
            <Input
              type="number"
              min={1}
              max={12}
              placeholder="Mês"
              aria-label="Mês de nascimento"
              {...field('mesNascimento')}
            />
            <Input
              type="number"
              min={1900}
              placeholder="Ano"
              aria-label="Ano de nascimento"
              {...field('anoNascimento')}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Data de cadastro</label>
            <Input type="date" aria-label="Data de cadastro" {...field('dataCadastro')} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Período de cadastro (início)
              </label>
              <Input
                type="date"
                aria-label="Período de cadastro início"
                {...field('periodoCadastroInicio')}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Período de cadastro (fim)
              </label>
              <Input
                type="date"
                aria-label="Período de cadastro fim"
                {...field('periodoCadastroFim')}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Última alteração</label>
            <Input type="date" aria-label="Última alteração" {...field('ultimaAlteracao')} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const cleared = Object.fromEntries(
                Object.keys(draft).map((k) => [k, '']),
              ) as typeof draft;
              setDraft(cleared);
              onApply(
                Object.fromEntries(
                  Object.keys(cleared).map((k) => [k, null]),
                ) as Partial<AdvancedFilterValues>,
              );
            }}
          >
            Limpar
          </Button>
          <Button
            type="button"
            onClick={() => {
              commit();
              onOpenChange(false);
            }}
          >
            Consultar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function ClientsPage() {
  const canCreate = usePermission('client:create');
  const canUpdate = usePermission('client:update');
  const canDelete = usePermission('client:delete');
  const canExport = usePermission('client:export');

  const [quick, setQuick] = useQueryStates(QUICK_FILTERS);
  const [advanced, setAdvanced] = useQueryStates(ADVANCED_FILTERS);
  const [search, setSearch] = React.useState(quick.q);
  const debouncedSearch = useDebouncedValue(search);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  React.useEffect(() => {
    setQuick({ q: debouncedSearch || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editingClient, setEditingClient] = React.useState<ClientSummaryDTO | null>(null);
  const [clientToDelete, setClientToDelete] = React.useState<ClientSummaryDTO | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const filters = {
    q: quick.q || undefined,
    tipo: quick.tipo === 'TODOS' ? undefined : quick.tipo,
    sort: quick.sort,
    nome: advanced.nome || undefined,
    telefone: advanced.telefone || undefined,
    celular: advanced.celular || undefined,
    email: advanced.email || undefined,
    cpf: advanced.cpf || undefined,
    cnpj: advanced.cnpj || undefined,
    nomeMae: advanced.nomeMae || undefined,
    nomePai: advanced.nomePai || undefined,
    profissao: advanced.profissao || undefined,
    estadoCivil: (advanced.estadoCivil || undefined) as ClientMaritalStatus | undefined,
    diaNascimento: advanced.diaNascimento ?? undefined,
    mesNascimento: advanced.mesNascimento ?? undefined,
    anoNascimento: advanced.anoNascimento ?? undefined,
    dataCadastro: advanced.dataCadastro || undefined,
    periodoCadastroInicio: advanced.periodoCadastroInicio || undefined,
    periodoCadastroFim: advanced.periodoCadastroFim || undefined,
    ultimaAlteracao: advanced.ultimaAlteracao || undefined,
  };

  const { data, isLoading, isError, refetch, isFetching } = useClients(filters);
  const duplicateClient = useDuplicateClient();
  const deleteClient = useDeleteClient();
  const toggleFavorite = useToggleClientFavorite();

  if (isError) {
    return (
      <div>
        <PageHeader title="Clientes" />
        <ErrorState title="Não foi possível carregar os clientes." onRetry={() => refetch()} />
      </div>
    );
  }

  const advancedActiveCount = Object.values(advanced).filter((v) => v !== null && v !== '').length;
  const activeFilterCount =
    [!!quick.q, quick.tipo !== 'TODOS'].filter(Boolean).length + advancedActiveCount;
  const hasActiveFilters = activeFilterCount > 0;

  function clearFilters() {
    setSearch('');
    setQuick({ q: null, tipo: null, sort: null });
    setAdvanced(Object.fromEntries(Object.keys(ADVANCED_FILTERS).map((k) => [k, null])));
  }

  function handleDuplicate(client: ClientSummaryDTO) {
    duplicateClient.mutate(client.id, {
      onSuccess: () => toast.success(`"${client.nome}" duplicado.`),
      onError: () => toast.error('Não foi possível duplicar este cliente.'),
    });
  }

  function handleDeleteConfirm() {
    if (!clientToDelete) return;
    deleteClient.mutate(clientToDelete.id, {
      onSuccess: () => {
        toast.success(`${clientToDelete.nome} foi excluído.`);
        setClientToDelete(null);
      },
      onError: (error) => {
        if (isApiError(error) && error.code === 'HAS_ACTIVE_LEGAL_CASES') {
          toast.error('Este cliente possui processos vinculados e não pode ser excluído.');
        } else {
          toast.error('Não foi possível excluir este cliente.');
        }
        setClientToDelete(null);
      },
    });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { items, truncado, limite } = await clientsApi.export(filters);
      const csv = toCsv(
        items.map((row) => ({
          Nome: row.nome,
          Tipo: row.tipo === 'PESSOA_FISICA' ? 'Pessoa Física' : 'Pessoa Jurídica',
          Documento: row.documento ?? '',
          Email: row.email,
          Telefone: row.telefone,
          Celular: row.celular,
          'Data de cadastro': new Date(row.criadoEm).toLocaleDateString('pt-BR'),
          'Última alteração': new Date(row.atualizadoEm).toLocaleDateString('pt-BR'),
        })),
      );
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clientes-e-contatos-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(
        truncado
          ? `Exportação limitada às primeiras ${limite} linhas.`
          : `${items.length} clientes exportados.`,
      );
    } catch {
      toast.error('Não foi possível exportar os clientes.');
    } finally {
      setExporting(false);
    }
  }

  const columns: DataTableColumn<ClientSummaryDTO>[] = [
    {
      key: 'foto',
      header: '',
      render: (client) => (
        <Avatar className="size-8">
          <AvatarImage src={client.avatarUrl ?? undefined} alt="" />
          <AvatarFallback>{initials(client.nome)}</AvatarFallback>
        </Avatar>
      ),
    },
    {
      key: 'nome',
      header: 'Cliente',
      render: (client) => (
        <div className="flex items-center gap-1.5">
          <Link href={`/clientes/${client.id}`} className="min-w-0 hover:underline">
            <p className="truncate text-sm font-medium">{client.nome}</p>
            <p className="truncate text-xs text-muted-foreground">
              {client.tipo === 'PESSOA_FISICA' ? 'Pessoa Física' : 'Pessoa Jurídica'}
            </p>
          </Link>
          <FavoriteButton
            favorito={client.favorito}
            isPending={toggleFavorite.isPending}
            label={
              client.favorito ? `Remover ${client.nome} dos favoritos` : `Favoritar ${client.nome}`
            }
            onToggle={() => toggleFavorite.mutate(client.id)}
          />
        </div>
      ),
    },
    {
      key: 'documento',
      header: 'CPF/CNPJ',
      render: (client) => (
        <span className="text-sm tabular-nums">
          {formatDocumento(client.documento, client.tipo)}
        </span>
      ),
    },
    {
      key: 'contato',
      header: 'Telefone / E-mail',
      render: (client) => (
        <div className="text-sm">
          <p className="truncate">{client.telefones[0] ?? '—'}</p>
          <p className="truncate text-xs text-muted-foreground">{client.emails[0] ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'categoria',
      header: 'Tipo',
      render: (client) => (client.tipo === 'PESSOA_FISICA' ? 'Pessoa Física' : 'Pessoa Jurídica'),
    },
    {
      key: 'criadoEm',
      header: 'Cadastro',
      render: (client) => new Date(client.criadoEm).toLocaleDateString('pt-BR'),
    },
    {
      key: 'ultimaMovimentacaoEm',
      header: 'Última alteração',
      render: (client) => new Date(client.ultimaMovimentacaoEm).toLocaleDateString('pt-BR'),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (client) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Ações para ${client.nome}`}>
              <MoreHorizontal className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/clientes/${client.id}`}>Visualizar</Link>
            </DropdownMenuItem>
            {canUpdate && (
              <DropdownMenuItem onSelect={() => setEditingClient(client)}>Editar</DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => toggleFavorite.mutate(client.id)}>
              {client.favorito ? 'Desfavoritar' : 'Favoritar'}
            </DropdownMenuItem>
            {canCreate && (
              <DropdownMenuItem onSelect={() => handleDuplicate(client)}>Duplicar</DropdownMenuItem>
            )}
            <DropdownMenuItem
              disabled
              title="Em breve — nenhum canal de mensageria integrado ainda"
            >
              Enviar mensagem
            </DropdownMenuItem>
            {canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => setClientToDelete(client)}
                >
                  Excluir
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Clientes"
        description={
          !isLoading && data
            ? `${data.items.length}${data.nextCursor ? '+' : ''} ${data.items.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}`
            : 'Pessoas físicas e jurídicas atendidas pelo escritório.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              aria-label="Atualizar lista"
              disabled={isFetching}
            >
              <RefreshCw
                className={`size-4 ${isFetching ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
            </Button>
            {canExport && (
              <Button variant="outline" onClick={handleExport} loading={exporting}>
                <Download className="size-4" aria-hidden="true" />
                Exportar
              </Button>
            )}
            <Button variant="outline" disabled title="Importação em massa — em breve">
              <Upload className="size-4" aria-hidden="true" />
              Importar
            </Button>
            {canCreate && (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Novo cliente
              </Button>
            )}
          </div>
        }
      />

      <FilterBar activeCount={activeFilterCount} onClear={clearFilters}>
        <Input
          placeholder="Buscar por nome, razão social ou documento"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Buscar clientes"
          className="sm:max-w-xs"
        />
        <Select
          value={quick.tipo}
          onValueChange={(v) => setQuick({ tipo: v as typeof quick.tipo })}
        >
          <SelectTrigger className="sm:w-44" aria-label="Filtrar por tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os tipos</SelectItem>
            <SelectItem value="PESSOA_FISICA">Pessoa Física</SelectItem>
            <SelectItem value="PESSOA_JURIDICA">Pessoa Jurídica</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={quick.sort}
          onValueChange={(v) => setQuick({ sort: v as typeof quick.sort })}
        >
          <SelectTrigger className="sm:w-52" aria-label="Ordenar por">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="-criadoEm">Cadastro mais recente</SelectItem>
            <SelectItem value="criadoEm">Cadastro mais antigo</SelectItem>
            <SelectItem value="nome">Nome (A-Z)</SelectItem>
            <SelectItem value="-nome">Nome (Z-A)</SelectItem>
            <SelectItem value="-atualizadoEm">Última alteração mais recente</SelectItem>
            <SelectItem value="atualizadoEm">Última alteração mais antiga</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setAdvancedOpen(true)}>
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Mais filtros
          {advancedActiveCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {advancedActiveCount}
            </Badge>
          )}
        </Button>
      </FilterBar>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        rowKey={(client) => client.id}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={UserRound}
            title={hasActiveFilters ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda'}
            description={
              hasActiveFilters
                ? 'Tente ajustar a busca ou os filtros.'
                : 'Cadastre o primeiro cliente do escritório.'
            }
            action={
              !hasActiveFilters && canCreate ? (
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="size-4" aria-hidden="true" />
                  Novo cliente
                </Button>
              ) : undefined
            }
          />
        }
      />

      {data?.nextCursor && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Mostrando {data.items.length} clientes — refine a busca para ver outros.
        </p>
      )}

      <AdvancedFiltersSheet
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        values={advanced}
        onApply={(values) => setAdvanced(values)}
      />

      <ClientFormDialog open={formOpen} onOpenChange={setFormOpen} />
      {editingClient && (
        <EditClientBridge clientId={editingClient.id} onClose={() => setEditingClient(null)} />
      )}

      <ConfirmDialog
        open={!!clientToDelete}
        onOpenChange={(open) => !open && setClientToDelete(null)}
        title="Excluir cliente"
        description={`${clientToDelete?.nome} será excluído. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleteClient.isPending}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

/**
 * A listagem só tem `ClientSummaryDTO` (sem endereço/observações); o
 * formulário de edição precisa do detalhe completo — esta ponte busca
 * `ClientDetailDTO` sob demanda só quando o menu "Editar" é acionado.
 */
function EditClientBridge({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const { data: client } = useClient(clientId);

  return (
    <ClientFormDialog client={client} open={!!client} onOpenChange={(open) => !open && onClose()} />
  );
}
