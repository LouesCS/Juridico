'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  ChevronDown,
  Copy,
  FileText,
  FolderKanban,
  History,
  Link2Off,
  LockKeyhole,
  Plus,
  Printer,
  Scale,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { AiSummaryPanel } from '@/features/ai/components/ai-summary-panel';
import { AuditContextSection } from '@/features/audit/components/audit-context-section';
import { tasksApi } from '@/features/tasks/api/tasks.api';
import { extraMovementsApi } from '@/features/extrajudicial-movements/api/extrajudicial-movements.api';
import { judicialMovementsApi } from '@/features/judicial-movements/api/judicial-movements.api';
import { LegalCaseFormDialog } from '@/features/legal-cases';
import { FolderRequestsTab } from '@/features/requests';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePermission } from '@/hooks/use-permission';
import { UploadDialog } from '@/features/documents/components/upload-dialog';
import { useOffice } from '@/features/office';
import { useDocuments } from '@/features/documents/api/queries';
import { documentsApi } from '@/features/documents/api/documents.api';
import { documentsKeys } from '@/features/documents/api/keys';
import { formatBytes } from '@/features/documents/domain/file-meta';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { legalFoldersApi } from '../api/legal-folders.api';
import { useLegalFolder } from '../api/queries';

const statusLabel: Record<string, string> = {
  BAIXADO: 'Baixado',
  CONTRARIO: 'Contrário',
  DESISTENCIA: 'Desistência',
  ANDAMENTO_FAVORAVEL: 'Andamento Favorável',
  INVIAVEL: 'Inviável',
  SUBSTABELECIDO: 'Substabelecido',
  SUSPENSO: 'Suspenso',
  EM_ANDAMENTO: 'Em andamento',
};
const date = (value: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '—');

export function LegalFolderDetailPage({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  const [completeOpen, setCompleteOpen] = React.useState(false);
  const [copyOpen, setCopyOpen] = React.useState(false);
  const [accessOpen, setAccessOpen] = React.useState(false);
  const [confidential, setConfidential] = React.useState(false);
  const [extraPage, setExtraPage] = React.useState(1);
  const [judicialPage, setJudicialPage] = React.useState(1);
  const [documentPage, setDocumentPage] = React.useState(1);
  const [documentSort, setDocumentSort] = React.useState<
    '-atualizadoEm' | 'atualizadoEm' | 'nome' | '-nome' | '-criadoEm' | 'criadoEm'
  >('-atualizadoEm');
  const query = useLegalFolder(id);
  const options = useQuery({
    queryKey: ['legal-folder-options'],
    queryFn: legalFoldersApi.options,
  });
  const canPublication = usePermission('publication:read');
  const canMovement = usePermission('movement:read');
  const canCapture = usePermission('capture:read');
  const canTaskAll = usePermission('task:read:all');
  const canTaskTeam = usePermission('task:read:team');
  const canTaskAssigned = usePermission('task:read:assigned');
  const canDocumentAll = usePermission('document:read:all');
  const canDocumentTeam = usePermission('document:read:team');
  const canDocumentAssigned = usePermission('document:read:assigned');
  const canCreateDocument = usePermission('document:create');
  const canUpdateDocument = usePermission('document:update');
  const canAi = usePermission('ai:summarize');
  const canUpdateFolder = usePermission('legal-folder:update');
  const canCreateFolder = usePermission('legal-folder:create');
  const canDeleteFolder = usePermission('legal-folder:delete');
  const canReadExtra = usePermission('extrajudicial-movement:read');
  const canMember = usePermission('member:read');
  const canClient = usePermission('client:read');
  const canCaseAll = usePermission('case:read:all');
  const canCaseTeam = usePermission('case:read:team');
  const canCaseAssigned = usePermission('case:read:assigned');
  const canCreateCase = usePermission('case:create');
  const canTask = canTaskAll || canTaskTeam || canTaskAssigned;
  const canDocument = canDocumentAll || canDocumentTeam || canDocumentAssigned;
  const canCase = canCaseAll || canCaseTeam || canCaseAssigned;
  const folderDocuments = useDocuments({
    resourceType: 'PASTA_JURIDICA',
    resourceId: id,
    page: documentPage,
    limit: 10,
    sort: documentSort,
  }, canDocument);
  const unlinkDocument = useMutation({
    mutationFn: (documentId: string) => documentsApi.unlinkLegalFolder(documentId, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: documentsKeys.all(escritorioAtivoId ?? ''),
      });
      toast.success('Documento desvinculado da Pasta.');
    },
    onError: () => toast.error('Não foi possível desvincular o documento da Pasta.'),
  });
  const tasks = useQuery({
    queryKey: ['tasks', 'legal-folder', id],
    queryFn: () => tasksApi.list({ pastaJuridicaId: id, limit: 10 }),
    enabled: canTask,
  });
  const extraMovements = useQuery({
    queryKey: ['extra-movements', 'legal-folder', id, extraPage],
    queryFn: () =>
      extraMovementsApi.list({
        pastaJuridicaId: id,
        page: extraPage,
        limit: 10,
        sort: '-dataMovimentacao',
      }),
    enabled: canReadExtra,
  });
  const judicialMovements = useQuery({
    queryKey: ['judicial-movements', 'legal-folder', id, judicialPage],
    queryFn: () =>
      judicialMovementsApi.list({
        pastaJuridicaId: id,
        page: judicialPage,
        limit: 10,
        sort: '-dataMovimento',
      }),
    enabled: canMovement,
  });
  const completeFolder = useMutation({
    mutationFn: () => legalFoldersApi.complete(id),
    onSuccess: async () => {
      setCompleteOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['legal-folder', id] });
      toast.success('Pasta concluída com sucesso.');
    },
    onError: () => toast.error('Não foi possível concluir a Pasta.'),
  });
  const copyFolder = useMutation({
    mutationFn: () => legalFoldersApi.copy(id),
    onSuccess: (created) => {
      setCopyOpen(false);
      toast.success('Pasta copiada com sucesso.');
      router.push(`/pastas/${created.id}`);
    },
    onError: () => toast.error('Não foi possível copiar a Pasta.'),
  });
  const saveAccess = useMutation({
    mutationFn: () => legalFoldersApi.update(id, { confidencial: confidential }),
    onSuccess: async () => {
      setAccessOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['legal-folder', id] });
      toast.success('Controle de acesso atualizado.');
    },
    onError: () => toast.error('Não foi possível atualizar o controle de acesso.'),
  });
  React.useEffect(() => {
    if (query.data) setConfidential(query.data.confidencial);
  }, [query.data]);

  if (query.isLoading) return <Skeleton className="h-96" />;
  if (query.isError || !query.data)
    return (
      <ErrorState title="Não foi possível carregar a Pasta." onRetry={() => query.refetch()} />
    );

  const folder = query.data;
  const processes = folder.processos.map(({ processo }) => processo);
  const judicialProcesses = processes.filter((process) => process.tipo !== 'EXTRAJUDICIAL');
  const extrajudicialProcesses = processes.filter((process) => process.tipo === 'EXTRAJUDICIAL');
  const captures = [
    ...folder.configuracoesCaptura.map((item) => ({ ...item, process: null })),
    ...processes.flatMap((process) =>
      process.configuracoesCaptura.map((item) => ({ ...item, process })),
    ),
  ].filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index);
  const publications = processes.flatMap((process) =>
    process.publicacoesCapturadas.map((item) => ({ ...item, process })),
  );
  const explicitLinks = folder.vinculosClientes ?? [];
  const otherClients = explicitLinks.filter((link) => link.tipo === 'CLIENTE');
  const otherParties = explicitLinks.filter((link) => link.tipo === 'PARTE_CONTRARIA');
  const interested = explicitLinks.filter((link) => link.tipo === 'INTERESSADO');
  const extraFields = (options.data?.camposExtras ?? [])
    .filter((field) => field.ativo)
    .sort((a, b) => a.ordem - b.ordem);
  const handlePrint = () => {
    document.body.classList.add('printing-legal-folder');
    window.addEventListener(
      'afterprint',
      () => document.body.classList.remove('printing-legal-folder'),
      { once: true },
    );
    window.print();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={folder.nome}
        description={folder.assunto ?? 'Pasta Jurídica'}
        breadcrumbs={[{ label: 'Pastas', href: '/pastas' }, { label: folder.nome }]}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Badge variant={folder.situacao === 'EM_ANDAMENTO' ? 'success' : 'secondary'}>
              {statusLabel[folder.situacao] ?? folder.situacao}
            </Badge>
            {canUpdateFolder && (
              <Button variant="outline" asChild>
                <Link href={`/pastas?editar=${folder.id}`}>Editar Pasta</Link>
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Ações <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                {canUpdateFolder && !folder.dataConclusao && (
                  <DropdownMenuItem onSelect={() => setCompleteOpen(true)}>
                    <CheckCircle2 className="size-4" />
                    Concluir
                  </DropdownMenuItem>
                )}
                {canUpdateFolder && (
                  <DropdownMenuItem onSelect={() => setAccessOpen(true)}>
                    <LockKeyhole className="size-4" />
                    Controle de acesso
                  </DropdownMenuItem>
                )}
                {canCreateFolder && (
                  <DropdownMenuItem onSelect={() => setCopyOpen(true)}>
                    <Copy className="size-4" />
                    Copiar pasta
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={handlePrint}>
                  <Printer className="size-4" />
                  Imprimir
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled
                  title="Disponível após a implementação do módulo Financeiro."
                >
                  <TrendingUp className="size-4" />
                  Adicionar prognóstico e valores
                </DropdownMenuItem>
                {canDeleteFolder && (
                  <DropdownMenuItem
                    disabled
                    title="Remoção não está disponível; arquivamento é um conceito distinto."
                  >
                    <Trash2 className="size-4" />
                    Remover
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled
                  title="A Timeline contextual ainda está disponível apenas para Processos."
                >
                  <History className="size-4" />
                  Timeline
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <ConfirmDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title="Concluir Pasta?"
        description="A Pasta será marcada como concluída. Os dados e vínculos existentes serão preservados."
        confirmLabel={completeFolder.isPending ? 'Concluindo...' : 'Concluir'}
        confirmVariant="default"
        loading={completeFolder.isPending}
        onConfirm={() => completeFolder.mutate()}
      />
      <ConfirmDialog
        open={copyOpen}
        onOpenChange={setCopyOpen}
        title="Copiar Pasta"
        description="Será criada uma nova Pasta utilizando os dados cadastrais desta Pasta. Não serão copiados Processos, Documentos, Tarefas, Capturas ou histórico."
        confirmLabel={copyFolder.isPending ? 'Copiando...' : 'Copiar pasta'}
        confirmVariant="default"
        loading={copyFolder.isPending}
        onConfirm={() => copyFolder.mutate()}
      />
      <Dialog open={accessOpen} onOpenChange={setAccessOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Controle de acesso</DialogTitle>
            <DialogDescription>Gerencie quem pode acessar esta Pasta.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-4 rounded-md border p-4">
            <div>
              <p className="text-sm font-medium">Pasta confidencial</p>
              <p className="text-xs text-muted-foreground">
                O acesso continua seguindo os escopos do Permission Engine.
              </p>
            </div>
            <Switch
              checked={confidential}
              onCheckedChange={setConfidential}
              aria-label="Pasta confidencial"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            ACL individual por Pasta permanece pendente.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAccessOpen(false)}
              disabled={saveAccess.isPending}
            >
              Cancelar
            </Button>
            <Button onClick={() => saveAccess.mutate()} loading={saveAccess.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 xl:grid-cols-3">
        <ModuleCard title="Dados principais">
          <Property label="Data de cadastro" value={date(folder.criadoEm)} />
          <Property label="Identificador" value={folder.nome} />
          <Property label="Assunto" value={folder.assunto} />
          <Property label="Categoria" value={folder.categoria} />
          <ResourceLink
            label="Encarregado"
            href={
              canMember && folder.encarregado ? `/colaboradores/${folder.encarregado.id}` : null
            }
            value={folder.encarregado?.nome}
          />
          <Property
            label="Etapa"
            value={folder.etapa === 'CADASTRAMENTO' ? 'Cadastramento' : folder.etapa}
          />
          <Property label="Situação" value={statusLabel[folder.situacao] ?? folder.situacao} />
          <ResourceLinks
            label="Interessados"
            items={interested.map((item) => ({
              value: item.cliente.nome,
              href: canClient ? `/clientes/${item.cliente.id}` : null,
            }))}
          />
        </ModuleCard>
        <ModuleCard title="Partes">
          <ResourceLink
            label="Cliente principal"
            href={canClient ? `/clientes/${folder.clientePrincipal.id}` : null}
            value={folder.clientePrincipal.nome}
          />
          <ResourceLinks
            label="Demais Clientes"
            items={otherClients.map((item) => ({
              value: item.cliente.nome,
              href: canClient ? `/clientes/${item.cliente.id}` : null,
            }))}
          />
          <ResourceLink
            label="Parte contrária principal"
            href={
              canClient && folder.parteContrariaPrincipal
                ? `/clientes/${folder.parteContrariaPrincipal.id}`
                : null
            }
            value={folder.parteContrariaPrincipal?.nome}
          />
          <ResourceLinks
            label="Demais Partes contrárias"
            items={otherParties.map((item) => ({
              value: item.cliente.nome,
              href: canClient ? `/clientes/${item.cliente.id}` : null,
            }))}
          />
        </ModuleCard>
        <ModuleCard title="Campos extras">
          {extraFields.length ? (
            extraFields.map((field) => (
              <Property
                key={field.id}
                label={field.nome}
                value={formatExtra(folder.camposExtrasValores[field.chave], field.tipo)}
              />
            ))
          ) : (
            <Empty title="Nenhum resultado encontrado." />
          )}
        </ModuleCard>
      </div>

      <TabbedModule
        title="Processual"
        defaultValue="judiciais"
        tabs={[
          {
            value: 'judiciais',
            label: `Processos judiciais (${judicialProcesses.length})`,
            content: (
              <div className="space-y-3">
                {canCreateCase && judicialProcesses.length === 0 && (
                  <LegalCaseFormDialog
                    fixedClienteId={folder.clientePrincipal.id}
                    fixedPastaJuridicaId={folder.id}
                    fixedTipo="JUDICIAL"
                    trigger={<Button>Adicionar Processo Judicial</Button>}
                  />
                )}
                <RealList empty="Nenhum Processo Judicial cadastrado.">
                {judicialProcesses.map((process) => (
                  <div key={process.id} className="flex items-start gap-3 rounded-md border p-3">
                    <Scale className="size-4" />
                    <div className="min-w-0">
                      <EntityAnchor
                        href={canCase ? `/processos/${process.id}` : null}
                        value={process.titulo}
                      />
                      <small className="block text-muted-foreground">
                        <EntityAnchor
                          href={canCase && process.numeroCnj ? `/processos/${process.id}` : null}
                          value={process.numeroCnj ?? 'Sem CNJ'}
                        />
                      </small>
                      {process.partes.slice(0, 2).map((party) => (
                        <small key={party.id} className="mr-3 block text-muted-foreground">
                          {party.tipo}:{' '}
                          <EntityAnchor
                            href={
                              canClient && party.clienteId ? `/clientes/${party.clienteId}` : null
                            }
                            value={party.nome}
                          />
                        </small>
                      ))}
                    </div>
                  </div>
                ))}
                </RealList>
              </div>
            ),
          },
          {
            value: 'extrajudiciais',
            label: `Processos extrajudiciais (${extrajudicialProcesses.length})`,
            content: (
              <div className="space-y-3">
                {canCreateCase && extrajudicialProcesses.length === 0 && (
                  <LegalCaseFormDialog
                    fixedClienteId={folder.clientePrincipal.id}
                    fixedPastaJuridicaId={folder.id}
                    fixedTipo="EXTRAJUDICIAL"
                    trigger={<Button>Adicionar Processo Extrajudicial</Button>}
                  />
                )}
                <RealList empty="Nenhum Processo Extrajudicial cadastrado.">
                  {extrajudicialProcesses.map((process) => (
                    <div key={process.id} className="rounded-md border p-3">
                      <EntityAnchor
                        href={canCase ? `/processos/${process.id}` : null}
                        value={process.numeroCnj ?? process.titulo}
                      />
                    </div>
                  ))}
                </RealList>
              </div>
            ),
          },
          { value: 'pedidos', label: 'Pedidos', content: <FolderRequestsTab pasta={{ id: folder.id, nome: folder.nome }} processos={processes} /> },
          { value: 'garantias', label: 'Garantias', content: <Unavailable /> },
          { value: 'contratos', label: 'Contratos', content: <Unavailable /> },
        ]}
      />

      {(canPublication || canMovement || canCapture) && (
        <TabbedModule
          title="Publicações"
          defaultValue={canPublication ? 'publicacoes' : canMovement ? 'movimentos' : 'captura'}
          tabs={[
            ...(canPublication
              ? [
                  {
                    value: 'publicacoes',
                    label: `Publicações (${publications.length})`,
                    content: (
                      <RealList empty="Nenhum resultado encontrado.">
                        {publications.map((item) => (
                          <div key={item.id} className="rounded-md border p-3">
                            <EntityAnchor
                              href={`/publicacoes?publicacao=${item.id}`}
                              value={date(item.dataPublicacao)}
                            />
                            <span className="ml-2">
                              <EntityAnchor
                                href={canCase ? `/processos/${item.process.id}` : null}
                                value={item.process.numeroCnj ?? item.process.titulo}
                              />
                            </span>
                            <p className="line-clamp-2 text-sm text-muted-foreground">
                              {item.conteudo}
                            </p>
                          </div>
                        ))}
                      </RealList>
                    ),
                  },
                ]
              : []),
            ...(canMovement
              ? [
                  {
                    value: 'movimentos',
                    label: `Movimentações judiciais (${judicialMovements.data?.total ?? 0})`,
                    content: judicialMovements.isLoading ? (
                      <Skeleton className="h-40" />
                    ) : judicialMovements.isError ? (
                      <ErrorState title="Não foi possível carregar as Movimentações Judiciais." onRetry={() => judicialMovements.refetch()} />
                    ) : (
                      <>
                        <RealList empty="Nenhum resultado encontrado.">
                          {(judicialMovements.data?.items ?? []).map((item) => (
                            <div key={item.id} className="rounded-md border p-3">
                              <EntityAnchor href={`/movimentacoes-judiciais/${item.id}`} value={date(item.dataMovimento)} />
                              <b className="ml-2">{item.tipo}</b>
                              {item.processo && <span className="ml-2 text-sm text-muted-foreground"><EntityAnchor href={canCase ? `/processos/${item.processo.id}` : null} value={item.processo.numeroCnj ?? item.processo.titulo} /></span>}
                              <p className="line-clamp-2 text-sm">{item.descricao}</p>
                            </div>
                        ))}
                      </RealList>
                      {(judicialMovements.data?.total ?? 0) > 10 && <div className="mt-3 flex justify-end gap-2"><Button variant="outline" disabled={judicialPage === 1} onClick={() => setJudicialPage((page) => page - 1)}>Anterior</Button><Button variant="outline" disabled={judicialPage * 10 >= (judicialMovements.data?.total ?? 0)} onClick={() => setJudicialPage((page) => page + 1)}>Próxima</Button></div>}
                      </>
                    ),
                  },
                ]
              : []),
            ...(canReadExtra
              ? [
                  {
                    value: 'extrajudiciais',
                    label: `Movimentações extrajudiciais (${extraMovements.data?.total ?? 0})`,
                    content: extraMovements.isLoading ? (
                      <Skeleton className="h-40" />
                    ) : extraMovements.isError ? (
                      <ErrorState
                        title="Não foi possível carregar as Movimentações Extrajudiciais."
                        onRetry={() => extraMovements.refetch()}
                      />
                    ) : (
                      <>
                        <RealList empty="Nenhum resultado encontrado.">
                          {(extraMovements.data?.items ?? []).map((item) => (
                            <div key={item.id} className="rounded-md border p-3">
                              <EntityAnchor
                                href={`/movimentacoes-extrajudiciais/${item.id}`}
                                value={date(item.dataMovimentacao)}
                              />
                              <p className="line-clamp-2 text-sm">{item.descricao}</p>
                            </div>
                          ))}
                        </RealList>
                        {(extraMovements.data?.total ?? 0) > 10 && (
                          <div className="mt-3 flex justify-end gap-2">
                            <Button
                              variant="outline"
                              disabled={extraPage === 1}
                              onClick={() => setExtraPage((page) => page - 1)}
                            >
                              Anterior
                            </Button>
                            <Button
                              variant="outline"
                              disabled={extraPage * 10 >= (extraMovements.data?.total ?? 0)}
                              onClick={() => setExtraPage((page) => page + 1)}
                            >
                              Próxima
                            </Button>
                          </div>
                        )}
                      </>
                    ),
                  },
                ]
              : []),
            ...(canCapture
              ? [
                  {
                    value: 'captura',
                    label: `Configurações de captura (${captures.length})`,
                    content: (
                      <RealList empty="Nenhum resultado encontrado.">
                        {captures.map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                          >
                            <EntityAnchor
                              className="font-mono text-sm"
                              href={`/configuracoes-captura?configuracao=${item.id}`}
                              value={item.numeroCnj}
                            />
                            {item.process && (
                              <EntityAnchor
                                href={canCase ? `/processos/${item.process.id}` : null}
                                value={item.process.titulo}
                              />
                            )}
                            <Badge variant="secondary">{item.status}</Badge>
                          </div>
                        ))}
                      </RealList>
                    ),
                  },
                ]
              : []),
          ]}
        />
      )}

      {(canDocument || canTask) && (
        <TabbedModule
          title="Trabalho"
          defaultValue={canDocument ? 'documentos' : 'tarefas'}
          tabs={[
            ...(canDocument
              ? [
                  {
                    value: 'documentos',
                    label: `Documentos (${folderDocuments.data?.total ?? 0})`,
                    content: (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Select value={documentSort} onValueChange={(value) => { setDocumentSort(value as typeof documentSort); setDocumentPage(1); }}>
                            <SelectTrigger className="w-full sm:w-72" aria-label="Ordenar documentos"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="-atualizadoEm">Última modificação decrescente</SelectItem>
                              <SelectItem value="atualizadoEm">Última modificação crescente</SelectItem>
                              <SelectItem value="nome">Nome A-Z</SelectItem>
                              <SelectItem value="-nome">Nome Z-A</SelectItem>
                              <SelectItem value="-criadoEm">Data de criação decrescente</SelectItem>
                              <SelectItem value="criadoEm">Data de criação crescente</SelectItem>
                            </SelectContent>
                          </Select>
                          {canCreateDocument && (
                            <Tooltip>
                              <UploadDialog
                                resourceType="PASTA_JURIDICA"
                                resourceId={id}
                                trigger={
                                  <TooltipTrigger asChild>
                                    <Button size="icon" aria-label="Adicionar documento">
                                      <Plus className="size-4" />
                                    </Button>
                                  </TooltipTrigger>
                                }
                              />
                              <TooltipContent>Adicionar documento</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        {folderDocuments.isLoading ? <Skeleton className="h-24" /> : folderDocuments.isError ? (
                          <ErrorState title="Não foi possível carregar os Documentos." onRetry={() => folderDocuments.refetch()} />
                        ) : <RealList empty="Nenhum documento encontrado.">
                          {(folderDocuments.data?.items ?? []).map((item) => (
                            <div
                              key={item.id}
                              className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-md border p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                            >
                              <FileText className="size-4" />
                              <span className="min-w-0 flex-1">
                                <EntityAnchor className="break-all" href={`/documentos/${item.id}`} value={item.nome} />
                                <small className="block text-muted-foreground">{item.extensao.toUpperCase()} · {formatBytes(Number(item.tamanhoBytes))} · {date(item.atualizadoEm)} · v{item.versaoAtual}</small>
                              </span>
                              {canUpdateDocument && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="col-span-2 justify-self-start sm:col-span-1 sm:justify-self-auto"
                                  disabled={unlinkDocument.isPending}
                                  onClick={() => unlinkDocument.mutate(item.id)}
                                >
                                  <Link2Off className="size-4" aria-hidden="true" />
                                  Desvincular da Pasta
                                </Button>
                              )}
                            </div>
                          ))}
                        </RealList>}
                        {(folderDocuments.data?.total ?? 0) > 10 && <div className="flex items-center justify-end gap-2"><Button variant="outline" size="sm" disabled={documentPage === 1} onClick={() => setDocumentPage((page) => page - 1)}>Anterior</Button><span className="text-sm text-muted-foreground">Página {documentPage}</span><Button variant="outline" size="sm" disabled={documentPage * 10 >= (folderDocuments.data?.total ?? 0)} onClick={() => setDocumentPage((page) => page + 1)}>Próxima</Button></div>}
                      </div>
                    ),
                  },
                ]
              : []),
            { value: 'servicos', label: 'Serviços', content: <Unavailable /> },
            ...(canTask
              ? [
                  {
                    value: 'tarefas',
                    label: `Tarefas${tasks.data ? ` (${tasks.data.items.length})` : ''}`,
                    content: tasks.isLoading ? (
                      <Skeleton className="h-24" />
                    ) : tasks.isError ? (
                      <ErrorState
                        title="Não foi possível carregar as Tarefas."
                        onRetry={() => tasks.refetch()}
                      />
                    ) : (
                      <RealList empty="Nenhum resultado encontrado.">
                        {(tasks.data?.items ?? []).map((task) => (
                          <div
                            key={task.id}
                            className="flex flex-wrap justify-between gap-3 rounded-md border p-3"
                          >
                            <span>
                              <EntityAnchor href={`/tarefas/${task.id}`} value={task.titulo} />
                              <small className="block text-muted-foreground">
                                <EntityAnchor
                                  href={
                                    canMember && task.responsavel
                                      ? `/colaboradores/${task.responsavel.id}`
                                      : null
                                  }
                                  value={task.responsavel?.nome ?? 'Sem responsável'}
                                />
                              </small>
                              {task.solicitante && (
                                <small className="block text-muted-foreground">
                                  Solicitante:{' '}
                                  <EntityAnchor
                                    href={
                                      canMember ? `/colaboradores/${task.solicitante.id}` : null
                                    }
                                    value={task.solicitante.nome}
                                  />
                                </small>
                              )}
                              {task.vinculos
                                ?.filter(
                                  (v) =>
                                    v.recurso && ['CLIENTE', 'PROCESSO'].includes(v.tipoRecurso),
                                )
                                .map((v) => (
                                  <small
                                    key={`${v.tipoRecurso}-${v.recursoId}`}
                                    className="block text-muted-foreground"
                                  >
                                    {v.tipoRecurso === 'CLIENTE' ? 'Cliente' : 'Processo'}:{' '}
                                    <EntityAnchor
                                      href={
                                        v.tipoRecurso === 'CLIENTE'
                                          ? canClient
                                            ? `/clientes/${v.recursoId}`
                                            : null
                                          : canCase
                                            ? `/processos/${v.recursoId}`
                                            : null
                                      }
                                      value={v.recurso?.numeroCnj ?? v.recurso?.nome}
                                    />
                                  </small>
                                ))}
                            </span>
                            <span className="text-right text-sm">
                              <Badge variant="secondary">
                                {task.status?.valor ?? 'Sem situação'}
                              </Badge>
                              <small className="mt-1 block text-muted-foreground">
                                {date(task.dataVencimento)}
                              </small>
                            </span>
                          </div>
                        ))}
                      </RealList>
                    ),
                  },
                ]
              : []),
          ]}
        />
      )}

      <TabbedModule
        title="Financeiro"
        defaultValue="despesas-previstas"
        tabs={[
          'Despesas previstas',
          'Receitas previstas',
          'Despesas realizadas',
          'Receitas realizadas',
          'Custas processuais',
        ].map((label) => ({ value: slug(label), label, content: <Unavailable /> }))}
      />

      <TabbedModule
        title="Inteligência Artificial"
        defaultValue="prompts"
        tabs={[
          {
            value: 'prompts',
            label: 'Prompts de IA',
            content:
              canAi && processes[0] ? (
                <AiSummaryPanel escopoTipo="PROCESSO" escopoId={processes[0].id} />
              ) : (
                <Unavailable />
              ),
          },
          { value: 'documentos-ia', label: 'Documentos de IA', content: <Unavailable /> },
        ]}
      />

      <AuditContextSection resourceType="PASTA_JURIDICA" resourceId={id} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ModuleCard title="Anexos">
          <Unavailable />
        </ModuleCard>
        <ModuleCard title="Comentários">
          <Unavailable />
        </ModuleCard>
      </div>
    </div>
  );
}

function ModuleCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">{children}</CardContent>
    </Card>
  );
}
function TabbedModule({
  title,
  defaultValue,
  tabs,
}: {
  title: string;
  defaultValue: string;
  tabs: Array<{ value: string; label: string; content: React.ReactNode }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultValue}>
          <TabsList className="scrollbar-fade h-auto w-full justify-start overflow-x-auto">
            <>
              {tabs.map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </>
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
function Property({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words">{value || '—'}</dd>
    </div>
  );
}
function ResourceLink({
  label,
  href,
  value,
}: {
  label: string;
  href: string | null;
  value?: string | null;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>
        <EntityAnchor href={href} value={value} />
      </dd>
    </div>
  );
}
function ResourceLinks({
  label,
  items,
}: {
  label: string;
  items: Array<{ value: string; href: string | null }>;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="flex flex-wrap gap-x-2 gap-y-1">
        {items.length
          ? items.map((item, index) => (
              <React.Fragment key={`${item.href ?? item.value}-${index}`}>
                {index > 0 && <span aria-hidden="true">·</span>}
                <EntityAnchor href={item.href} value={item.value} />
              </React.Fragment>
            ))
          : '—'}
      </dd>
    </div>
  );
}
function EntityAnchor({
  href,
  value,
  className = '',
}: {
  href: string | null;
  value?: string | null;
  className?: string;
}) {
  if (!value) return <>—</>;
  return href ? (
    <Link
      className={`rounded-sm font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${className}`}
      href={href}
    >
      {value}
    </Link>
  ) : (
    <span className={className}>{value}</span>
  );
}
function RealList({ children, empty }: { children: React.ReactNode; empty: string }) {
  return React.Children.count(children) ? (
    <div className="grid gap-2">{children}</div>
  ) : (
    <Empty title={empty} />
  );
}
function Empty({ title }: { title: string }) {
  return <EmptyState icon={FolderKanban} title={title} />;
}
function Unavailable() {
  return <Empty title="Módulo ainda não disponível." />;
}
function slug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
}
function formatExtra(value: string | undefined, type: string) {
  if (!value) return null;
  if (type === 'BOOLEANO')
    return ['true', '1', 'sim'].includes(value.toLowerCase()) ? 'Sim' : 'Não';
  if (type === 'DATA') return date(`${value}T12:00:00`);
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.join(', ') : value;
  } catch {
    return value;
  }
}
