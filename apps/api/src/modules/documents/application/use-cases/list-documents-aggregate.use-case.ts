import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import { ListDocumentsAggregateQuery } from '../../presentation/schemas/document.schemas';
import { LegalFoldersService } from '../../../legal-folders/application/legal-folders.service';
import {
  applyDocumentConfidentialityFilter,
  buildDocumentScopeWhere,
  resolveCaseReadScope,
  resolveDocumentReadScope,
  ScopeActor,
} from '../document-scope';

/**
 * Sustenta a tela principal de Documentos (`/documentos`) — todas as visões
 * pedidas pela Sprint 09 (Todos, Recentes, Favoritos, Versionados, Lixeira,
 * Compartilhados) num único endpoint agregado, mesmo racional de
 * `ListDeadlinesAggregateUseCase`/`ListRecentTimelineAggregateUseCase`.
 * "Compartilhados" é um placeholder honesto — Portal do Cliente (Fase 3) não
 * existe ainda, então esta visão sempre devolve lista vazia com
 * `disponivel: false`, nunca dado inventado.
 */
@Injectable()
export class ListDocumentsAggregateUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly legalFolders: LegalFoldersService,
  ) {}

  async execute(escritorioId: string, user: AuthUser, query: ListDocumentsAggregateQuery) {
    if (query.visao === 'compartilhados') {
      return { items: [], nextCursor: null, total: 0, disponivel: false };
    }

    const actor: ScopeActor = { membroId: user.membroId, teamMemberIds: [] };
    const caseScope = resolveCaseReadScope(user.permissions);
    const documentScope = resolveDocumentReadScope(user.permissions);
    const scopeWhere = buildDocumentScopeWhere(caseScope, documentScope, actor);
    const confidentialityWhere = applyDocumentConfidentialityFilter(user.permissions);

    // `excluidoEm` precisa estar no NÍVEL RAIZ de `where` (não dentro de
    // `AND`) para a extensão de soft-delete reconhecer a chave via `in` e não
    // injetar `excluidoEm: null` por cima (o que geraria uma contradição com
    // o filtro de lixeira abaixo e zeraria o resultado sempre).
    const where: Prisma.DocumentoWhereInput = {
      escritorioId,
      AND: [scopeWhere, confidentialityWhere],
      ...(query.visao === 'favoritos' ? { favoritos: { some: { membroId: user.membroId } } } : {}),
      ...(query.visao === 'versionados' ? { versoes: { some: { numero: { gt: 1 } } } } : {}),
      ...(query.visao === 'lixeira' ? { excluidoEm: { not: null } } : {}),
      ...(query.pastaId ? { pastaId: query.pastaId } : {}),
      ...(query.processoId ? { processoId: query.processoId } : {}),
      ...(query.clienteId ? { clienteId: query.clienteId } : {}),
      ...(query.resourceType && query.resourceId
        ? {
            vinculos: {
              some: { escritorioId, tipoRecurso: query.resourceType, recursoId: query.resourceId },
            },
          }
        : {}),
      ...(query.tipo ? { tipo: query.tipo } : {}),
      ...(query.categoria ? { categoria: query.categoria } : {}),
      ...(query.tagId ? { tags: { some: { tagId: query.tagId } } } : {}),
      ...(query.q ? { nome: { contains: query.q, mode: 'insensitive' } } : {}),
    };

    const sort = query.visao === 'recentes' ? '-atualizadoEm' : query.sort;
    const orderBy: Prisma.DocumentoOrderByWithRelationInput = sort.startsWith('-')
      ? { [sort.slice(1)]: 'desc' }
      : { [sort]: 'asc' };

    if (query.resourceType === 'PASTA_JURIDICA' && query.resourceId) {
      await this.legalFolders.get(user, query.resourceId);
    }

    const [documentos, total] = await Promise.all([
      this.prisma.client.documento.findMany({
        where,
        orderBy,
        take: query.limit + 1,
        ...(query.page
          ? { skip: (query.page - 1) * query.limit }
          : query.cursor
            ? { cursor: { id: query.cursor }, skip: 1 }
            : {}),
        include: {
          pasta: { select: { id: true, nome: true } },
          processo: { select: { id: true, titulo: true } },
          _count: { select: { versoes: true } },
          favoritos: { where: { membroId: user.membroId }, select: { membroId: true } },
          tags: { include: { tag: { select: { id: true, nome: true, cor: true } } } },
        },
      }),
      this.prisma.client.documento.count({ where }),
    ]);

    const hasMore = documentos.length > query.limit;
    const pagina = hasMore ? documentos.slice(0, query.limit) : documentos;

    // `Documento.clienteId` é uma coluna solta (sem relação Prisma) — mesmo
    // padrão de `get-document.use-case.ts`, resolvido por lookup em lote.
    const autorIds = [...new Set(pagina.map((d) => d.autorUploadId))];
    const clienteIds = [
      ...new Set(pagina.map((d) => d.clienteId).filter((id): id is string => Boolean(id))),
    ];
    const [autores, clientes] = await Promise.all([
      autorIds.length
        ? this.prisma.client.membro.findMany({
            where: { id: { in: autorIds } },
            include: { usuario: { select: { nome: true, avatarUrl: true } } },
          })
        : Promise.resolve([]),
      clienteIds.length
        ? this.prisma.client.cliente.findMany({
            where: { id: { in: clienteIds } },
            select: { id: true, nome: true },
          })
        : Promise.resolve([]),
    ]);
    const autorPorId = new Map(autores.map((a) => [a.id, a]));
    const clientePorId = new Map(clientes.map((c) => [c.id, c]));

    return {
      items: pagina.map((d) => ({
        id: d.id,
        nome: d.nome,
        extensao: d.extensao,
        mimeType: d.mimeType,
        tamanhoBytes: d.tamanhoBytes.toString(),
        tipo: d.tipo,
        categoria: d.categoria,
        confidencialidade: d.confidencialidade,
        statusUpload: d.statusUpload,
        statusProcessamento: d.statusProcessamento,
        statusAntivirus: d.statusAntivirus,
        versaoAtual: d.versao,
        totalVersoes: d._count.versoes,
        pasta: d.pasta,
        processo: d.processo,
        cliente:
          d.clienteId && clientePorId.has(d.clienteId) ? clientePorId.get(d.clienteId)! : null,
        autor: autorPorId.has(d.autorUploadId)
          ? {
              id: d.autorUploadId,
              nome: autorPorId.get(d.autorUploadId)!.usuario?.nome,
              avatarUrl: autorPorId.get(d.autorUploadId)!.usuario?.avatarUrl,
            }
          : null,
        tags: d.tags.map((dt) => ({ id: dt.tag.id, nome: dt.tag.nome, cor: dt.tag.cor })),
        favorito: d.favoritos.length > 0,
        criadoEm: d.criadoEm,
        atualizadoEm: d.atualizadoEm,
        excluidoEm: d.excluidoEm,
      })),
      nextCursor: hasMore ? pagina[pagina.length - 1].id : null,
      total,
      disponivel: true,
    };
  }
}
