import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import { DomainError, Result } from '../../../../shared/domain/result';
import { TimelineRecorderService } from '../../../timeline/application/timeline-recorder.service';
import { UpdateDocumentDto } from '../../presentation/schemas/document.schemas';
import { assertDocumentAccess } from '../document-scope';

@Injectable()
export class UpdateDocumentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    documentoId: string,
    dto: UpdateDocumentDto,
    user: AuthUser,
  ): Promise<Result<void>> {
    const documento = await this.prisma.client.documento.findFirst({
      where: { id: documentoId, escritorioId },
    });
    if (!documento) return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));
    if (!(await assertDocumentAccess(this.prisma, documento, user))) {
      return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));
    }

    const { tagIds, ...metadados } = dto;

    await this.prisma.client.$transaction(async (tx) => {
      await tx.documento.update({
        where: { id: documentoId },
        data: {
          ...metadados,
          dataDocumento:
            metadados.dataDocumento === undefined
              ? undefined
              : metadados.dataDocumento
                ? new Date(metadados.dataDocumento)
                : null,
          versao: { increment: 1 },
        },
      });

      if (tagIds !== undefined) {
        await tx.documentoTag.deleteMany({ where: { documentoId } });
        if (tagIds.length > 0) {
          await tx.documentoTag.createMany({
            data: tagIds.map((tagId) => ({ documentoId, tagId })),
            skipDuplicates: true,
          });
        }
      }
    });

    if (documento.processoId) {
      await this.timeline.record({
        escritorioId,
        processoId: documento.processoId,
        tipo: 'DOCUMENTO',
        titulo: `Documento atualizado: ${dto.nome ?? documento.nome}`,
        autorId: user.membroId,
        entidadeRelacionadaTipo: 'documento',
        entidadeRelacionadaId: documentoId,
      });
    }

    return Result.ok(undefined);
  }
}
