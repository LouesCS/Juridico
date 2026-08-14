import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import { DomainError, Result } from '../../../../shared/domain/result';
import { assertDocumentAccess } from '../../../documents/application/document-scope';
import { AiContextResult, FonteIaDraft } from '../../domain/ai-types';
import { hashContent } from '../context-hash';

/**
 * Reafirma Sprint 11 §"IA DO DOCUMENTO" — monta o contexto para
 * `resumo-documento`. Limitação honesta e explícita: `Documento` não tem
 * coluna de texto extraído (pipeline OCR/extração não existe, pendência
 * registrada desde a Sprint 09) — o contexto é só metadado (nome, tipo,
 * categoria, tags, processo/cliente relacionado), nunca o conteúdo real do
 * arquivo. `baseadoApenasEmMetadados: true` é propagado ao DTO para nunca
 * sugerir ao usuário que o conteúdo do PDF foi lido.
 */
@Injectable()
export class DocumentContextBuilder {
  constructor(private readonly prisma: PrismaService) {}

  async build(
    escritorioId: string,
    documentoId: string,
    user: AuthUser,
  ): Promise<Result<AiContextResult>> {
    const documento = await this.prisma.client.documento.findFirst({
      where: { id: documentoId, escritorioId },
      include: {
        processo: { select: { id: true, titulo: true } },
        tags: { include: { tag: { select: { nome: true } } } },
      },
    });
    if (!documento) return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));

    if (!(await assertDocumentAccess(this.prisma, documento, user))) {
      return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));
    }

    const cliente = documento.clienteId
      ? await this.prisma.client.cliente.findFirst({
          where: { id: documento.clienteId },
          select: { id: true, nome: true },
        })
      : null;

    const fontes: FonteIaDraft[] = [
      {
        sourceType: 'DOCUMENTO',
        documentoId: documento.id,
        trechoOuReferencia: `Metadados de ${documento.nome} (conteúdo do arquivo não analisado — sem pipeline de extração de texto)`,
        hashFonte: hashContent({
          nome: documento.nome,
          versao: documento.versao,
          atualizadoEm: documento.atualizadoEm,
        }),
      },
    ];
    if (documento.processo) {
      fontes.push({
        sourceType: 'PROCESSO',
        processoId: documento.processo.id,
        trechoOuReferencia: documento.processo.titulo,
        hashFonte: hashContent({ id: documento.processo.id, titulo: documento.processo.titulo }),
      });
    }

    return Result.ok({
      promptContext: {
        campos: {
          Nome: documento.nome,
          Tipo: documento.tipo,
          Categoria: documento.categoria,
          Extensão: documento.extensao,
          Processo: documento.processo?.titulo,
          Cliente: cliente?.nome,
          'Data do documento': documento.dataDocumento?.toISOString().slice(0, 10),
          Versão: documento.versao,
        },
        listas: {
          Tags: documento.tags.map((t) => t.tag.nome),
        },
      },
      fontes,
    });
  }
}
