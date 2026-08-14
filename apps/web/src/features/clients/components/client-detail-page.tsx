'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckSquare,
  Folder,
  FileText,
  MoreHorizontal,
  Pencil,
  Plus,
  Scale,
  History,
  Sparkles,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FavoriteButton } from '@/components/data-display/favorite-button';
import { PropertyRow } from '@/components/data-display/property-row';
import { QuickActionsCard } from '@/components/data-display/quick-actions-card';
import { RelatedPanel, type RelatedItem } from '@/components/data-display/related-panel';
import { StatusBadge } from '@/components/data-display/status-badge';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { PlaceholderTabContent } from '@/components/feedback/placeholder-tab-content';
import { PageHeader } from '@/components/layout/page-header';
import { ClientDocumentsTab, UploadDialog } from '@/features/documents';
import { useLegalFolders } from '@/features/legal-folders/api/queries';
import { useExtraFields } from '@/features/configuration/api/queries';
import { AiSummaryPanel } from '@/features/ai';
import { TaskFormDialog } from '@/features/tasks';
import { useTasks } from '@/features/tasks/api/queries';
import { TIMELINE_TYPE_META } from '@/features/timeline/domain/timeline-meta';
import { usePermission } from '@/hooks/use-permission';
import { useTabDeepLink } from '@/hooks/use-tab-deep-link';
import { isApiError } from '@/lib/api/errors';
import { useDeleteClient, useToggleClientFavorite } from '../api/mutations';
import { useClient, useClientLegalCases, useClientTimeline } from '../api/queries';
import { ClientFormDialog } from './client-form-dialog';

const VALID_TABS = new Set([
  'resumo',
  'dados-pessoais',
  'contato',
  'enderecos',
  'pastas',
  'anexos',
  'auditoria',
  'processos',
  'tarefas',
  'ia',
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
 * Itens do painel "Relacionados" (Prompt 11, ampliado pelo Prompt "Clientes
 * e Contatos" — "nenhuma entidade pode permanecer isolada"). Itens sem
 * `href` (módulo de negócio ainda não existe: Contratos/Financeiro/
 * Publicações/Serviços) ficam esmaecidos, nunca escondidos.
 */
function clientRelatedItems(
  client: { processosAtivos: number; documentosCount: number },
  clientId: string,
  canUseAi: boolean,
): RelatedItem[] {
  return [
    {
      label: 'Processos',
      icon: Scale,
      href: `/clientes/${clientId}?tab=processos`,
      count: client.processosAtivos,
    },
    { label: 'Pastas', icon: Folder, href: `/clientes/${clientId}?tab=pastas` },
    {
      label: 'Anexos',
      icon: FileText,
      href: `/clientes/${clientId}?tab=anexos`,
      count: client.documentosCount,
    },
    { label: 'Tarefas', icon: CheckSquare, href: `/clientes/${clientId}?tab=tarefas` },
    { label: 'Auditoria', icon: History, href: `/clientes/${clientId}?tab=auditoria` },
    ...(canUseAi ? [{ label: 'IA', icon: Sparkles, href: `/clientes/${clientId}?tab=ia` }] : []),
  ];
}

export function ClientDetailPage({ clientId }: { clientId: string }) {
  const router = useRouter();
  // Deep-link de aba (`?tab=processos`) — mesmo padrão de
  // `legal-case-detail-page.tsx` (Sprint 10), agora via `useTabDeepLink`
  // (Prompt 11) para que o painel "Relacionados" também funcione com um
  // link para a própria página (troca de aba sem remontar o componente).
  const [tab, setTab] = useTabDeepLink(VALID_TABS, 'resumo');
  const { data: client, isLoading, isError, refetch } = useClient(clientId);
  const canUpdate = usePermission('client:update');
  const canDelete = usePermission('client:delete');
  const canCreateFolder = usePermission('legal-folder:create');
  const canCreateCapture = usePermission('capture:create');
  const canCreateDocument = usePermission('document:create');
  const canCreateTask = usePermission('task:create');
  const canUseAi = usePermission('ai:summarize');
  const deleteClient = useDeleteClient();
  const toggleFavorite = useToggleClientFavorite();

  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  if (isError) {
    return (
      <div>
        <PageHeader title="Cliente" breadcrumbs={[{ label: 'Clientes', href: '/clientes' }]} />
        <ErrorState title="Não foi possível carregar este cliente." onRetry={() => refetch()} />
      </div>
    );
  }

  if (isLoading || !client) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  function handleDelete() {
    deleteClient.mutate(clientId, {
      onSuccess: () => {
        toast.success('Cliente excluído.');
        router.push('/clientes');
      },
      onError: (error) => {
        if (isApiError(error) && error.code === 'HAS_ACTIVE_LEGAL_CASES') {
          toast.error('Este cliente possui processos vinculados e não pode ser excluído.');
        } else {
          toast.error('Não foi possível excluir este cliente.');
        }
        setDeleteOpen(false);
      },
    });
  }

  return (
    <div>
      <PageHeader
        title={client.nome}
        breadcrumbs={[{ label: 'Clientes', href: '/clientes' }, { label: client.nome }]}
        actions={
          <div className="flex items-center gap-2">
            <FavoriteButton
              favorito={client.favorito}
              isPending={toggleFavorite.isPending}
              label={client.favorito ? 'Remover dos favoritos' : 'Favoritar cliente'}
              onToggle={() => toggleFavorite.mutate(clientId)}
            />
            {(canUpdate || canDelete) && (
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

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="scrollbar-fade w-full justify-start overflow-x-auto">
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="dados-pessoais">Dados pessoais</TabsTrigger>
            <TabsTrigger value="contato">Canais de contato</TabsTrigger>
            <TabsTrigger value="enderecos">Endereços</TabsTrigger>
            <TabsTrigger value="pastas">Pastas</TabsTrigger>
            <TabsTrigger value="ia">Prompts de IA</TabsTrigger>
            <TabsTrigger value="anexos">Anexos</TabsTrigger>
            <TabsTrigger value="auditoria">Auditoria de atividades</TabsTrigger>
            <TabsTrigger value="processos">Processos</TabsTrigger>
            <TabsTrigger value="tarefas">Tarefas</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-2xl font-semibold">{client.processosAtivos}</p>
                  <p className="text-xs text-muted-foreground">Processos ativos</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold">{client.documentosCount}</p>
                  <p className="text-xs text-muted-foreground">Documentos</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold">
                    {new Date(client.criadoEm).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs text-muted-foreground">Cliente desde</p>
                </div>
              </CardContent>
            </Card>
            <ClientRecentCases clientId={clientId} />
          </TabsContent>

          <TabsContent value="dados-pessoais">
            <Card>
              <CardContent className="pt-6">
                <PropertyRow
                  label="Tipo"
                  value={client.tipo === 'PESSOA_FISICA' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                />
                {client.razaoSocial && (
                  <PropertyRow label="Razão social" value={client.razaoSocial} />
                )}
                {client.nomeSocial && <PropertyRow label="Nome social" value={client.nomeSocial} />}
                {client.cpf && <PropertyRow label="CPF" value={client.cpf} />}
                {client.cnpj && <PropertyRow label="CNPJ" value={client.cnpj} />}
                {client.tipo === 'PESSOA_JURIDICA' && (
                  <PropertyRow label="Responsável" value={client.responsavelNome} />
                )}
                {client.tipo === 'PESSOA_FISICA' && (
                  <>
                    <PropertyRow
                      label="Data de nascimento"
                      value={
                        client.dataNascimento
                          ? new Date(client.dataNascimento).toLocaleDateString('pt-BR')
                          : undefined
                      }
                    />
                    <PropertyRow
                      label="Estado civil"
                      value={
                        client.estadoCivil ? ESTADO_CIVIL_LABEL[client.estadoCivil] : undefined
                      }
                    />
                    <PropertyRow label="Profissão" value={client.profissao} />
                    <PropertyRow label="RG" value={client.rg} />
                    <PropertyRow label="Nome da mãe" value={client.nomeMae} />
                    <PropertyRow label="Nome do pai" value={client.nomePai} />
                  </>
                )}
                <PropertyRow label="Observações" value={client.observacoes} />
                <ClientExtraFields values={client.camposExtrasValores} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contato">
            <Card>
              <CardContent className="flex items-center gap-4 pt-6">
                <Avatar className="size-16">
                  <AvatarImage src={client.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback className="text-lg">{initials(client.nome)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1">
                  <PropertyRow label="E-mail" value={client.emails[0]} />
                  <PropertyRow label="E-mail adicional" value={client.emails[1]} />
                  <PropertyRow label="Telefone" value={client.telefones[0]} />
                  <PropertyRow label="Celular" value={client.telefones[1]} />
                  {client.tipo === 'PESSOA_FISICA' && (
                    <PropertyRow label="Telefone residencial" value={client.telefoneResidencial} />
                  )}
                  {client.tipo === 'PESSOA_JURIDICA' && (
                    <PropertyRow
                      label="Telefone do responsável"
                      value={client.telefoneResponsavel}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="enderecos">
            <Card>
              <CardContent className="pt-6">
                <PropertyRow
                  label="Endereço"
                  value={
                    client.enderecoLogradouro
                      ? `${client.enderecoLogradouro}, ${client.enderecoNumero ?? 's/n'}`
                      : undefined
                  }
                />
                <PropertyRow label="Complemento" value={client.enderecoComplemento} />
                <PropertyRow label="Bairro" value={client.enderecoBairro} />
                <PropertyRow
                  label="Cidade/UF"
                  value={
                    client.enderecoCidade
                      ? `${client.enderecoCidade}/${client.enderecoUf ?? ''}`
                      : undefined
                  }
                />
                <PropertyRow label="CEP" value={client.enderecoCep} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pastas">
            <ClientFoldersTab clientId={clientId} />
          </TabsContent>

          <TabsContent value="anexos">
            <ClientDocumentsTab clienteId={clientId} />
          </TabsContent>

          <TabsContent value="auditoria">
            <ClientTimelineTab clientId={clientId} />
          </TabsContent>

          <TabsContent value="processos">
            <ClientLegalCasesTab clientId={clientId} />
          </TabsContent>

          <TabsContent value="tarefas">
            <ClientTasksTab clientId={clientId} canCreate={canCreateTask} />
          </TabsContent>

          <TabsContent value="ia">
            {canUseAi ? (
              <AiSummaryPanel escopoTipo="CLIENTE" escopoId={clientId} />
            ) : (
              <EmptyState
                icon={Sparkles}
                title="Prompts de IA indisponíveis"
                description="Você não possui permissão para usar IA neste cliente."
              />
            )}
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contato</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarImage src={client.avatarUrl ?? undefined} alt="" />
                <AvatarFallback>{initials(client.nome)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{client.nome}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {client.emails[0] ?? 'Sem e-mail'}
                </p>
              </div>
            </CardContent>
          </Card>

          <QuickActionsCard>
            {canCreateFolder && (
              <Button asChild variant="outline" className="justify-start">
                <Link href={`/pastas?nova=1&clienteId=${client.id}`}>
                  <Plus className="size-4" aria-hidden="true" />
                  Nova Pasta
                </Link>
              </Button>
            )}
            {canCreateCapture && (
              <Button asChild variant="outline" className="justify-start">
                <Link href={`/configuracoes-captura?nova=1&clienteId=${client.id}`}>
                  <Plus className="size-4" aria-hidden="true" />
                  Nova Configuração de Captura
                </Link>
              </Button>
            )}
            {canCreateTask && (
              <TaskFormDialog
                mode="create"
                fixedVinculo={{ tipoRecurso: 'CLIENTE', recursoId: client.id }}
                trigger={
                  <Button variant="outline" className="justify-start">
                    <CheckSquare className="size-4" aria-hidden="true" />
                    Nova tarefa
                  </Button>
                }
              />
            )}
            {canCreateDocument && (
              <UploadDialog
                clienteId={client.id}
                trigger={
                  <Button variant="outline" className="justify-start">
                    <Upload className="size-4" aria-hidden="true" />
                    Novo documento
                  </Button>
                }
              />
            )}
            {canUpdate && (
              <Button variant="outline" className="justify-start" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" aria-hidden="true" />
                Editar
              </Button>
            )}
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => toggleFavorite.mutate(clientId)}
              disabled={toggleFavorite.isPending}
            >
              <Sparkles className="size-4" aria-hidden="true" />
              {client.favorito ? 'Remover dos favoritos' : 'Favoritar'}
            </Button>
          </QuickActionsCard>

          <RelatedPanel items={clientRelatedItems(client, clientId, canUseAi)} />
        </div>
      </div>

      <ClientFormDialog client={client} open={editOpen} onOpenChange={setEditOpen} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir cliente"
        description={`${client.nome} será excluído. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleteClient.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function ClientExtraFields({ values }: { values: Record<string, string> }) {
  const { data: fields } = useExtraFields('CLIENTE');
  return (
    <>
      {fields
        ?.filter((field) => field.ativo)
        .map((field) => (
          <PropertyRow key={field.id} label={field.nome} value={values[field.id]} />
        ))}
    </>
  );
}

function ClientFoldersTab({ clientId }: { clientId: string }) {
  const canCreateFolder = usePermission('legal-folder:create');
  const [search, setSearch] = React.useState('');
  const { data, isLoading, isError, refetch } = useLegalFolders({
    clienteId: clientId,
    limit: 100,
  });
  const folders = React.useMemo(() => {
    return [...(data?.items ?? [])]
      .filter((folder) =>
        folder.nome.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')),
      )
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [data, search]);

  if (isError)
    return <ErrorState title="Não foi possível carregar as pastas." onRetry={() => refetch()} />;
  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base">Pastas relacionadas ({folders.length})</CardTitle>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filtrar pastas"
            aria-label="Filtrar pastas deste cliente"
            className="sm:w-56"
          />
          {canCreateFolder && (
            <Button asChild>
              <Link href={`/pastas?nova=1&clienteId=${clientId}`}>Nova Pasta</Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : folders.length === 0 ? (
          <EmptyState
            icon={Folder}
            title="Nenhuma pasta relacionada"
            description="As Pastas Jurídicas deste cliente aparecerão aqui."
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {folders.map((folder) => (
              <Button
                key={folder.id}
                asChild
                variant="outline"
                className="h-auto justify-between py-3"
              >
                <Link href={`/pastas/${folder.id}`}>
                  <span className="truncate">{folder.nome}</span>
                  <span className="text-xs text-muted-foreground">
                    {folder.categoria ?? folder.assunto ?? '—'}
                  </span>
                </Link>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClientLegalCasesTab({ clientId }: { clientId: string }) {
  const { data: cases, isLoading, isError, refetch } = useClientLegalCases(clientId);

  if (isError) {
    return <ErrorState title="Não foi possível carregar os processos." onRetry={() => refetch()} />;
  }
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (!cases || cases.length === 0) {
    return (
      <PlaceholderTabContent
        icon={Scale}
        title="Nenhum processo vinculado"
        description="Processos que tenham este cliente como titular aparecerão aqui."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {cases.map((legalCase) => (
        <li key={legalCase.id}>
          <a
            href={`/processos/${legalCase.id}`}
            className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm transition-colors hover:bg-accent"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{legalCase.titulo}</p>
              <p className="truncate text-xs text-muted-foreground">
                {legalCase.numeroCnj ?? 'Sem número CNJ'}
              </p>
            </div>
            <StatusBadge status={legalCase.status} />
          </a>
        </li>
      ))}
    </ul>
  );
}

function ClientRecentCases({ clientId }: { clientId: string }) {
  const { data: cases } = useClientLegalCases(clientId);
  if (!cases || cases.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Processos recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {cases.slice(0, 3).map((legalCase) => (
            <li key={legalCase.id} className="flex items-center justify-between text-sm">
              <span className="truncate">{legalCase.titulo}</span>
              <StatusBadge status={legalCase.status} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/**
 * `Cliente` não ganhou escopo próprio de Timeline nesta Sprint (ver
 * `docs/backend-implementation/24-clients-contacts.md`) — o backend agrega
 * os eventos fan-out (`entidadeRelacionadaTipo: 'cliente'`) via `GET
 * /clients/:id/timeline`; esta aba só lê e exibe, mesmo padrão só-leitura
 * de `TaskTimelineTab` (não reaproveitado diretamente porque aquele vive
 * em `features/tasks/`, fora do alcance desta Sprint — "não alterar Task
 * Engine" — mas o mesmo desenho visual, generalização por convenção).
 */
function ClientTimelineTab({ clientId }: { clientId: string }) {
  const { data, isLoading, isError, refetch } = useClientTimeline(clientId, { limit: 50 });

  if (isError)
    return <ErrorState title="Não foi possível carregar a timeline." onRetry={() => refetch()} />;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <PlaceholderTabContent
        icon={History}
        title="Nenhum evento ainda"
        description="Eventos deste cliente aparecem aqui a partir dos processos vinculados a ele — um cliente sem nenhum processo ainda não tem Timeline própria."
      />
    );
  }

  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const groups = [
    {
      title: 'Atividades recentes',
      items: items.filter((item) => new Date(item.dataEvento).getTime() >= cutoff),
    },
    {
      title: 'Atividades antigas',
      items: items.filter((item) => new Date(item.dataEvento).getTime() < cutoff),
    },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.title} className="space-y-2">
          <h3 className="text-sm font-medium">{group.title}</h3>
          {group.items.map((item) => {
            const meta = TIMELINE_TYPE_META[item.tipo];
            const Icon = meta.icon;
            const time = new Date(item.dataEvento);
            return (
              <Card key={item.id} className="flex gap-3 p-3">
                <div
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full ${meta.colorClass}`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-medium">{item.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {time.toLocaleDateString('pt-BR')} às{' '}
                    {time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    {item.autor && ` · ${item.autor.nome}`}
                  </p>
                </div>
              </Card>
            );
          })}
        </section>
      ))}
    </div>
  );
}

/** Embutida via `useTasks({ clienteId })` (já suportado pelo Task Engine desde o Prompt 14) — não modifica nada em `features/tasks/`, só consome o hook público. */
function ClientTasksTab({ clientId, canCreate }: { clientId: string; canCreate: boolean }) {
  const { data, isLoading, isError, refetch } = useTasks({ clienteId: clientId, limit: 20 });

  if (isError)
    return <ErrorState title="Não foi possível carregar as tarefas." onRetry={() => refetch()} />;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const tasks = data?.items ?? [];

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare}
        title="Nenhuma tarefa vinculada"
        description="Tarefas vinculadas a este cliente aparecerão aqui."
        action={
          canCreate ? (
            <TaskFormDialog
              mode="create"
              fixedVinculo={{ tipoRecurso: 'CLIENTE', recursoId: clientId }}
              trigger={
                <Button size="sm" variant="outline">
                  <Plus className="size-4" aria-hidden="true" />
                  Nova tarefa
                </Button>
              }
            />
          ) : undefined
        }
      />
    );
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link
            href={`/tarefas/${task.id}`}
            className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3 text-sm transition-colors hover:bg-accent"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{task.titulo}</p>
              {task.dataVencimento && (
                <p className="truncate text-xs text-muted-foreground">
                  Vence em {new Date(task.dataVencimento).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
            {task.status && (
              <span className="shrink-0 text-xs text-muted-foreground">{task.status.valor}</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
