import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import { DomainError, Result } from '../../../../shared/domain/result';
import { assertDocumentAccess } from '../document-scope';

/**
 * Reafirma docs/api/03-autorizacao.md §3.7 — mesma estratégia de
 * `GetLegalCaseUseCase` (404, nunca 403, para não revelar a existência de um
 * documento fora do escopo do usuário).
 */
@Injectable()
export class GetDocumentUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, documentoId: string, user: AuthUser) {
    // `Documento.clienteId` é uma coluna solta (sem relação Prisma declarada
    // para `Cliente`) — mesmo padrão já usado para
    // `Processo.responsavelPrincipalId`/`Membro` em `case-scope.ts`;
    // resolvido por consulta separada, nunca por `include`.
    const documento = await this.prisma.client.documento.findFirst({
      where: { id: documentoId, escritorioId },
      include: {
        pasta: { select: { id: true, nome: true } },
        processo: { select: { id: true, titulo: true, numeroCnj: true } },
        versoes: { orderBy: { numero: 'desc' } },
        tags: { include: { tag: true } },
      },
    });
    if (!documento) return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));

    if (!(await assertDocumentAccess(this.prisma, documento, user))) {
      return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));
    }

    const [autor, cliente] = await Promise.all([
      this.prisma.client.membro.findFirst({
        where: { id: documento.autorUploadId },
        include: { usuario: true },
      }),
      documento.clienteId
        ? this.prisma.client.cliente.findFirst({
            where: { id: documento.clienteId },
            select: { id: true, nome: true },
          })
        : Promise.resolve(null),
    ]);

    const favorito = await this.prisma.client.documentoFavorito.findUnique({
      where: { documentoId_membroId: { documentoId, membroId: user.membroId } },
    });

    return Result.ok({
      id: documento.id,
      nome: documento.nome,
      nomeOriginal: documento.nomeOriginal,
      extensao: documento.extensao,
      mimeType: documento.mimeType,
      tamanhoBytes: documento.tamanhoBytes.toString(),
      tipo: documento.tipo,
      categoria: documento.categoria,
      descricao: documento.descricao,
      confidencialidade: documento.confidencialidade,
      visibilidade: documento.visibilidade,
      statusUpload: documento.statusUpload,
      statusProcessamento: documento.statusProcessamento,
      statusAntivirus: documento.statusAntivirus,
      versaoAtual: documento.versao,
      totalVersoes: documento.versoes.length,
      dataDocumento: documento.dataDocumento,
      pasta: documento.pasta,
      processo: documento.processo,
      cliente,
      autor: autor
        ? { id: autor.id, nome: autor.usuario?.nome, avatarUrl: autor.usuario?.avatarUrl }
        : null,
      tags: documento.tags.map((dt) => ({ id: dt.tag.id, nome: dt.tag.nome, cor: dt.tag.cor })),
      favorito: Boolean(favorito),
      criadoEm: documento.criadoEm,
      atualizadoEm: documento.atualizadoEm,
      excluidoEm: documento.excluidoEm,
      // Preparação para IA/relacionamentos futuros — placeholder explícito, nunca dado inventado.
      resumoIaVigente: null,
      comentarios: [] as unknown[],
    });
  }
}
