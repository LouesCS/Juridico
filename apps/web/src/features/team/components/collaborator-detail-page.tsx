'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  CheckSquare,
  ClipboardList,
  History,
  MoreHorizontal,
  Newspaper,
  Pencil,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PropertyRow } from '@/components/data-display/property-row';
import { QuickActionsCard } from '@/components/data-display/quick-actions-card';
import { RelatedPanel, type RelatedItem } from '@/components/data-display/related-panel';
import { StatusBadge } from '@/components/data-display/status-badge';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { ErrorState } from '@/components/feedback/error-state';
import { PlaceholderTabContent } from '@/components/feedback/placeholder-tab-content';
import { PageHeader } from '@/components/layout/page-header';
import { useCurrentPermissions, usePermission } from '@/hooks/use-permission';
import { useTabDeepLink } from '@/hooks/use-tab-deep-link';
import { isApiError } from '@/lib/api/errors';
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
import { useCollaborator } from '../api/queries';
import { CollaboratorFormDialog } from './collaborator-form-dialog';
import { CollaboratorPermissionsPanel } from './collaborator-permissions-dialog';
import { GrantAccessDialog } from './grant-access-dialog';

const VALID_TABS = new Set([
  'resumo',
  'dados-pessoais',
  'contato',
  'endereco',
  'profissional',
  'oab',
  'acesso',
  'permissoes',
  'grupos',
  'sessoes',
  'processos',
  'tarefas',
  'servicos',
  'registros-trabalho',
  'timeline',
  'auditoria',
]);

const ESTADO_CIVIL_LABEL: Record<string, string> = {
  SOLTEIRO: 'Solteiro(a)',
  CASADO: 'Casado(a)',
  DIVORCIADO: 'Divorciado(a)',
  VIUVO: 'Viúvo(a)',
  UNIAO_ESTAVEL: 'União estável',
};

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/**
 * Painel "Relacionados" — Processos/Tarefas/Serviços/Registros de Trabalho
 * ainda não têm um recorte por colaborador nesta Sprint (nenhum endpoint
 * `?colaboradorId=` especificado no contrato) — ficam esmaecidos, sem
 * `href`, reafirmando o mesmo princípio de `client-detail-page.tsx`. Grupos
 * já é real (`CollaboratorDetailDTO.grupos`).
 */
function collaboratorRelatedItems(
  collaborator: { grupos: { id: string; nome: string }[] },
  collaboratorId: string,
): RelatedItem[] {
  return [
    { label: 'Grupos', icon: UsersRound, href: `/colaboradores/${collaboratorId}?tab=grupos`, count: collaborator.grupos.length },
    { label: 'Processos', icon: Briefcase },
    { label: 'Tarefas', icon: CheckSquare },
    { label: 'Serviços', icon: Briefcase },
    { label: 'Registros de trabalho', icon: ClipboardList },
    { label: 'Publicações', icon: Newspaper },
  ];
}

export function CollaboratorDetailPage({ collaboratorId }: { collaboratorId: string }) {
  const router = useRouter();
  const [tab, setTab] = useTabDeepLink(VALID_TABS, 'resumo');
  const { data: collaborator, isLoading, isError, refetch } = useCollaborator(collaboratorId);

  const canUpdate = usePermission('member:update');
  const canRemove = usePermission('member:remove');
  const canInvite = usePermission('member:invite');
  const canManagePermissions = usePermission('role:manage');
  const atorPermissions = useCurrentPermissions();

  const blockMember = useBlockMember(collaboratorId);
  const unblockMember = useUnblockMember(collaboratorId);
  const suspendMember = useSuspendMember(collaboratorId);
  const unsuspendMember = useUnsuspendMember(collaboratorId);
  const revokeAccess = useRevokeAccess(collaboratorId);
  const revokeAllSessions = useRevokeAllSessions(collaboratorId);
  const grantAccessAgain = useGrantAccess(collaboratorId);
  const removeCollaborator = useRemoveMember();

  const [editOpen, setEditOpen] = React.useState(false);
  const [grantAccessOpen, setGrantAccessOpen] = React.useState(false);
  const [revokeAccessOpen, setRevokeAccessOpen] = React.useState(false);
  const [revokeSessionsOpen, setRevokeSessionsOpen] = React.useState(false);
  const [removeOpen, setRemoveOpen] = React.useState(false);

  if (isError) {
    return (
      <div>
        <PageHeader title="Colaborador" breadcrumbs={[{ label: 'Colaboradores', href: '/colaboradores' }]} />
        <ErrorState title="Não foi possível carregar este colaborador." onRetry={() => refetch()} />
      </div>
    );
  }

  if (isLoading || !collaborator) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  function handleResendInvite() {
    if (!collaborator?.papel) return;
    grantAccessAgain.mutate(
      { email: collaborator.email, papelId: collaborator.papel.id },
      {
        onSuccess: () => toast.success(`Convite reenviado para ${collaborator.email}.`),
        onError: () => toast.error('Não foi possível reenviar o convite.'),
      },
    );
  }

  function handleRemove() {
    removeCollaborator.mutate(collaboratorId, {
      onSuccess: () => {
        toast.success('Colaborador removido.');
        router.push('/colaboradores');
      },
      onError: (error) => {
        const code = isApiError(error) ? error.code : undefined;
        toast.error(
          code === 'LAST_OWNER'
            ? 'O escritório precisa de ao menos um Owner ativo.'
            : 'Não foi possível remover este colaborador.',
        );
        setRemoveOpen(false);
      },
    });
  }

  return (
    <div>
      <PageHeader
        title={collaborator.nome}
        breadcrumbs={[{ label: 'Colaboradores', href: '/colaboradores' }, { label: collaborator.nome }]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={collaborator.situacaoAcesso} />
            {(canUpdate || canRemove) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Mais ações">
                    <MoreHorizontal className="size-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canUpdate && (
                    <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                      <Pencil className="size-4" aria-hidden="true" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  {canRemove && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => setRemoveOpen(true)}
                    >
                      Remover colaborador
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="dados-pessoais">Dados pessoais</TabsTrigger>
            <TabsTrigger value="contato">Contato</TabsTrigger>
            <TabsTrigger value="endereco">Endereço</TabsTrigger>
            <TabsTrigger value="profissional">Dados profissionais</TabsTrigger>
            <TabsTrigger value="oab">OAB</TabsTrigger>
            <TabsTrigger value="acesso">Acesso ao sistema</TabsTrigger>
            <TabsTrigger value="permissoes">Permissões</TabsTrigger>
            <TabsTrigger value="grupos">Grupos</TabsTrigger>
            <TabsTrigger value="sessoes">Sessões</TabsTrigger>
            <TabsTrigger value="processos">Processos</TabsTrigger>
            <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
            <TabsTrigger value="servicos">Serviços</TabsTrigger>
            <TabsTrigger value="registros-trabalho">Registros de Trabalho</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <PropertyRow label="Nome" value={collaborator.nome} />
                <PropertyRow label="Cargo" value={collaborator.cargo?.nome} />
                <PropertyRow
                  label="Grupos"
                  value={
                    collaborator.grupos.length > 0
                      ? collaborator.grupos.map((g) => g.nome).join(', ')
                      : undefined
                  }
                />
                <PropertyRow label="Papel" value={collaborator.papel?.nome} />
                <PropertyRow label="Situação de acesso" value={<StatusBadge status={collaborator.situacaoAcesso} />} />
                <PropertyRow
                  label="Data de entrada"
                  value={collaborator.dataEntrada ? new Date(collaborator.dataEntrada).toLocaleDateString('pt-BR') : undefined}
                />
                <PropertyRow label="Última modificação" value={new Date(collaborator.atualizadoEm).toLocaleDateString('pt-BR')} />
                <PropertyRow label="Data de cadastro" value={new Date(collaborator.criadoEm).toLocaleDateString('pt-BR')} />
                <PropertyRow label="Processos ativos" value="—" />
                <PropertyRow label="Tarefas pendentes" value="—" />
                <PropertyRow label="Último acesso" value="—" />
                <PropertyRow label="Sessões ativas" value="—" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dados-pessoais">
            <Card>
              <CardContent className="pt-6">
                <PropertyRow label="Nome social" value={collaborator.nomeSocial} />
                <PropertyRow label="CPF" value={collaborator.cpf} />
                <PropertyRow label="RG" value={collaborator.rg} />
                <PropertyRow
                  label="Data de nascimento"
                  value={collaborator.dataNascimento ? new Date(collaborator.dataNascimento).toLocaleDateString('pt-BR') : undefined}
                />
                <PropertyRow
                  label="Estado civil"
                  value={collaborator.estadoCivil ? ESTADO_CIVIL_LABEL[collaborator.estadoCivil] ?? collaborator.estadoCivil : undefined}
                />
                <PropertyRow label="Profissão" value={collaborator.profissao} />
                <PropertyRow label="Nome da mãe" value={collaborator.nomeMae} />
                <PropertyRow label="Nome do pai" value={collaborator.nomePai} />
                <PropertyRow label="Anotações" value={collaborator.anotacoes} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contato">
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <Avatar className="size-16">
                  <AvatarImage src={collaborator.fotoUrl ?? undefined} alt="" />
                  <AvatarFallback className="text-lg">{initials(collaborator.nome)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1">
                  <PropertyRow label="E-mail" value={collaborator.email} />
                  <PropertyRow label="Telefone" value={collaborator.telefone} />
                  <PropertyRow label="Celular" value={collaborator.celular} />
                  <PropertyRow label="WhatsApp" value={collaborator.whatsapp} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="endereco">
            <Card>
              <CardContent className="pt-6">
                <PropertyRow
                  label="Endereço"
                  value={
                    collaborator.endereco.logradouro
                      ? `${collaborator.endereco.logradouro}, ${collaborator.endereco.numero ?? 's/n'}`
                      : undefined
                  }
                />
                <PropertyRow label="Complemento" value={collaborator.endereco.complemento} />
                <PropertyRow label="Bairro" value={collaborator.endereco.bairro} />
                <PropertyRow
                  label="Cidade/UF"
                  value={
                    collaborator.endereco.cidade
                      ? `${collaborator.endereco.cidade}/${collaborator.endereco.uf ?? ''}`
                      : undefined
                  }
                />
                <PropertyRow label="CEP" value={collaborator.endereco.cep} />
                <PropertyRow label="País" value={collaborator.endereco.pais} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profissional">
            <Card>
              <CardContent className="pt-6">
                <PropertyRow label="Cargo" value={collaborator.cargo?.nome} />
                <PropertyRow label="Departamento" value={collaborator.departamento} />
                <PropertyRow label="Responsável" value={collaborator.responsavel?.nome} />
                <PropertyRow
                  label="Data de entrada"
                  value={collaborator.dataEntrada ? new Date(collaborator.dataEntrada).toLocaleDateString('pt-BR') : undefined}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="oab">
            <Card>
              <CardContent className="pt-6">
                <PropertyRow label="Número OAB" value={collaborator.numeroOab} />
                <PropertyRow label="UF OAB" value={collaborator.ufOab} />
                <PropertyRow label="Situação OAB" value={collaborator.situacaoOab} />
                <PropertyRow label="Observação OAB" value={collaborator.observacaoOab} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="acesso">
            <Card>
              <CardContent className="space-y-1 pt-6">
                <PropertyRow label="Acesso ao sistema" value={collaborator.temAcesso ? 'Sim' : 'Não'} />
                <PropertyRow label="Situação de acesso" value={<StatusBadge status={collaborator.situacaoAcesso} />} />
                <PropertyRow label="Papel" value={collaborator.papel?.nome} />
                <PropertyRow
                  label="Entrou em"
                  value={collaborator.entrouEm ? new Date(collaborator.entrouEm).toLocaleDateString('pt-BR') : undefined}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissoes">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Permissões do papel</CardTitle>
              </CardHeader>
              <CardContent>
                {canManagePermissions ? (
                  <CollaboratorPermissionsPanel papel={collaborator.papel} atorPermissions={atorPermissions} />
                ) : collaborator.papel ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="size-4" aria-hidden="true" />
                    Papel: {collaborator.papel.nome}. Você não tem permissão para ver o detalhe de permissões.
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Este colaborador não tem papel de sistema atribuído.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grupos">
            {collaborator.grupos.length === 0 ? (
              <PlaceholderTabContent
                icon={UsersRound}
                title="Nenhum grupo"
                description="Este colaborador ainda não faz parte de nenhum grupo de colaboradores."
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {collaborator.grupos.map((grupo) => (
                  <Badge key={grupo.id} variant="outline">
                    {grupo.nome}
                  </Badge>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sessoes">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sessões</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Esta versão não lista sessões individuais — apenas revogar todas de uma vez.
                </p>
                {canRemove && collaborator.temAcesso && (
                  <Button variant="outline" onClick={() => setRevokeSessionsOpen(true)}>
                    Revogar todas as sessões
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processos">
            <PlaceholderTabContent
              icon={Briefcase}
              title="Processos"
              description="Processos vinculados a este colaborador aparecerão aqui quando o recorte por colaborador for implementado."
            />
          </TabsContent>

          <TabsContent value="tarefas">
            <PlaceholderTabContent
              icon={CheckSquare}
              title="Tarefas"
              description="Tarefas atribuídas a este colaborador aparecerão aqui quando o recorte por colaborador for implementado."
            />
          </TabsContent>

          <TabsContent value="servicos">
            <PlaceholderTabContent
              icon={Briefcase}
              title="Serviços"
              description="Serviços prestados por este colaborador aparecerão aqui quando o módulo Serviços for implementado."
            />
          </TabsContent>

          <TabsContent value="registros-trabalho">
            <PlaceholderTabContent
              icon={ClipboardList}
              title="Registros de Trabalho"
              description="Registros de horas e atividades deste colaborador aparecerão aqui quando o módulo Registros de Trabalho for implementado."
            />
          </TabsContent>

          <TabsContent value="timeline">
            <PlaceholderTabContent
              icon={History}
              title="Timeline"
              description="O histórico de eventos deste colaborador aparecerá aqui quando este recorte de Timeline for implementado."
            />
          </TabsContent>

          <TabsContent value="auditoria">
            <PlaceholderTabContent
              icon={History}
              title="Auditoria"
              description="Alterações registradas sobre este colaborador aparecerão aqui quando o módulo Auditoria ganhar este recorte."
            />
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Colaborador</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarImage src={collaborator.fotoUrl ?? undefined} alt="" />
                <AvatarFallback>{initials(collaborator.nome)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{collaborator.nome}</p>
                <p className="truncate text-xs text-muted-foreground">{collaborator.email}</p>
              </div>
            </CardContent>
          </Card>

          <QuickActionsCard>
            {canUpdate && (
              <Button variant="outline" className="justify-start" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" aria-hidden="true" />
                Editar
              </Button>
            )}
            {canManagePermissions && collaborator.papel && (
              <Button variant="outline" className="justify-start" onClick={() => setTab('permissoes')}>
                <ShieldCheck className="size-4" aria-hidden="true" />
                Configurar permissões
              </Button>
            )}
            {canUpdate && collaborator.temAcesso && collaborator.situacaoAcesso === 'DESBLOQUEADO' && (
              <Button
                variant="outline"
                className="justify-start"
                onClick={() =>
                  blockMember.mutate(undefined, {
                    onSuccess: () => toast.success('Colaborador bloqueado.'),
                    onError: () => toast.error('Não foi possível bloquear.'),
                  })
                }
                disabled={blockMember.isPending}
              >
                Bloquear
              </Button>
            )}
            {canUpdate && collaborator.temAcesso && collaborator.situacaoAcesso === 'BLOQUEADO' && (
              <Button
                variant="outline"
                className="justify-start"
                onClick={() =>
                  unblockMember.mutate(undefined, {
                    onSuccess: () => toast.success('Colaborador desbloqueado.'),
                    onError: () => toast.error('Não foi possível desbloquear.'),
                  })
                }
                disabled={unblockMember.isPending}
              >
                Desbloquear
              </Button>
            )}
            {canUpdate && collaborator.temAcesso && collaborator.situacaoAcesso !== 'SUSPENSO' && (
              <Button
                variant="outline"
                className="justify-start"
                onClick={() =>
                  suspendMember.mutate(undefined, {
                    onSuccess: () => toast.success('Colaborador suspenso.'),
                    onError: () => toast.error('Não foi possível suspender.'),
                  })
                }
                disabled={suspendMember.isPending}
              >
                Suspender
              </Button>
            )}
            {canUpdate && collaborator.temAcesso && collaborator.situacaoAcesso === 'SUSPENSO' && (
              <Button
                variant="outline"
                className="justify-start"
                onClick={() =>
                  unsuspendMember.mutate(undefined, {
                    onSuccess: () => toast.success('Colaborador reativado.'),
                    onError: () => toast.error('Não foi possível reativar.'),
                  })
                }
                disabled={unsuspendMember.isPending}
              >
                Reativar
              </Button>
            )}
            {canInvite && !collaborator.temAcesso && (
              <Button variant="outline" className="justify-start" onClick={() => setGrantAccessOpen(true)}>
                Permitir acesso ao sistema
              </Button>
            )}
            {canRemove && collaborator.temAcesso && (
              <Button variant="outline" className="justify-start" onClick={() => setRevokeAccessOpen(true)}>
                Remover acesso ao sistema
              </Button>
            )}
            {canInvite && collaborator.situacaoAcesso === 'CONVITE_PENDENTE' && (
              <Button variant="outline" className="justify-start" onClick={handleResendInvite} disabled={grantAccessAgain.isPending}>
                Reenviar convite
              </Button>
            )}
            {canRemove && collaborator.temAcesso && (
              <Button variant="outline" className="justify-start" onClick={() => setRevokeSessionsOpen(true)}>
                Revogar sessões
              </Button>
            )}
          </QuickActionsCard>

          <RelatedPanel items={collaboratorRelatedItems(collaborator, collaboratorId)} />
        </div>
      </div>

      <CollaboratorFormDialog collaborator={collaborator} open={editOpen} onOpenChange={setEditOpen} />

      {grantAccessOpen && (
        <GrantAccessDialog
          open={grantAccessOpen}
          onOpenChange={setGrantAccessOpen}
          collaboratorId={collaboratorId}
          collaboratorName={collaborator.nome}
          currentEmail={collaborator.email}
        />
      )}

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
              toast.success('Acesso removido.');
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
      <ConfirmDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        title="Remover colaborador"
        description={`${collaborator.nome} será removido. Esta ação não pode ser desfeita.`}
        confirmLabel="Remover"
        loading={removeCollaborator.isPending}
        onConfirm={handleRemove}
      />
    </div>
  );
}
