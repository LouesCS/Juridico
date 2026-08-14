'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Download,
  MoreHorizontal,
  Plus,
  RefreshCw,
  SlidersHorizontal,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { FilterBar } from '@/components/data-display/filter-bar';
import { StatusBadge } from '@/components/data-display/status-badge';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { useCargos, useCollaboratorGroups } from '@/features/configuration/api/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useCurrentPermissions, usePermission } from '@/hooks/use-permission';
import type {
  AcessoFiltro,
  CollaboratorFiltersInput,
  CollaboratorListItemDTO,
  CollaboratorSort,
  SituacaoFiltro,
} from '../api/collaborators.api';
import {
  useBlockMember,
  useGrantAccess,
  useRemoveMember,
  useRevokeAccess,
  useRevokeAllSessions,
  useSuspendMember,
  useUnblockMember,
  useUnsuspendMember,
} from '../api/mutations';
import { useCollaborator, useCollaborators } from '../api/queries';
import { CollaboratorFormDialog } from './collaborator-form-dialog';
import { CollaboratorPermissionsDialog } from './collaborator-permissions-dialog';
import { GrantAccessDialog } from './grant-access-dialog';
import { InvitationsTable } from './invitations-table';
import { InviteMemberDialog } from './invite-member-dialog';

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function toCsv(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const lines = [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h] ?? '')).join(','))];
  return lines.join('\n');
}

const SORT_OPTIONS: { value: CollaboratorSort; label: string }[] = [
  { value: 'nome_asc', label: 'Nome (A-Z)' },
  { value: 'nome_desc', label: 'Nome (Z-A)' },
  { value: 'cargo_asc', label: 'Cargo (A-Z)' },
  { value: 'cargo_desc', label: 'Cargo (Z-A)' },
  { value: 'nascimento_asc', label: 'Nascimento (mais antigo)' },
  { value: 'nascimento_desc', label: 'Nascimento (mais recente)' },
  { value: 'cadastro_desc', label: 'Cadastro mais recente' },
  { value: 'cadastro_asc', label: 'Cadastro mais antigo' },
  { value: 'alteracao_desc', label: 'Última alteração mais recente' },
  { value: 'alteracao_asc', label: 'Última alteração mais antiga' },
];

/** `useQueryStates` (nuqs) — mesmo padrão de `features/clients/components/clients-page.tsx`. */
const QUICK_FILTERS = {
  q: parseAsString.withDefault(''),
  grupoId: parseAsString.withDefault('TODOS'),
  cargoId: parseAsString.withDefault('TODOS'),
  acesso: parseAsStringEnum<AcessoFiltro>(['todos', 'com_acesso', 'sem_acesso']).withDefault('todos'),
  situacao: parseAsStringEnum<SituacaoFiltro>([
    'todos',
    'desbloqueado',
    'bloqueado',
    'suspenso',
    'convite_pendente',
    'inativo',
  ]).withDefault('todos'),
  sort: parseAsStringEnum<CollaboratorSort>(SORT_OPTIONS.map((o) => o.value) as CollaboratorSort[]).withDefault(
    'nome_asc',
  ),
};

const ADVANCED_FILTERS = {
  nome: parseAsString.withDefault(''),
  cpf: parseAsString.withDefault(''),
  email: parseAsString.withDefault(''),
  telefone: parseAsString.withDefault(''),
  nascimentoDia: parseAsInteger,
  nascimentoMes: parseAsInteger,
  nascimentoAno: parseAsInteger,
  nascimentoDe: parseAsString.withDefault(''),
  nascimentoAte: parseAsString.withDefault(''),
  cadastroDe: parseAsString.withDefault(''),
  cadastroAte: parseAsString.withDefault(''),
  alteracaoDe: parseAsString.withDefault(''),
  alteracaoAte: parseAsString.withDefault(''),
};

interface AdvancedFilterValues {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  nascimentoDia: number | null;
  nascimentoMes: number | null;
  nascimentoAno: number | null;
  nascimentoDe: string;
  nascimentoAte: string;
  cadastroDe: string;
  cadastroAte: string;
  alteracaoDe: string;
  alteracaoAte: string;
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
    Object.fromEntries(Object.entries(v).map(([k, val]) => [k, val === null ? '' : String(val)])) as Record<
      keyof AdvancedFilterValues,
      string
    >;

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
    const NUMERIC_KEYS = new Set(['nascimentoDia', 'nascimentoMes', 'nascimentoAno']);
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
          <Input placeholder="CPF" aria-label="Filtrar por CPF" {...field('cpf')} />
          <Input placeholder="E-mail" aria-label="Filtrar por e-mail" {...field('email')} />
          <Input placeholder="Telefone" aria-label="Filtrar por telefone" {...field('telefone')} />
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Data de nascimento</p>
            <div className="grid grid-cols-3 gap-2">
              <Input type="number" min={1} max={31} placeholder="Dia" aria-label="Dia de nascimento" {...field('nascimentoDia')} />
              <Input type="number" min={1} max={12} placeholder="Mês" aria-label="Mês de nascimento" {...field('nascimentoMes')} />
              <Input type="number" min={1900} placeholder="Ano" aria-label="Ano de nascimento" {...field('nascimentoAno')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Nascimento (de)</label>
              <Input type="date" aria-label="Nascimento a partir de" {...field('nascimentoDe')} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Nascimento (até)</label>
              <Input type="date" aria-label="Nascimento até" {...field('nascimentoAte')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Cadastro (de)</label>
              <Input type="date" aria-label="Cadastro a partir de" {...field('cadastroDe')} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Cadastro (até)</label>
              <Input type="date" aria-label="Cadastro até" {...field('cadastroAte')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Última alteração (de)</label>
              <Input type="date" aria-label="Última alteração a partir de" {...field('alteracaoDe')} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Última alteração (até)</label>
              <Input type="date" aria-label="Última alteração até" {...field('alteracaoAte')} />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const cleared = Object.fromEntries(Object.keys(draft).map((k) => [k, ''])) as typeof draft;
              setDraft(cleared);
              onApply(
                Object.fromEntries(Object.keys(cleared).map((k) => [k, null])) as Partial<AdvancedFilterValues>,
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

/**
 * Menu de ações de uma linha — cada ação é ocultada (não desabilitada)
 * quando falta a permissão correspondente (reafirma `use-permission.ts`).
 * Chaves de permissão para as ações novas (bloquear/suspender/conceder-
 * revogar acesso/revogar sessões) não estão especificadas no contrato desta
 * Sprint — reaproveitadas de `member:update`/`member:remove`/`member:invite`
 * existentes em vez de inventar chaves novas fora do catálogo real;
 * sinalizado no relatório para validação da equipe de Permissões.
 */
function CollaboratorRowActions({
  collaborator,
  perms,
  onEdit,
  onConfigurePermissions,
  onGrantAccess,
  onRemove,
}: {
  collaborator: CollaboratorListItemDTO;
  perms: { canUpdate: boolean; canRemove: boolean; canInvite: boolean; canManagePermissions: boolean };
  onEdit: () => void;
  onConfigurePermissions: () => void;
  onGrantAccess: () => void;
  onRemove: () => void;
}) {
  const blockMember = useBlockMember(collaborator.id);
  const unblockMember = useUnblockMember(collaborator.id);
  const suspendMember = useSuspendMember(collaborator.id);
  const unsuspendMember = useUnsuspendMember(collaborator.id);
  const revokeAccess = useRevokeAccess(collaborator.id);
  const revokeAllSessions = useRevokeAllSessions(collaborator.id);
  const grantAccessAgain = useGrantAccess(collaborator.id);
  const [revokeAccessOpen, setRevokeAccessOpen] = React.useState(false);
  const [revokeSessionsOpen, setRevokeSessionsOpen] = React.useState(false);

  function handleResendInvite() {
    if (!collaborator.papel) return;
    grantAccessAgain.mutate(
      { email: collaborator.email, papelId: collaborator.papel.id },
      {
        onSuccess: () => toast.success(`Convite reenviado para ${collaborator.email}.`),
        onError: () => toast.error('Não foi possível reenviar o convite.'),
      },
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Ações para ${collaborator.nome}`}>
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/colaboradores/${collaborator.id}`}>Visualizar</Link>
          </DropdownMenuItem>
          {perms.canUpdate && <DropdownMenuItem onSelect={onEdit}>Editar</DropdownMenuItem>}
          {perms.canManagePermissions && collaborator.papel && (
            <DropdownMenuItem onSelect={onConfigurePermissions}>Configurar permissões</DropdownMenuItem>
          )}
          {perms.canUpdate && collaborator.temAcesso && collaborator.situacaoAcesso === 'DESBLOQUEADO' && (
            <DropdownMenuItem
              onSelect={() =>
                blockMember.mutate(undefined, {
                  onSuccess: () => toast.success(`${collaborator.nome} foi bloqueado.`),
                  onError: () => toast.error('Não foi possível bloquear este colaborador.'),
                })
              }
            >
              Bloquear
            </DropdownMenuItem>
          )}
          {perms.canUpdate && collaborator.temAcesso && collaborator.situacaoAcesso === 'BLOQUEADO' && (
            <DropdownMenuItem
              onSelect={() =>
                unblockMember.mutate(undefined, {
                  onSuccess: () => toast.success(`${collaborator.nome} foi desbloqueado.`),
                  onError: () => toast.error('Não foi possível desbloquear este colaborador.'),
                })
              }
            >
              Desbloquear
            </DropdownMenuItem>
          )}
          {perms.canUpdate && collaborator.temAcesso && collaborator.situacaoAcesso !== 'SUSPENSO' && (
            <DropdownMenuItem
              onSelect={() =>
                suspendMember.mutate(undefined, {
                  onSuccess: () => toast.success(`${collaborator.nome} foi suspenso.`),
                  onError: () => toast.error('Não foi possível suspender este colaborador.'),
                })
              }
            >
              Suspender
            </DropdownMenuItem>
          )}
          {perms.canUpdate && collaborator.temAcesso && collaborator.situacaoAcesso === 'SUSPENSO' && (
            <DropdownMenuItem
              onSelect={() =>
                unsuspendMember.mutate(undefined, {
                  onSuccess: () => toast.success(`${collaborator.nome} foi reativado.`),
                  onError: () => toast.error('Não foi possível reativar este colaborador.'),
                })
              }
            >
              Reativar
            </DropdownMenuItem>
          )}
          {perms.canInvite && !collaborator.temAcesso && (
            <DropdownMenuItem onSelect={onGrantAccess}>Permitir acesso</DropdownMenuItem>
          )}
          {perms.canRemove && collaborator.temAcesso && (
            <DropdownMenuItem onSelect={() => setRevokeAccessOpen(true)}>Remover acesso</DropdownMenuItem>
          )}
          {perms.canInvite && collaborator.situacaoAcesso === 'CONVITE_PENDENTE' && (
            <DropdownMenuItem onSelect={handleResendInvite}>Reenviar convite</DropdownMenuItem>
          )}
          {perms.canRemove && collaborator.temAcesso && (
            <DropdownMenuItem onSelect={() => setRevokeSessionsOpen(true)}>Revogar sessões</DropdownMenuItem>
          )}
          {perms.canRemove && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onRemove}>
                Remover colaborador
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={revokeAccessOpen}
        onOpenChange={setRevokeAccessOpen}
        title="Remover acesso ao sistema"
        description={`${collaborator.nome} perderá o acesso ao sistema imediatamente. O cadastro do colaborador é mantido.`}
        confirmLabel="Remover acesso"
        loading={revokeAccess.isPending}
        onConfirm={() =>
          revokeAccess.mutate(undefined, {
            onSuccess: () => {
              toast.success(`Acesso de ${collaborator.nome} removido.`);
              setRevokeAccessOpen(false);
            },
            onError: () => toast.error('Não foi possível remover o acesso.'),
          })
        }
      />
      <ConfirmDialog
        open={revokeSessionsOpen}
        onOpenChange={setRevokeSessionsOpen}
        title="Revogar sessões"
        description={`Todas as sessões ativas de ${collaborator.nome} serão encerradas — será necessário entrar novamente.`}
        confirmLabel="Revogar sessões"
        loading={revokeAllSessions.isPending}
        onConfirm={() =>
          revokeAllSessions.mutate(undefined, {
            onSuccess: () => {
              toast.success('Sessões revogadas.');
              setRevokeSessionsOpen(false);
            },
            onError: () => toast.error('Não foi possível revogar as sessões.'),
          })
        }
      />
    </>
  );
}

export function CollaboratorsPage() {
  const canCreate = usePermission('member:create');
  const canUpdate = usePermission('member:update');
  const canRemove = usePermission('member:remove');
  const canInvite = usePermission('member:invite');
  const canExport = usePermission('member:export');
  const canManagePermissions = usePermission('role:manage');
  const atorPermissions = useCurrentPermissions();

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
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [permissionsTarget, setPermissionsTarget] = React.useState<CollaboratorListItemDTO | null>(null);
  const [grantAccessTarget, setGrantAccessTarget] = React.useState<CollaboratorListItemDTO | null>(null);
  const [collaboratorToRemove, setCollaboratorToRemove] = React.useState<CollaboratorListItemDTO | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const { data: grupos } = useCollaboratorGroups();
  const { data: cargos } = useCargos();
  const removeCollaborator = useRemoveMember();

  const filters: CollaboratorFiltersInput = {
    q: quick.q || undefined,
    grupoId: quick.grupoId === 'TODOS' ? undefined : quick.grupoId,
    cargoId: quick.cargoId === 'TODOS' ? undefined : quick.cargoId,
    acesso: quick.acesso === 'todos' ? undefined : quick.acesso,
    situacao: quick.situacao === 'todos' ? undefined : quick.situacao,
    sort: quick.sort,
    nome: advanced.nome || undefined,
    cpf: advanced.cpf || undefined,
    email: advanced.email || undefined,
    telefone: advanced.telefone || undefined,
    nascimentoDia: advanced.nascimentoDia ?? undefined,
    nascimentoMes: advanced.nascimentoMes ?? undefined,
    nascimentoAno: advanced.nascimentoAno ?? undefined,
    nascimentoDe: advanced.nascimentoDe || undefined,
    nascimentoAte: advanced.nascimentoAte || undefined,
    cadastroDe: advanced.cadastroDe || undefined,
    cadastroAte: advanced.cadastroAte || undefined,
    alteracaoDe: advanced.alteracaoDe || undefined,
    alteracaoAte: advanced.alteracaoAte || undefined,
  };

  /**
   * "Carregar mais" — divergência deliberada do padrão de `ClientsPage`
   * (que só mostra uma mensagem de rodapé, sem paginar de fato): com
   * múltiplos filtros por acesso/situação, a listagem de Colaboradores
   * tende a ser navegada em lotes; acumula páginas localmente (o cursor
   * nunca entra na URL — mesmo racional de "página" não fazer sentido
   * como estado compartilhável aqui). Qualquer mudança de filtro reseta o
   * cursor e a lista acumulada.
   */
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const filtersSignature = JSON.stringify(filters);
  React.useEffect(() => {
    setCursor(undefined);
  }, [filtersSignature]);

  const { data, isLoading, isError, refetch, isFetching } = useCollaborators({ ...filters, cursor });
  const [accumulated, setAccumulated] = React.useState<CollaboratorListItemDTO[]>([]);
  React.useEffect(() => {
    if (!data) return;
    setAccumulated((prev) => (cursor ? [...prev, ...data.items] : data.items));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (isError) {
    return (
      <div>
        <PageHeader title="Colaboradores" />
        <ErrorState title="Não foi possível carregar os colaboradores." onRetry={() => refetch()} />
      </div>
    );
  }

  const advancedActiveCount = Object.entries(advanced).filter(([, v]) => v !== null && v !== '').length;
  const activeFilterCount =
    [
      !!quick.q,
      quick.grupoId !== 'TODOS',
      quick.cargoId !== 'TODOS',
      quick.acesso !== 'todos',
      quick.situacao !== 'todos',
    ].filter(Boolean).length + advancedActiveCount;
  const hasActiveFilters = activeFilterCount > 0;

  function clearFilters() {
    setSearch('');
    setQuick({ q: null, grupoId: null, cargoId: null, acesso: null, situacao: null, sort: null });
    setAdvanced(Object.fromEntries(Object.keys(ADVANCED_FILTERS).map((k) => [k, null])));
  }

  function handleRemoveConfirm() {
    if (!collaboratorToRemove) return;
    removeCollaborator.mutate(collaboratorToRemove.id, {
      onSuccess: () => {
        toast.success(`${collaboratorToRemove.nome} foi removido.`);
        setCollaboratorToRemove(null);
      },
      onError: (error) => {
        const code = (error as { code?: string })?.code;
        toast.error(
          code === 'LAST_OWNER'
            ? 'O escritório precisa de ao menos um Owner ativo.'
            : 'Não foi possível remover este colaborador.',
        );
        setCollaboratorToRemove(null);
      },
    });
  }

  /**
   * Exportação CSV — o contrato desta Sprint não especifica um endpoint
   * `GET /members/export` (como existe para Clientes); implementado aqui
   * como um blob CSV puramente client-side sobre as linhas já carregadas
   * (`accumulated`, a página atual + quaisquer "Carregar mais"), não uma
   * exportação server-side do universo completo de colaboradores filtrados.
   */
  async function handleExport() {
    setExporting(true);
    try {
      const items = accumulated;
      const csv = toCsv(
        items.map((row) => ({
          Nome: row.nome,
          CPF: row.cpf ?? '',
          Email: row.email,
          Telefone: row.telefone ?? row.celular ?? '',
          Nascimento: row.dataNascimento ? new Date(row.dataNascimento).toLocaleDateString('pt-BR') : '',
          Cargo: row.cargo?.nome ?? '',
          Grupos: row.grupos.map((g) => g.nome).join('; '),
          Acesso: row.temAcesso ? 'Com acesso' : 'Sem acesso',
          Situação: row.situacaoAcesso,
          'Última alteração': new Date(row.atualizadoEm).toLocaleDateString('pt-BR'),
        })),
      );
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `colaboradores-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${items.length} colaboradores exportados.`);
    } catch {
      toast.error('Não foi possível exportar os colaboradores.');
    } finally {
      setExporting(false);
    }
  }

  const columns: DataTableColumn<CollaboratorListItemDTO>[] = [
    {
      key: 'foto',
      header: '',
      render: (c) => (
        <Avatar className="size-8">
          <AvatarImage src={c.fotoUrl ?? undefined} alt="" />
          <AvatarFallback>{initials(c.nome)}</AvatarFallback>
        </Avatar>
      ),
    },
    {
      key: 'nome',
      header: 'Nome',
      render: (c) => (
        <Link href={`/colaboradores/${c.id}`} className="min-w-0 hover:underline">
          <p className="truncate text-sm font-medium">{c.nome}</p>
          {c.nomeSocial && <p className="truncate text-xs text-muted-foreground">{c.nomeSocial}</p>}
        </Link>
      ),
    },
    { key: 'cpf', header: 'CPF', render: (c) => <span className="text-sm tabular-nums">{c.cpf ?? '—'}</span> },
    { key: 'email', header: 'E-mail', render: (c) => <span className="text-sm">{c.email}</span> },
    {
      key: 'telefone',
      header: 'Telefone',
      render: (c) => <span className="text-sm">{c.celular ?? c.telefone ?? '—'}</span>,
    },
    {
      key: 'nascimento',
      header: 'Nascimento',
      render: (c) => (c.dataNascimento ? new Date(c.dataNascimento).toLocaleDateString('pt-BR') : '—'),
    },
    { key: 'cargo', header: 'Cargo', render: (c) => c.cargo?.nome ?? '—' },
    {
      key: 'grupo',
      header: 'Grupo',
      render: (c) =>
        c.grupos.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {c.grupos.map((g) => (
              <Badge key={g.id} variant="outline">
                {g.nome}
              </Badge>
            ))}
          </div>
        ) : (
          '—'
        ),
    },
    {
      key: 'acesso',
      header: 'Acesso',
      render: (c) => <Badge variant={c.temAcesso ? 'success' : 'secondary'}>{c.temAcesso ? 'Com acesso' : 'Sem acesso'}</Badge>,
    },
    {
      key: 'situacao',
      header: 'Situação',
      render: (c) => <StatusBadge status={c.situacaoAcesso} />,
    },
    {
      key: 'atualizadoEm',
      header: 'Última modificação',
      render: (c) => new Date(c.atualizadoEm).toLocaleDateString('pt-BR'),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (c) => (
        <CollaboratorRowActions
          collaborator={c}
          perms={{ canUpdate, canRemove, canInvite, canManagePermissions }}
          onEdit={() => setEditingId(c.id)}
          onConfigurePermissions={() => setPermissionsTarget(c)}
          onGrantAccess={() => setGrantAccessTarget(c)}
          onRemove={() => setCollaboratorToRemove(c)}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Colaboradores"
        description={
          !isLoading && data
            ? `${data.total} ${data.total === 1 ? 'colaborador encontrado' : 'colaboradores encontrados'}`
            : 'Pessoas que atuam no escritório, com ou sem acesso ao sistema.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Atualizar lista" disabled={isFetching}>
              <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
            </Button>
            {canExport && (
              <Button variant="outline" onClick={handleExport} loading={exporting}>
                <Download className="size-4" aria-hidden="true" />
                Exportar
              </Button>
            )}
            {canCreate && (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="size-4" aria-hidden="true" />
                Novo colaborador
              </Button>
            )}
          </div>
        }
      />

      <Tabs defaultValue="colaboradores">
        <TabsList>
          <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
          <TabsTrigger value="convites">Convites</TabsTrigger>
        </TabsList>

        <TabsContent value="colaboradores">
          <FilterBar activeCount={activeFilterCount} onClear={clearFilters}>
            <Input
              placeholder="Buscar por nome, e-mail ou CPF"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Buscar colaboradores"
              className="sm:max-w-xs"
            />
            <Select value={quick.grupoId} onValueChange={(v) => setQuick({ grupoId: v })}>
              <SelectTrigger className="sm:w-44" aria-label="Filtrar por grupo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os grupos</SelectItem>
                {grupos?.map((grupo) => (
                  <SelectItem key={grupo.id} value={grupo.id}>
                    {grupo.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={quick.cargoId} onValueChange={(v) => setQuick({ cargoId: v })}>
              <SelectTrigger className="sm:w-44" aria-label="Filtrar por cargo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos os cargos</SelectItem>
                {cargos?.map((cargo) => (
                  <SelectItem key={cargo.id} value={cargo.id}>
                    {cargo.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={quick.acesso} onValueChange={(v) => setQuick({ acesso: v as AcessoFiltro })}>
              <SelectTrigger className="sm:w-44" aria-label="Filtrar por acesso ao sistema">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos (acesso)</SelectItem>
                <SelectItem value="com_acesso">Com acesso</SelectItem>
                <SelectItem value="sem_acesso">Sem acesso</SelectItem>
              </SelectContent>
            </Select>
            <Select value={quick.situacao} onValueChange={(v) => setQuick({ situacao: v as SituacaoFiltro })}>
              <SelectTrigger className="sm:w-48" aria-label="Filtrar por situação de acesso">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as situações</SelectItem>
                <SelectItem value="desbloqueado">Desbloqueado</SelectItem>
                <SelectItem value="bloqueado">Bloqueado</SelectItem>
                <SelectItem value="suspenso">Suspenso</SelectItem>
                <SelectItem value="convite_pendente">Convite pendente</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={quick.sort} onValueChange={(v) => setQuick({ sort: v as CollaboratorSort })}>
              <SelectTrigger className="sm:w-56" aria-label="Ordenar por">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
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
            data={accumulated}
            rowKey={(c) => c.id}
            isLoading={isLoading}
            emptyState={
              <EmptyState
                icon={UserRound}
                title={hasActiveFilters ? 'Nenhum colaborador encontrado' : 'Nenhum colaborador ainda'}
                description={
                  hasActiveFilters
                    ? 'Tente ajustar a busca ou os filtros.'
                    : 'Cadastre o primeiro colaborador do escritório.'
                }
                action={
                  !hasActiveFilters && canCreate ? (
                    <Button size="sm" onClick={() => setFormOpen(true)}>
                      <Plus className="size-4" aria-hidden="true" />
                      Novo colaborador
                    </Button>
                  ) : undefined
                }
              />
            }
          />

          {data && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground">
                Mostrando {accumulated.length} de {data.total} colaboradores.
              </p>
              {data.nextCursor && (
                <Button variant="outline" size="sm" loading={isFetching} onClick={() => setCursor(data.nextCursor!)}>
                  Carregar mais
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="convites">
          <div className="mb-4 flex justify-end">{canInvite && <InviteMemberDialog />}</div>
          <InvitationsTable />
        </TabsContent>
      </Tabs>

      <CollaboratorFormDialog open={formOpen} onOpenChange={setFormOpen} />
      {editingId && <EditCollaboratorBridge collaboratorId={editingId} onClose={() => setEditingId(null)} />}

      <CollaboratorPermissionsDialog
        open={!!permissionsTarget}
        onOpenChange={(open) => !open && setPermissionsTarget(null)}
        papel={permissionsTarget?.papel ?? null}
        atorPermissions={atorPermissions}
      />

      {grantAccessTarget && (
        <GrantAccessDialog
          open={!!grantAccessTarget}
          onOpenChange={(open) => !open && setGrantAccessTarget(null)}
          collaboratorId={grantAccessTarget.id}
          collaboratorName={grantAccessTarget.nome}
          currentEmail={grantAccessTarget.email}
        />
      )}

      <AdvancedFiltersSheet
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        values={advanced}
        onApply={(values) => setAdvanced(values)}
      />

      <ConfirmDialog
        open={!!collaboratorToRemove}
        onOpenChange={(open) => !open && setCollaboratorToRemove(null)}
        title="Remover colaborador"
        description={`${collaboratorToRemove?.nome} será removido. Esta ação não pode ser desfeita.`}
        confirmLabel="Remover"
        loading={removeCollaborator.isPending}
        onConfirm={handleRemoveConfirm}
      />
    </div>
  );
}

/**
 * A listagem só tem `CollaboratorListItemDTO`; o formulário de edição
 * precisa do detalhe completo — mesma ponte de `EditClientBridge`
 * (`features/clients/components/clients-page.tsx`), busca sob demanda.
 */
function EditCollaboratorBridge({ collaboratorId, onClose }: { collaboratorId: string; onClose: () => void }) {
  const { data: collaborator } = useCollaborator(collaboratorId);

  return (
    <CollaboratorFormDialog
      collaborator={collaborator}
      open={!!collaborator}
      onOpenChange={(open) => !open && onClose()}
    />
  );
}
