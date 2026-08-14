'use client';

import * as React from 'react';
import { Users2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTable, type DataTableColumn } from '@/components/data-display/data-table';
import { FilterBar } from '@/components/data-display/filter-bar';
import { StatusBadge } from '@/components/data-display/status-badge';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { useCurrentUser } from '@/features/auth';
import { usePermission } from '@/hooks/use-permission';
import { isApiError } from '@/lib/api/errors';
import { useMembers } from '../api/queries';
import { useRemoveMember, useUpdateMemberRole } from '../api/mutations';
import { useRoles } from '../api/queries';
import type { MemberDTO } from '../api/team.api';

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function MembersTable() {
  const { data: members, isLoading, isError, refetch } = useMembers();
  const { data: roles } = useRoles();
  const { data: currentUser } = useCurrentUser();
  const canUpdateRole = usePermission('member:update-role');
  const canRemove = usePermission('member:remove');
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('TODOS');
  const [memberToRemove, setMemberToRemove] = React.useState<MemberDTO | null>(null);

  if (isError) {
    return <ErrorState title="Não foi possível carregar a equipe." onRetry={() => refetch()} />;
  }

  const activeOwners = (members ?? []).filter((m) => m.papel === 'OWNER' && m.status === 'ATIVO');

  const filtered = (members ?? []).filter((member) => {
    const matchesSearch =
      !search ||
      member.usuario.nome.toLowerCase().includes(search.toLowerCase()) ||
      member.usuario.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'TODOS' || member.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function handleRoleChange(member: MemberDTO, papelId: string) {
    updateRole.mutate(
      { memberId: member.id, papelId },
      {
        onSuccess: () => toast.success(`Papel de ${member.usuario.nome} atualizado.`),
        onError: (error) => {
          if (isApiError(error) && error.code === 'LAST_OWNER') {
            toast.error('O escritório precisa de ao menos um Owner ativo.');
            return;
          }
          if (isApiError(error) && error.code === 'SELF_ESCALATION_FORBIDDEN') {
            toast.error('Você não pode alterar o próprio papel.');
            return;
          }
          toast.error('Não foi possível atualizar o papel.');
        },
      },
    );
  }

  function handleRemoveConfirm() {
    if (!memberToRemove) return;
    removeMember.mutate(memberToRemove.id, {
      onSuccess: () => {
        toast.success(`${memberToRemove.usuario.nome} foi desativado.`);
        setMemberToRemove(null);
      },
      onError: (error) => {
        if (isApiError(error) && error.code === 'LAST_OWNER') {
          toast.error('O escritório precisa de ao menos um Owner ativo.');
        } else {
          toast.error('Não foi possível remover este membro.');
        }
        setMemberToRemove(null);
      },
    });
  }

  const columns: DataTableColumn<MemberDTO>[] = [
    {
      key: 'usuario',
      header: 'Membro',
      render: (member) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            {member.usuario.avatarUrl && <AvatarImage src={member.usuario.avatarUrl} alt="" />}
            <AvatarFallback>{initials(member.usuario.nome)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{member.usuario.nome}</p>
            <p className="truncate text-xs text-muted-foreground">{member.usuario.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'papel',
      header: 'Papel',
      render: (member) => {
        const isSelf = currentUser?.membro.id === member.id;
        const isLastOwner =
          member.papel === 'OWNER' && member.status === 'ATIVO' && activeOwners.length <= 1;

        if (!canUpdateRole) return <span className="text-sm">{member.papel}</span>;

        const select = (
          <Select
            value={roles?.find((r) => r.nome === member.papel)?.id}
            onValueChange={(papelId) => handleRoleChange(member, papelId)}
            disabled={isSelf || isLastOwner || updateRole.isPending}
          >
            <SelectTrigger className="h-8 w-40" aria-label={`Papel de ${member.usuario.nome}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles?.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

        if (isSelf || isLastOwner) {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">{select}</span>
              </TooltipTrigger>
              <TooltipContent>
                {isSelf
                  ? 'Você não pode alterar o próprio papel.'
                  : 'O escritório precisa de ao menos um Owner ativo.'}
              </TooltipContent>
            </Tooltip>
          );
        }
        return select;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (member) => <StatusBadge status={member.status} />,
    },
    {
      key: 'entrouEm',
      header: 'Desde',
      render: (member) => new Date(member.entrouEm).toLocaleDateString('pt-BR'),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (member) => {
        if (!canRemove || member.status !== 'ATIVO') return null;
        const isLastOwner = member.papel === 'OWNER' && activeOwners.length <= 1;

        const button = (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remover ${member.usuario.nome}`}
            disabled={isLastOwner}
            onClick={() => setMemberToRemove(member)}
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        );

        if (isLastOwner) {
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">{button}</span>
              </TooltipTrigger>
              <TooltipContent>O escritório precisa de ao menos um Owner ativo.</TooltipContent>
            </Tooltip>
          );
        }
        return button;
      },
    },
  ];

  return (
    <div>
      <FilterBar>
        <Input
          placeholder="Buscar por nome ou e-mail"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Buscar membros"
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-40" aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos os status</SelectItem>
            <SelectItem value="ATIVO">Ativo</SelectItem>
            <SelectItem value="INATIVO">Inativo</SelectItem>
            <SelectItem value="SUSPENSO">Suspenso</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(member) => member.id}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            icon={Users2}
            title={search || statusFilter !== 'TODOS' ? 'Nenhum membro encontrado' : 'Nenhum membro ainda'}
            description={
              search || statusFilter !== 'TODOS'
                ? 'Tente ajustar a busca ou os filtros.'
                : 'Convide o primeiro membro da equipe.'
            }
          />
        }
      />

      <ConfirmDialog
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        title="Remover membro"
        description={`${memberToRemove?.usuario.nome} será desativado e perderá acesso imediato ao escritório.`}
        confirmLabel="Remover"
        loading={removeMember.isPending}
        onConfirm={handleRemoveConfirm}
      />
    </div>
  );
}
