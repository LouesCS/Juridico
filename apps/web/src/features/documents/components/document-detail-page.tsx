'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RelatedPanel, type RelatedItem } from '@/components/data-display/related-panel';
import { ErrorState } from '@/components/feedback/error-state';
import { PageHeader } from '@/components/layout/page-header';
import { PlaceholderTabContent } from '@/components/feedback/placeholder-tab-content';
import { History, MessageSquare, Scale, Sparkles, Users2 } from 'lucide-react';
import { AiSummaryPanel } from '@/features/ai';
import { useTabDeepLink } from '@/hooks/use-tab-deep-link';
import { documentsApi } from '../api/documents.api';
import { useDocument } from '../api/queries';
import { formatBytes } from '../domain/file-meta';
import { DocumentMetadataForm } from './document-metadata-form';
import { DocumentPreview } from './document-preview';
import { DocumentRowActions } from './document-row-actions';
import { FavoriteButton } from '@/components/data-display/favorite-button';
import { useToggleDocumentFavorite } from '../api/mutations';
import { VersionHistory } from './version-history';

const VALID_TABS = new Set(['info', 'versoes', 'comentarios', 'ia']);

/**
 * Itens do painel "Relacionados" (Prompt 11) — Cliente/Processo apontam
 * para a página da entidade titular quando existe (documento avulso pode
 * não ter nenhuma das duas); Versões/Comentários/IA apontam para abas
 * desta própria página.
 */
function documentRelatedItems(document: {
  id: string;
  processo: { id: string; titulo: string } | null;
  cliente: { id: string; nome: string } | null;
}): RelatedItem[] {
  const items: RelatedItem[] = [];
  if (document.processo) {
    items.push({ label: 'Processo', icon: Scale, href: `/processos/${document.processo.id}` });
  }
  if (document.cliente) {
    items.push({ label: 'Cliente', icon: Users2, href: `/clientes/${document.cliente.id}` });
  }
  items.push(
    { label: 'Versões', icon: History, href: `/documentos/${document.id}?tab=versoes` },
    { label: 'Comentários', icon: MessageSquare, href: `/documentos/${document.id}?tab=comentarios` },
    { label: 'IA', icon: Sparkles, href: `/documentos/${document.id}?tab=ia` },
  );
  return items;
}

async function openDownload(id: string) {
  try {
    const { url } = await documentsApi.download(id);
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {
    toast.error('Não foi possível gerar o link de download.');
  }
}

/**
 * Página de detalhe do documento (Sprint 09) — layout dividido: preview à
 * esquerda, informações/versões/relacionamentos à direita. "Comentários"
 * fica como placeholder honesto (módulo `Comments` ainda não existe — ver
 * docs/backend-implementation/00-status.md).
 */
export function DocumentDetailPage({ documentId }: { documentId: string }) {
  const { data: document, isLoading, isError, refetch } = useDocument(documentId);
  const toggleFavorite = useToggleDocumentFavorite();
  // Deep-link de aba (`?tab=versoes`) via `useTabDeepLink` (Prompt 11) — o
  // painel "Relacionados" linka para as abas Versões/Comentários/IA desta
  // própria página.
  const [tab, setTab] = useTabDeepLink(VALID_TABS, 'info');

  if (isError) {
    return <ErrorState title="Não foi possível carregar este documento." onRetry={() => refetch()} />;
  }

  if (isLoading || !document) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={document.nome}
        breadcrumbs={[{ label: 'Documentos', href: '/documentos' }, { label: document.nome }]}
        actions={
          <div className="flex items-center gap-2">
            <FavoriteButton
              favorito={document.favorito}
              onToggle={() => toggleFavorite.mutate(document.id)}
              isPending={toggleFavorite.isPending}
              label={`Favoritar ${document.nome}`}
            />
            <Button variant="outline" onClick={() => void openDownload(document.id)}>
              Baixar
            </Button>
            <DocumentMetadataForm document={document} />
            <DocumentRowActions document={document} />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DocumentPreview
            documentId={document.id}
            extensao={document.extensao}
            nome={document.nome}
            statusAntivirus={document.statusAntivirus}
          />
        </div>

        <div className="space-y-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="info" className="flex-1">
                Informações
              </TabsTrigger>
              <TabsTrigger value="versoes" className="flex-1">
                Versões
              </TabsTrigger>
              <TabsTrigger value="comentarios" className="flex-1">
                Comentários
              </TabsTrigger>
              <TabsTrigger value="ia" className="flex-1">
                IA
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info">
              <Card>
                <CardContent className="space-y-3 pt-6 text-sm">
                  <dl className="space-y-2">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Tamanho</dt>
                      <dd>{formatBytes(document.tamanhoBytes)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Versão atual</dt>
                      <dd>v{document.versaoAtual}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Autor</dt>
                      <dd>{document.autor?.nome ?? '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Enviado em</dt>
                      <dd>{new Date(document.criadoEm).toLocaleString('pt-BR')}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Atualizado em</dt>
                      <dd>{new Date(document.atualizadoEm).toLocaleString('pt-BR')}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">Confidencialidade</dt>
                      <dd>
                        <Badge variant={document.confidencialidade === 'CONFIDENCIAL' ? 'destructive' : 'outline'}>
                          {document.confidencialidade === 'CONFIDENCIAL' ? 'Confidencial' : 'Padrão'}
                        </Badge>
                      </dd>
                    </div>
                    {document.processo && (
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Processo</dt>
                        <dd>
                          <Link href={`/processos/${document.processo.id}`} className="hover:underline">
                            {document.processo.titulo}
                          </Link>
                        </dd>
                      </div>
                    )}
                    {document.cliente && (
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Cliente</dt>
                        <dd>
                          <Link href={`/clientes/${document.cliente.id}`} className="hover:underline">
                            {document.cliente.nome}
                          </Link>
                        </dd>
                      </div>
                    )}
                    {document.pasta && (
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Pasta</dt>
                        <dd>{document.pasta.nome}</dd>
                      </div>
                    )}
                  </dl>
                  {document.descricao && <p className="border-t border-border pt-3 text-muted-foreground">{document.descricao}</p>}
                  {document.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
                      {document.tags.map((tag) => (
                        <Badge key={tag.id} variant="secondary">
                          {tag.nome}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="versoes">
              <VersionHistory documentId={document.id} />
            </TabsContent>

            <TabsContent value="comentarios">
              <PlaceholderTabContent
                icon={MessageSquare}
                title="Comentários ainda não implementados"
                description="O módulo de Comentários (Comments) está preparado na arquitetura (Documento já se relaciona com Comentario no schema), mas ainda não foi implementado."
              />
            </TabsContent>

            <TabsContent value="ia">
              <AiSummaryPanel escopoTipo="DOCUMENTO" escopoId={document.id} />
            </TabsContent>
          </Tabs>

          <RelatedPanel items={documentRelatedItems(document)} />
        </div>
      </div>
    </div>
  );
}
