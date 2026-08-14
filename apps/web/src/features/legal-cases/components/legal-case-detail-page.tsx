'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarClock,
  CheckSquare,
  FileSignature,
  FileText,
  History,
  Lock,
  MessageSquare,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  Users2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { PropertyRow } from '@/components/data-display/property-row';
import { QuickActionsCard } from '@/components/data-display/quick-actions-card';
import { RelatedPanel, type RelatedItem } from '@/components/data-display/related-panel';
import { StatusBadge } from '@/components/data-display/status-badge';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { ErrorState } from '@/components/feedback/error-state';
import { EmptyState } from '@/components/feedback/empty-state';
import { PlaceholderTabContent } from '@/components/feedback/placeholder-tab-content';
import { PageHeader } from '@/components/layout/page-header';
import { DeadlineFormDialog } from '@/features/deadlines/components/deadline-form-dialog';
import { CaseDocumentsTab, UploadDialog } from '@/features/documents';
import { CaseTimeline } from '@/features/timeline';
import { AiChat, AiSummaryPanel } from '@/features/ai';
import { AuditContextSection } from '@/features/audit/components/audit-context-section';
import { useRequests } from '@/features/requests/api/queries';
import { TaskFormDialog } from '@/features/tasks';
import { useTasks } from '@/features/tasks/api/queries';
import { judicialMovementsApi } from '@/features/judicial-movements/api/judicial-movements.api';
import { publicationsApi } from '@/features/publications/api/publications.api';
import { judicialCaptureApi } from '@/features/judicial-capture/api/judicial-capture.api';
import { extraMovementsApi } from '@/features/extrajudicial-movements/api/extrajudicial-movements.api';
import {
  useCompleteDeadline,
  useDuplicateDeadline,
  useReopenDeadline,
} from '@/features/deadlines/api/mutations';
import { useMembers } from '@/features/team';
import { usePermission } from '@/hooks/use-permission';
import { useTabDeepLink } from '@/hooks/use-tab-deep-link';
import {
  useArchiveLegalCase,
  useAddCaseTeamMember,
  useChangeCaseResponsible,
  useDeleteLegalCase,
  useRemoveCaseTeamMember,
  useRestoreLegalCase,
} from '../api/mutations';
import { useCaseDeadlines, useCaseParties, useCaseTeam, useLegalCase } from '../api/queries';
import { LegalCaseFormDialog } from './legal-case-form-dialog';
import { legalCaseStatusLabel } from '../domain/legal-case-status';
import type { LegalCaseDetailDTO, CasePartyDTO } from '../api/legal-cases.api';

const INSTANCIA_LABEL: Record<string, string> = {
  PRIMEIRA: '1ª instância',
  SEGUNDA: '2ª instância',
  SUPERIOR: 'Instância superior',
};
function instanciaLabel(value: string): string {
  return INSTANCIA_LABEL[value] ?? value;
}

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatCurrency(centavos: string | null): string {
  if (!centavos) return '—';
  return (Number(centavos) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const VALID_TABS = new Set([
  'resumo',
  'informacoes',
  'equipe',
  'prazos',
  'clientes',
  'documentos',
  'movimentacoes',
  'pedidos',
  'tarefas',
  'publicacoes',
  'captura',
  'timeline',
  'comentarios',
  'ia',
  'historico',
]);

/**
 * Itens do painel "Relacionados" (Prompt 11) — Prazos/Documentos/Timeline/
 * Equipe/Comentários/IA apontam para abas reais desta própria página;
 * Cliente aponta para a página do Cliente titular. Contratos/Garantias/
 * Publicações/Pedidos/Serviços/Registros de trabalho ficam sem `href`
 * (módulo de negócio ainda não existe — ver
 * docs/frontend-implementation/00-status.md).
 */
function caseRelatedItems(
  legalCase: { id: string; cliente: { id: string; nome: string } },
  deadlineCount: number | undefined,
): RelatedItem[] {
  return [
    { label: 'Cliente', icon: Users2, href: `/clientes/${legalCase.cliente.id}` },
    {
      label: 'Prazos',
      icon: CalendarClock,
      href: `/processos/${legalCase.id}?tab=prazos`,
      count: deadlineCount,
    },
    { label: 'Tarefas', icon: CheckSquare, href: `/tarefas/minhas?processoId=${legalCase.id}` },
    { label: 'Documentos', icon: FileText, href: `/processos/${legalCase.id}?tab=documentos` },
    { label: 'Timeline', icon: History, href: `/processos/${legalCase.id}?tab=timeline` },
    { label: 'Equipe', icon: ShieldCheck, href: `/processos/${legalCase.id}?tab=equipe` },
    {
      label: 'Comentários',
      icon: MessageSquare,
      href: `/processos/${legalCase.id}?tab=comentarios`,
    },
    { label: 'IA', icon: Sparkles, href: `/processos/${legalCase.id}?tab=ia` },
    { label: 'Contratos', icon: FileSignature },
  ];
}

export function LegalCaseDetailPage({ caseId }: { caseId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Deep-link de aba (`?tab=prazos`, `?tab=timeline`) — adicionado na Sprint 10
  // (Busca Global) e migrado para `useTabDeepLink` no Prompt 11 para também
  // funcionar quando o link vem do painel "Relacionados" da própria página.
  const [tab, setTab] = useTabDeepLink(VALID_TABS, 'resumo');
  const { data: legalCase, isLoading, isError, refetch } = useLegalCase(caseId);
  const { data: deadlines } = useCaseDeadlines(caseId);
  const canUpdate = usePermission('case:update');
  const canDelete = usePermission('case:delete');
  const canCreateDocument = usePermission('document:create');
  const canCreateTask = usePermission('task:create');
  const canMember = usePermission('member:read');
  const canClient = usePermission('client:read');
  const canFolderAll = usePermission('legal-folder:read:all');
  const canFolderTeam = usePermission('legal-folder:read:team');
  const canFolderAssigned = usePermission('legal-folder:read:assigned');
  const canFolder = canFolderAll || canFolderTeam || canFolderAssigned;
  const archiveCase = useArchiveLegalCase(caseId);
  const restoreCase = useRestoreLegalCase(caseId);
  const deleteCase = useDeleteLegalCase(caseId);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  if (isError) {
    return (
      <div>
        <PageHeader title="Processo" breadcrumbs={[{ label: 'Processos', href: '/processos' }]} />
        <ErrorState
          title="Não foi possível carregar este processo."
          description="O processo pode não existir, ter sido excluído, ou estar em segredo de justiça sem que você tenha permissão para vê-lo."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (isLoading || !legalCase) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  function handleDelete() {
    deleteCase.mutate(undefined, {
      onSuccess: () => {
        toast.success('Processo excluído.');
        router.push('/processos');
      },
      onError: () => {
        toast.error('Não foi possível excluir este processo.');
        setDeleteOpen(false);
      },
    });
  }

  if (legalCase.tipo === 'EXTRAJUDICIAL') {
    return (
      <ExtrajudicialCaseDetail
        legalCase={legalCase}
        canUpdate={canUpdate}
        canDelete={canDelete}
        deleteOpen={deleteOpen}
        deletePending={deleteCase.isPending}
        onDeleteOpenChange={setDeleteOpen}
        onDelete={handleDelete}
        onArchive={() => archiveCase.mutate(undefined)}
        editInitiallyOpen={searchParams.get('edit') === '1'}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={legalCase.titulo}
        breadcrumbs={[{ label: 'Processos', href: '/processos' }, { label: legalCase.titulo }]}
        description={legalCase.numeroCnj ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            {legalCase.segredoJustica && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="size-3" aria-hidden="true" />
                    Segredo de justiça
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  Este processo é confidencial — visível só a quem tem permissão.
                </TooltipContent>
              </Tooltip>
            )}
            <StatusBadge status={legalCase.status} />
            {canUpdate && (
              <LegalCaseFormDialog
                legalCase={legalCase}
                defaultOpen={searchParams.get('edit') === '1'}
                trigger={<Button variant="outline">Editar</Button>}
              />
            )}
            {(canUpdate || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Mais ações">
                    <MoreHorizontal className="size-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canUpdate && legalCase.status !== 'ARQUIVADO' && (
                    <DropdownMenuItem
                      onSelect={() =>
                        archiveCase.mutate(undefined, {
                          onSuccess: () => toast.success('Processo arquivado.'),
                          onError: () => toast.error('Não foi possível arquivar.'),
                        })
                      }
                    >
                      Arquivar
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      onSelect={() =>
                        restoreCase.mutate(undefined, {
                          onSuccess: () => toast.success('Processo restaurado.'),
                          onError: () => toast.error('Não foi possível restaurar.'),
                        })
                      }
                    >
                      Restaurar
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => setDeleteOpen(true)}
                    >
                      Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Dados principais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <DetailValue label="Número CNJ">{legalCase.numeroCnj}</DetailValue>
            <DetailValue label="Tipo de vinculação">{legalCase.poloCliente}</DetailValue>
            <DetailValue label="Tribunal">{legalCase.tribunal}</DetailValue>
            <DetailValue label="Área">{legalCase.area}</DetailValue>
            <DetailValue label="Instância judicial">
              {legalCase.instancia && instanciaLabel(legalCase.instancia)}
            </DetailValue>
            <DetailValue label="Situação">{legalCaseStatusLabel(legalCase.status)}</DetailValue>
            <DetailValue label="Comarca">{legalCase.comarca}</DetailValue>
            <DetailValue label="Unidade de origem">{legalCase.vara}</DetailValue>
            <DetailValue label="Data de entrada">
              {formatCaseDate(legalCase.dataDistribuicao)}
            </DetailValue>
            <DetailValue label="Data de conclusão">
              {formatCaseDate(legalCase.dataEncerramento)}
            </DetailValue>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Pasta</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <DetailValue label="Identificador">
              {legalCase.pastaJuridica ? (
                canFolder ? (
                  <EntityLink href={`/pastas/${legalCase.pastaJuridica.id}`}>
                    {legalCase.pastaJuridica.numeroInterno ?? legalCase.pastaJuridica.nome}
                  </EntityLink>
                ) : (
                  (legalCase.pastaJuridica.numeroInterno ?? legalCase.pastaJuridica.nome)
                )
              ) : (
                '--'
              )}
            </DetailValue>
            <DetailValue label="Encarregado">
              {legalCase.pastaJuridica?.encarregado ? (
                canMember ? (
                  <EntityLink href={`/colaboradores/${legalCase.pastaJuridica.encarregado.id}`}>
                    {legalCase.pastaJuridica.encarregado.nome}
                  </EntityLink>
                ) : (
                  legalCase.pastaJuridica.encarregado.nome
                )
              ) : (
                '--'
              )}
            </DetailValue>
            <DetailValue label="Cliente principal">
              {legalCase.pastaJuridica?.clientePrincipal ? (
                canClient ? (
                  <EntityLink href={`/clientes/${legalCase.pastaJuridica.clientePrincipal.id}`}>
                    {legalCase.pastaJuridica.clientePrincipal.nome}
                  </EntityLink>
                ) : (
                  legalCase.pastaJuridica.clientePrincipal.nome
                )
              ) : (
                '--'
              )}
            </DetailValue>
            <DetailValue label="Parte contrária principal">
              {legalCase.pastaJuridica?.parteContrariaPrincipal ? (
                canClient ? (
                  <EntityLink
                    href={`/clientes/${legalCase.pastaJuridica.parteContrariaPrincipal.id}`}
                  >
                    {legalCase.pastaJuridica.parteContrariaPrincipal.nome}
                  </EntityLink>
                ) : (
                  legalCase.pastaJuridica.parteContrariaPrincipal.nome
                )
              ) : (
                '--'
              )}
            </DetailValue>
          </CardContent>
        </Card>
      </div>

      <div className="my-6">
        <JudicialPartiesSection caseId={caseId} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="informacoes">Informações gerais</TabsTrigger>
            <TabsTrigger value="equipe">Equipe</TabsTrigger>
            <TabsTrigger value="prazos">Prazos</TabsTrigger>
            <TabsTrigger value="clientes">Clientes vinculados</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
            {legalCase.tipo === 'JUDICIAL' && (
              <TabsTrigger value="publicacoes">Publicações</TabsTrigger>
            )}
            {legalCase.tipo === 'JUDICIAL' && <TabsTrigger value="captura">Captura</TabsTrigger>}
            <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
            <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="comentarios">Comentários</TabsTrigger>
            <TabsTrigger value="ia">IA</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(legalCase.valorCausaCentavos)}
                  </p>
                  <p className="text-xs text-muted-foreground">Valor da causa</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold">v{legalCase.versao}</p>
                  <p className="text-xs text-muted-foreground">Versão do registro</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold">
                    {new Date(legalCase.criadoEm).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs text-muted-foreground">Aberto em</p>
                </div>
              </CardContent>
            </Card>
            {legalCase.descricao && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Descrição</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{legalCase.descricao}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="informacoes">
            <Card>
              <CardContent className="pt-6">
                <PropertyRow
                  label="Cliente"
                  value={
                    <Link href={`/clientes/${legalCase.cliente.id}`} className="hover:underline">
                      {legalCase.cliente.nome}
                    </Link>
                  }
                />
                <PropertyRow
                  label="Pasta Jurídica"
                  value={
                    legalCase.pastaJuridica ? (
                      <Link
                        href={`/pastas/${legalCase.pastaJuridica.id}`}
                        className="underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        {legalCase.pastaJuridica.nome}
                      </Link>
                    ) : (
                      '—'
                    )
                  }
                />
                <PropertyRow label="Polo do cliente" value={legalCase.poloCliente} />
                <PropertyRow label="Tipo" value={legalCase.tipo} />
                <PropertyRow label="Área" value={legalCase.area} />
                <PropertyRow label="Tribunal" value={legalCase.tribunal} />
                <PropertyRow label="Comarca" value={legalCase.comarca} />
                <PropertyRow label="Vara" value={legalCase.vara} />
                <PropertyRow label="Estado" value={legalCase.uf} />
                <PropertyRow label="Instância" value={legalCase.instancia} />
                <PropertyRow label="Classe processual" value={legalCase.classeProcessual} />
                <PropertyRow label="Assunto" value={legalCase.assunto} />
                <PropertyRow label="Observações" value={legalCase.observacoes} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipe">
            <CaseTeamTab caseId={caseId} />
          </TabsContent>

          <TabsContent value="prazos">
            <CaseDeadlinesTab caseId={caseId} />
          </TabsContent>

          <TabsContent value="clientes">
            <CasePartiesPanel caseId={caseId} client={legalCase.cliente} />
          </TabsContent>

          <TabsContent value="documentos">
            <CaseDocumentsTab processoId={caseId} />
          </TabsContent>

          <TabsContent value="movimentacoes">
            <CaseJudicialRelations
              processId={caseId}
              numeroCnj={legalCase.numeroCnj}
              view="movements"
            />
          </TabsContent>

          {legalCase.tipo === 'JUDICIAL' && (
            <TabsContent value="publicacoes">
              <CaseJudicialRelations
                processId={caseId}
                numeroCnj={legalCase.numeroCnj}
                view="publications"
              />
            </TabsContent>
          )}

          {legalCase.tipo === 'JUDICIAL' && (
            <TabsContent value="captura">
              <CaseJudicialRelations
                processId={caseId}
                numeroCnj={legalCase.numeroCnj}
                view="capture"
              />
            </TabsContent>
          )}

          <TabsContent value="pedidos">
            <CaseRequests processId={caseId} />
          </TabsContent>

          <TabsContent value="tarefas">
            <CaseTasks
              processId={caseId}
              folder={legalCase.pastaJuridica}
              canCreate={canCreateTask}
            />
          </TabsContent>

          <TabsContent value="timeline">
            <CaseTimeline processoId={caseId} />
          </TabsContent>

          <TabsContent value="comentarios">
            <PlaceholderTabContent
              icon={MessageSquare}
              title="Comentários"
              description="Comentários e menções da equipe sobre este processo aparecerão aqui quando o módulo Comments for implementado."
            />
          </TabsContent>

          <TabsContent value="ia" className="space-y-4">
            <AiSummaryPanel escopoTipo="PROCESSO" escopoId={caseId} />
            <AiChat scope={{ tipo: 'PROCESSO', id: caseId }} />
          </TabsContent>

          <TabsContent value="historico">
            <AuditContextSection resourceType="PROCESSO" resourceId={caseId} splitByPeriod />
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Painel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <PropertyRow label="Status" value={<StatusBadge status={legalCase.status} />} />
              <PropertyRow label="Área" value={legalCase.area} />
              <PropertyRow
                label="Cliente"
                value={
                  <Link href={`/clientes/${legalCase.cliente.id}`} className="hover:underline">
                    {legalCase.cliente.nome}
                  </Link>
                }
              />
              <PropertyRow label="Advogado" value={legalCase.responsavel?.nome} />
              <PropertyRow
                label="Próximo prazo"
                value={
                  legalCase.proximaDataRelevante
                    ? new Date(legalCase.proximaDataRelevante).toLocaleDateString('pt-BR')
                    : 'Sem prazo agendado'
                }
              />
            </CardContent>
          </Card>

          {(canUpdate || canCreateDocument || canCreateTask) && (
            <QuickActionsCard>
              {canUpdate && (
                <DeadlineFormDialog
                  fixedProcessoId={caseId}
                  trigger={
                    <Button variant="outline" className="justify-start">
                      <Plus className="size-4" aria-hidden="true" />
                      Novo prazo
                    </Button>
                  }
                />
              )}
              {canCreateDocument && (
                <UploadDialog
                  processoId={caseId}
                  clienteId={legalCase.cliente.id}
                  trigger={
                    <Button variant="outline" className="justify-start">
                      <Upload className="size-4" aria-hidden="true" />
                      Novo documento
                    </Button>
                  }
                />
              )}
              {canCreateTask && (
                <TaskFormDialog
                  mode="create"
                  fixedVinculos={[
                    {
                      tipoRecurso: 'PROCESSO',
                      recursoId: caseId,
                      label: `Processo ${legalCase.numeroCnj ?? legalCase.titulo}`,
                    },
                    ...(legalCase.pastaJuridica
                      ? [
                          {
                            tipoRecurso: 'PASTA_JURIDICA' as const,
                            recursoId: legalCase.pastaJuridica.id,
                            label: `Pasta ${legalCase.pastaJuridica.nome}`,
                          },
                        ]
                      : []),
                  ]}
                  trigger={
                    <Button variant="outline" className="justify-start">
                      <CheckSquare className="size-4" aria-hidden="true" />
                      Nova tarefa
                    </Button>
                  }
                />
              )}
            </QuickActionsCard>
          )}

          <RelatedPanel items={caseRelatedItems(legalCase, deadlines?.length)} />
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir processo"
        description={`"${legalCase.titulo}" será excluído. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleteCase.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function formatCaseDate(value: string | null): string {
  if (!value) return '--';
  const [date] = value.split('T');
  const [year, month, day] = date.split('-');
  return year && month && day ? `${day}/${month}/${year}` : '--';
}

function DetailValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <div
        className="min-w-0 truncate text-sm font-medium"
        title={typeof children === 'string' ? children : undefined}
      >
        {children || '--'}
      </div>
    </div>
  );
}

function EntityLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="block min-w-0 truncate rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      title={children}
    >
      {children}
    </Link>
  );
}

const participantLabels: Record<string, string> = {
  AUTOR: 'Requerente',
  REU: 'Requerido',
  ADVOGADO_AUTOR: 'Advogado do autor',
  ADVOGADO_REU: 'Advogado do réu',
  TERCEIRO_INTERESSADO: 'Terceiro interessado',
  ASSISTENTE: 'Assistente',
  MINISTERIO_PUBLICO: 'Ministério Público',
  TESTEMUNHA: 'Testemunha',
  PERITO: 'Perito',
  ADVOGADO_EXTERNO: 'Advogado externo',
  JUIZ: 'Juiz',
  PROMOTOR: 'Promotor',
  REPRESENTANTE_LEGAL: 'Representante legal',
  OUTRO: 'Outro',
};

function PartyCard({ title, parties }: { title: string; parties: CasePartyDTO[] }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {parties.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma parte vinculada.</p>
        ) : (
          parties.map((party) => (
            <div key={party.id} className="min-w-0">
              {party.clienteId ? (
                <EntityLink href={`/clientes/${party.clienteId}`}>{party.nome}</EntityLink>
              ) : (
                <p className="truncate text-sm font-medium" title={party.nome}>
                  {party.nome}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {participantLabels[party.tipo] ?? party.tipo}
              </p>
              {party.principal && <p className="text-xs font-medium">Principal</p>}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function PartyLine({ party }: { party: CasePartyDTO }) {
  return party.clienteId ? (
    <EntityLink href={`/clientes/${party.clienteId}`}>{party.nome}</EntityLink>
  ) : (
    <p className="min-w-0 truncate text-sm font-medium" title={party.nome}>
      {party.nome}
    </p>
  );
}

function PartyGroup({ label, items }: { label: string; items: CasePartyDTO[] }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      {items.length ? (
        <div className="space-y-1">
          {items.map((party) => (
            <PartyLine key={party.id} party={party} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">--</p>
      )}
    </div>
  );
}

/** Card "Autores"/"Réus" do Processo Judicial — combina a parte e seus
 * advogados no mesmo card (§19-20 da Sprint), reaproveitando a mesma
 * modelagem formal de `ParteProcesso.principal` já usada pelo
 * Extrajudicial, agora também para o papel de advogado por polo. */
function JudicialPartyCard({
  title,
  mainRole,
  lawyerRole,
  parties,
}: {
  title: string;
  mainRole: string;
  lawyerRole: string;
  parties: CasePartyDTO[];
}) {
  const main = parties.filter((p) => p.tipo === mainRole);
  const lawyers = parties.filter((p) => p.tipo === lawyerRole);
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <PartyGroup label={`${title.slice(0, -1)} principal`} items={main.filter((p) => p.principal)} />
        <PartyGroup label={`Outros ${title.toLowerCase()}`} items={main.filter((p) => !p.principal)} />
        <PartyGroup
          label={`Advogado principal ${title === 'Autores' ? 'dos autores' : 'dos réus'}`}
          items={lawyers.filter((p) => p.principal)}
        />
        <PartyGroup
          label={`Outros advogados ${title === 'Autores' ? 'dos autores' : 'dos réus'}`}
          items={lawyers.filter((p) => !p.principal)}
        />
      </CardContent>
    </Card>
  );
}

/** Card "Outras partes" do Judicial — agrupado por papel real (§32), ao
 * contrário do Extrajudicial que lista tudo junto (domínio mais simples
 * naquele contexto). */
function OtherPartiesCard({ parties }: { parties: CasePartyDTO[] }) {
  const groups = new Map<string, CasePartyDTO[]>();
  for (const party of parties) {
    const list = groups.get(party.tipo) ?? [];
    list.push(party);
    groups.set(party.tipo, list);
  }
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base">Outras partes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {groups.size === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma parte vinculada.</p>
        ) : (
          [...groups.entries()].map(([tipo, items]) => (
            <PartyGroup key={tipo} label={participantLabels[tipo] ?? tipo} items={items} />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function JudicialPartiesSection({ caseId }: { caseId: string }) {
  const parties = useCaseParties(caseId);
  if (parties.isLoading) return <Skeleton className="h-48" />;
  if (parties.isError)
    return (
      <ErrorState title="Não foi possível carregar as partes." onRetry={() => parties.refetch()} />
    );
  const outras = (parties.data ?? []).filter(
    (party) => !['AUTOR', 'REU', 'ADVOGADO_AUTOR', 'ADVOGADO_REU'].includes(party.tipo),
  );
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <JudicialPartyCard
        title="Autores"
        mainRole="AUTOR"
        lawyerRole="ADVOGADO_AUTOR"
        parties={parties.data ?? []}
      />
      <JudicialPartyCard
        title="Réus"
        mainRole="REU"
        lawyerRole="ADVOGADO_REU"
        parties={parties.data ?? []}
      />
      <OtherPartiesCard parties={outras} />
    </div>
  );
}

function ExtrajudicialCaseDetail({
  legalCase,
  canUpdate,
  canDelete,
  deleteOpen,
  deletePending,
  onDeleteOpenChange,
  onDelete,
  onArchive,
  editInitiallyOpen,
}: {
  legalCase: LegalCaseDetailDTO;
  canUpdate: boolean;
  canDelete: boolean;
  deleteOpen: boolean;
  deletePending: boolean;
  onDeleteOpenChange: (open: boolean) => void;
  onDelete: () => void;
  onArchive: () => void;
  editInitiallyOpen: boolean;
}) {
  const parties = useCaseParties(legalCase.id);
  const canMovements = usePermission('movement:read');
  const canRequests = usePermission('request:read');
  const canTasksAll = usePermission('task:read:all');
  const canTasksTeam = usePermission('task:read:team');
  const canTasksAssigned = usePermission('task:read:assigned');
  const canTasks = canTasksAll || canTasksTeam || canTasksAssigned;
  const canCreateTask = usePermission('task:create');
  const canMember = usePermission('member:read');
  const canClient = usePermission('client:read');
  const visibleTabs = [
    canMovements && 'movements',
    canRequests && 'requests',
    canTasks && 'tasks',
  ].filter(Boolean) as string[];
  const [activeTab, setActiveTab] = React.useState(visibleTabs[0] ?? '');
  const applicants = parties.data?.filter((party) => party.tipo === 'AUTOR') ?? [];
  const respondents = parties.data?.filter((party) => party.tipo === 'REU') ?? [];
  const others = parties.data?.filter((party) => !['AUTOR', 'REU'].includes(party.tipo)) ?? [];
  const identifier = legalCase.numeroInterno ?? legalCase.titulo;
  const folder = legalCase.pastaJuridica;

  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <PageHeader
        title="Processo extrajudicial"
        description={identifier}
        breadcrumbs={[
          { label: 'Processos extrajudiciais', href: '/processos-extrajudiciais' },
          { label: identifier },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={legalCase.status} />
            {canUpdate && (
              <LegalCaseFormDialog
                legalCase={legalCase}
                defaultOpen={editInitiallyOpen}
                trigger={<Button variant="outline">Editar</Button>}
              />
            )}
            {(canUpdate || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" aria-label="Ações">
                    <MoreHorizontal className="size-4" />
                    <span className="hidden sm:inline">Ações</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canUpdate && legalCase.status !== 'ARQUIVADO' && (
                    <DropdownMenuItem onSelect={onArchive}>Arquivar</DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => onDeleteOpenChange(true)}
                    >
                      Remover
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Dados principais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <DetailValue label="Protocolo">{identifier}</DetailValue>
            <DetailValue label="Instituição">{legalCase.instituicao ?? '--'}</DetailValue>
            <DetailValue label="Data de entrada">
              {formatCaseDate(legalCase.dataDistribuicao)}
            </DetailValue>
            <DetailValue label="Data de conclusão">
              {formatCaseDate(legalCase.dataEncerramento)}
            </DetailValue>
            <DetailValue label="Situação">{legalCaseStatusLabel(legalCase.status)}</DetailValue>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Pasta</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <DetailValue label="Identificador">
              {folder ? (
                <EntityLink href={`/pastas/${folder.id}`}>
                  {folder.numeroInterno ?? folder.nome}
                </EntityLink>
              ) : (
                '--'
              )}
            </DetailValue>
            <DetailValue label="Encarregado">
              {folder?.encarregado ? (
                canMember ? (
                  <EntityLink href={`/colaboradores/${folder.encarregado.id}`}>
                    {folder.encarregado.nome}
                  </EntityLink>
                ) : (
                  folder.encarregado.nome
                )
              ) : (
                '--'
              )}
            </DetailValue>
            <DetailValue label="Cliente principal">
              {folder?.clientePrincipal ? (
                canClient ? (
                  <EntityLink href={`/clientes/${folder.clientePrincipal.id}`}>
                    {folder.clientePrincipal.nome}
                  </EntityLink>
                ) : (
                  folder.clientePrincipal.nome
                )
              ) : (
                '--'
              )}
            </DetailValue>
            <DetailValue label="Parte contrária principal">
              {folder?.parteContrariaPrincipal ? (
                canClient ? (
                  <EntityLink href={`/clientes/${folder.parteContrariaPrincipal.id}`}>
                    {folder.parteContrariaPrincipal.nome}
                  </EntityLink>
                ) : (
                  folder.parteContrariaPrincipal.nome
                )
              ) : (
                '--'
              )}
            </DetailValue>
          </CardContent>
        </Card>
      </div>

      {parties.isLoading ? (
        <Skeleton className="h-48" />
      ) : parties.isError ? (
        <ErrorState
          title="Não foi possível carregar as partes."
          onRetry={() => parties.refetch()}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <PartyCard title="Requerentes" parties={applicants} />
          <PartyCard title="Requeridos" parties={respondents} />
          <PartyCard title="Outras partes" parties={others} />
        </div>
      )}

      {visibleTabs.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0">
          <div className="overflow-x-auto">
            <TabsList className="w-max min-w-full justify-start">
              {canMovements && (
                <TabsTrigger value="movements">Movimentações extrajudiciais</TabsTrigger>
              )}
              {canRequests && <TabsTrigger value="requests">Pedidos</TabsTrigger>}
              {canTasks && <TabsTrigger value="tasks">Tarefas</TabsTrigger>}
            </TabsList>
          </div>
          {canMovements && (
            <TabsContent value="movements">
              <CaseExtrajudicialMovements processId={legalCase.id} />
            </TabsContent>
          )}
          {canRequests && (
            <TabsContent value="requests">
              <CaseRequests processId={legalCase.id} />
            </TabsContent>
          )}
          {canTasks && (
            <TabsContent value="tasks">
              <CaseTasks processId={legalCase.id} folder={folder} canCreate={canCreateTask} />
            </TabsContent>
          )}
        </Tabs>
      )}

      <AuditContextSection resourceType="PROCESSO" resourceId={legalCase.id} splitByPeriod />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={onDeleteOpenChange}
        title="Remover processo extrajudicial"
        description={`“${legalCase.titulo}” será removido. Esta ação não pode ser desfeita.`}
        confirmLabel="Remover"
        loading={deletePending}
        onConfirm={onDelete}
      />
    </div>
  );
}

function CaseTasks({
  processId,
  folder,
  canCreate,
}: {
  processId: string;
  folder: LegalCaseDetailDTO['pastaJuridica'];
  canCreate: boolean;
}) {
  const [cursor, setCursor] = React.useState<string | undefined>();
  const [previousCursors, setPreviousCursors] = React.useState<Array<string | undefined>>([]);
  const tasks = useTasks({ processoId: processId, cursor, limit: 10, sort: '-criadoEm' });
  if (tasks.isLoading) return <Skeleton className="h-40" />;
  if (tasks.isError)
    return (
      <ErrorState title="Não foi possível carregar as Tarefas." onRetry={() => tasks.refetch()} />
    );
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Tarefas</CardTitle>
        {canCreate && (
          <TaskFormDialog
            mode="create"
            fixedVinculos={[
              { tipoRecurso: 'PROCESSO', recursoId: processId, label: 'Processo atual' },
              ...(folder
                ? [
                    {
                      tipoRecurso: 'PASTA_JURIDICA' as const,
                      recursoId: folder.id,
                      label: `Pasta ${folder.numeroInterno ?? folder.nome}`,
                    },
                  ]
                : []),
            ]}
            trigger={
              <Button size="icon" aria-label="Adicionar tarefa">
                <Plus className="size-4" />
              </Button>
            }
          />
        )}
      </CardHeader>
      <CardContent>
        {tasks.data?.items.length ? (
          <>
            <div className="divide-y rounded-lg border">
              {tasks.data.items.map((task) => (
                <div key={task.id} className="min-w-0 p-3">
                  <EntityLink href={`/tarefas/${task.id}`}>{task.titulo}</EntityLink>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="outline"
                disabled={previousCursors.length === 0}
                onClick={() => {
                  const copy = [...previousCursors];
                  setCursor(copy.pop());
                  setPreviousCursors(copy);
                }}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={!tasks.data.nextCursor}
                onClick={() => {
                  setPreviousCursors((values) => [...values, cursor]);
                  setCursor(tasks.data?.nextCursor ?? undefined);
                }}
              >
                Próxima
              </Button>
            </div>
          </>
        ) : (
          <EmptyState icon={CheckSquare} title="Nenhuma Tarefa relacionada." />
        )}
      </CardContent>
    </Card>
  );
}

function CasePartiesPanel({
  caseId,
  client,
}: {
  caseId: string;
  client: { id: string; nome: string };
}) {
  const parties = useCaseParties(caseId);
  if (parties.isLoading) return <Skeleton className="h-40" />;
  if (parties.isError)
    return (
      <ErrorState title="Não foi possível carregar as partes." onRetry={() => parties.refetch()} />
    );
  const applicants = parties.data?.filter((party) => party.tipo === 'AUTOR') ?? [];
  const respondents = parties.data?.filter((party) => party.tipo === 'REU') ?? [];
  const others = parties.data?.filter((party) => !['AUTOR', 'REU'].includes(party.tipo)) ?? [];
  const group = (title: string, items: typeof applicants) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length ? (
          items.map((party) => (
            <div key={party.id} className="min-w-0">
              <p className="truncate text-sm font-medium" title={party.nome}>
                {party.nome}
              </p>
              <p className="text-xs text-muted-foreground">{party.tipo}</p>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">--</p>
        )}
      </CardContent>
    </Card>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="sm:col-span-2">
        <CardContent className="pt-6">
          <Link
            href={`/clientes/${client.id}`}
            className="underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {client.nome}
          </Link>
        </CardContent>
      </Card>
      {group('Requerentes', applicants)}
      {group('Requeridos', respondents)}
      <div className="sm:col-span-2">{group('Outras partes', others)}</div>
    </div>
  );
}

function CaseRequests({ processId }: { processId: string }) {
  const requests = useRequests({ processoId: processId, page: 1, limit: 10, sort: '-criadoEm' });
  if (requests.isLoading) return <Skeleton className="h-40" />;
  if (requests.isError)
    return (
      <ErrorState
        title="Não foi possível carregar os Pedidos."
        onRetry={() => requests.refetch()}
      />
    );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pedidos ({requests.data?.total ?? 0})</CardTitle>
      </CardHeader>
      <CardContent>
        {requests.data?.items.length ? (
          <div className="divide-y rounded-lg border">
            {requests.data.items.map((request) => (
              <div key={request.id} className="p-3">
                <Link
                  href={`/pedidos/${request.id}`}
                  className="underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  {request.descricao}
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum Pedido relacionado.</p>
        )}
      </CardContent>
    </Card>
  );
}

function CaseExtrajudicialMovements({ processId }: { processId: string }) {
  const canRead = usePermission('movement:read');
  const [page, setPage] = React.useState(1);
  const query = useQuery({
    queryKey: ['extrajudicial-movements', 'process', processId, page],
    queryFn: () =>
      extraMovementsApi.list({ processoId: processId, page, limit: 10, sort: '-dataMovimentacao' }),
    enabled: canRead,
  });

  if (!canRead)
    return (
      <PlaceholderTabContent
        icon={ShieldCheck}
        title="Acesso restrito"
        description="Você não possui permissão para consultar movimentações."
      />
    );
  if (query.isLoading) return <Skeleton className="h-48" />;
  if (query.isError)
    return (
      <ErrorState
        title="Não foi possível carregar as movimentações extrajudiciais."
        onRetry={() => query.refetch()}
      />
    );

  const total = query.data?.total ?? 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Movimentações extrajudiciais ({total})</CardTitle>
      </CardHeader>
      <CardContent>
        {!query.data?.items.length ? (
          <PlaceholderTabContent
            icon={FileSignature}
            title="Nenhuma movimentação extrajudicial"
            description="Não existem movimentações recebidas vinculadas a este Processo Extrajudicial."
          />
        ) : (
          <>
            <div className="divide-y rounded-lg border">
              {query.data.items.map((movement) => (
                <div
                  key={movement.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3"
                >
                  <div className="min-w-0">
                    <Link
                      className="rounded-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      href={`/movimentacoes-extrajudiciais/${movement.id}`}
                    >
                      {new Date(movement.dataMovimentacao).toLocaleDateString('pt-BR')}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">
                      {movement.tipo} · {movement.descricao}
                    </p>
                  </div>
                  <StatusBadge status={movement.status} />
                </div>
              ))}
            </div>
            {total > query.data.limit && (
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  disabled={page >= Math.ceil(total / query.data.limit)}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Próxima
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CaseJudicialRelations({
  processId,
  numeroCnj,
  view,
}: {
  processId: string;
  numeroCnj: string | null;
  view: 'movements' | 'publications' | 'capture';
}) {
  const [page, setPage] = React.useState(1);
  const canMovements = usePermission('movement:read');
  const canPublications = usePermission('publication:read');
  const canCapture = usePermission('capture:read');
  const movements = useQuery({
    queryKey: ['judicial-movements', 'process', processId, page],
    queryFn: () => judicialMovementsApi.list({ processoId: processId, page, limit: 10 }),
    enabled: view === 'movements' && canMovements,
  });
  const publications = useQuery({
    queryKey: ['publications', 'process', processId, page],
    queryFn: () => publicationsApi.list({ processoId: processId, page, limit: 10 }),
    enabled: view === 'publications' && canPublications,
  });
  const capture = useQuery({
    queryKey: ['capture-configurations', 'process-cnj', numeroCnj, page],
    queryFn: () => judicialCaptureApi.list({ cnj: numeroCnj ?? undefined, page, limit: 10 }),
    enabled: view === 'capture' && canCapture && Boolean(numeroCnj),
  });

  const allowed =
    (view === 'movements' && canMovements) ||
    (view === 'publications' && canPublications) ||
    (view === 'capture' && canCapture);
  if (!allowed) {
    return (
      <PlaceholderTabContent
        icon={ShieldCheck}
        title="Acesso restrito"
        description="Você não possui permissão para consultar este recurso."
      />
    );
  }
  if (view === 'capture' && !numeroCnj) {
    return (
      <PlaceholderTabContent
        icon={FileSignature}
        title="Sem CNJ"
        description="Informe o número CNJ para relacionar configurações de captura."
      />
    );
  }

  const query = view === 'movements' ? movements : view === 'publications' ? publications : capture;
  if (query.isLoading) return <Skeleton className="h-40 w-full" />;
  if (query.isError)
    return (
      <ErrorState
        title="Não foi possível carregar os dados relacionados."
        onRetry={() => query.refetch()}
      />
    );
  const result = query.data;
  const items = result?.items ?? [];
  const total = result?.total ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {view === 'movements'
            ? 'Movimentações judiciais'
            : view === 'publications'
              ? 'Publicações'
              : 'Configurações de captura'}{' '}
          ({total})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum registro relacionado.</p>
        ) : (
          items.map((item) => {
            if (view === 'movements') {
              const movement = item as Awaited<
                ReturnType<typeof judicialMovementsApi.list>
              >['items'][number];
              return (
                <div key={movement.id} className="rounded-md border p-3">
                  <Link
                    className="rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    href={`/movimentacoes-judiciais/${movement.id}`}
                  >
                    {new Date(movement.dataMovimento).toLocaleDateString('pt-BR')}
                  </Link>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{movement.descricao}</p>
                </div>
              );
            }
            if (view === 'publications') {
              const publication = item as Awaited<
                ReturnType<typeof publicationsApi.list>
              >['items'][number];
              return (
                <div key={publication.id} className="rounded-md border p-3">
                  <Link
                    className="rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    href={`/publicacoes?publicacao=${publication.id}`}
                  >
                    {publication.dataPublicacao
                      ? new Date(publication.dataPublicacao).toLocaleDateString('pt-BR')
                      : publication.numeroCnj}
                  </Link>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {publication.conteudo ?? 'Sem conteúdo.'}
                  </p>
                </div>
              );
            }
            const configuration = item as Awaited<
              ReturnType<typeof judicialCaptureApi.list>
            >['items'][number];
            return (
              <div key={configuration.id} className="rounded-md border p-3">
                <Link
                  className="rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  href={`/configuracoes-captura?configuracao=${configuration.id}`}
                >
                  {configuration.numeroCnj}
                </Link>
                <p className="text-sm text-muted-foreground">{configuration.status}</p>
              </div>
            );
          })
        )}
        {total > 10 && (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 10 >= total}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CaseTeamTab({ caseId }: { caseId: string }) {
  const { data: team, isLoading, isError, refetch } = useCaseTeam(caseId);
  const { data: members } = useMembers();
  const canManage = usePermission('case:team:manage');
  const canUpdate = usePermission('case:update');
  const addMember = useAddCaseTeamMember(caseId);
  const removeMember = useRemoveCaseTeamMember(caseId);
  const changeResponsible = useChangeCaseResponsible(caseId);
  const [selectedMemberId, setSelectedMemberId] = React.useState('');

  if (isError)
    return <ErrorState title="Não foi possível carregar a equipe." onRetry={() => refetch()} />;
  if (isLoading) return <Skeleton className="h-40 w-full" />;

  const teamMemberIds = new Set((team ?? []).map((t) => t.membroId));
  const availableMembers = (members ?? []).filter(
    (m) => m.status === 'ATIVO' && !teamMemberIds.has(m.id),
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Equipe do processo</CardTitle>
        {canManage && availableMembers.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger className="w-48" aria-label="Adicionar membro">
                <SelectValue placeholder="Selecionar membro" />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.usuario.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!selectedMemberId || addMember.isPending}
              onClick={() =>
                addMember.mutate(selectedMemberId, {
                  onSuccess: () => {
                    toast.success('Membro adicionado à equipe.');
                    setSelectedMemberId('');
                  },
                  onError: () => toast.error('Não foi possível adicionar este membro.'),
                })
              }
            >
              <Plus className="size-4" aria-hidden="true" />
              Adicionar
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!team || team.length === 0 ? (
          <PlaceholderTabContent
            icon={Users2}
            title="Sem equipe"
            description="Nenhum membro na equipe deste processo ainda."
          />
        ) : (
          <ul className="space-y-2">
            {team.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarFallback>{initials(member.nome ?? '?')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{member.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.funcaoNoProcesso ??
                        (member.responsavelPrincipal
                          ? 'Responsável principal'
                          : 'Membro da equipe')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.responsavelPrincipal ? (
                    <Badge variant="success">Responsável</Badge>
                  ) : (
                    canUpdate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          changeResponsible.mutate(member.membroId, {
                            onSuccess: () =>
                              toast.success(`${member.nome} agora é o responsável principal.`),
                            onError: () => toast.error('Não foi possível trocar o responsável.'),
                          })
                        }
                      >
                        Tornar responsável
                      </Button>
                    )
                  )}
                  {canManage && !member.responsavelPrincipal && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover ${member.nome}`}
                      onClick={() =>
                        removeMember.mutate(member.membroId, {
                          onSuccess: () => toast.success(`${member.nome} removido da equipe.`),
                          onError: () => toast.error('Não foi possível remover.'),
                        })
                      }
                    >
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CaseDeadlinesTab({ caseId }: { caseId: string }) {
  const { data: deadlines, isLoading, isError, refetch } = useCaseDeadlines(caseId);
  const canUpdate = usePermission('case:update');
  const completeDeadline = useCompleteDeadline();
  const reopenDeadline = useReopenDeadline();
  const duplicateDeadline = useDuplicateDeadline();

  if (isError)
    return <ErrorState title="Não foi possível carregar os prazos." onRetry={() => refetch()} />;
  if (isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-3">
      {canUpdate && (
        <div className="flex justify-end">
          <DeadlineFormDialog fixedProcessoId={caseId} />
        </div>
      )}
      {!deadlines || deadlines.length === 0 ? (
        <PlaceholderTabContent
          icon={UserRound}
          title="Sem prazos"
          description="Nenhum prazo cadastrado para este processo ainda."
        />
      ) : (
        <ul className="space-y-2">
          {deadlines.map((deadline) => (
            <li
              key={deadline.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{deadline.titulo}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(deadline.dataVencimento).toLocaleDateString('pt-BR')} · {deadline.tipo}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={deadline.status} />
                {canUpdate && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Ações para ${deadline.titulo}`}
                      >
                        <MoreHorizontal className="size-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {deadline.status !== 'CONCLUIDO' && (
                        <DropdownMenuItem
                          onSelect={() =>
                            completeDeadline.mutate(
                              { processoId: caseId, prazoId: deadline.id },
                              {
                                onSuccess: () => toast.success('Prazo concluído.'),
                                onError: () => toast.error('Não foi possível concluir.'),
                              },
                            )
                          }
                        >
                          Concluir
                        </DropdownMenuItem>
                      )}
                      {(deadline.status === 'CONCLUIDO' || deadline.status === 'CANCELADO') && (
                        <DropdownMenuItem
                          onSelect={() =>
                            reopenDeadline.mutate(
                              { processoId: caseId, prazoId: deadline.id },
                              {
                                onSuccess: () => toast.success('Prazo reaberto.'),
                                onError: () => toast.error('Não foi possível reabrir.'),
                              },
                            )
                          }
                        >
                          Reabrir
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onSelect={() =>
                          duplicateDeadline.mutate(
                            { processoId: caseId, prazoId: deadline.id },
                            {
                              onSuccess: () => toast.success('Prazo duplicado.'),
                              onError: () => toast.error('Não foi possível duplicar.'),
                            },
                          )
                        }
                      >
                        Duplicar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
