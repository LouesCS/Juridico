import { Injectable } from '@nestjs/common';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { LegalFoldersService } from '../../../legal-folders/application/legal-folders.service';

@Injectable()
export class UnlinkDocumentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly legalFolders: LegalFoldersService,
  ) {}

  async execute(
    escritorioId: string,
    documentoId: string,
    pastaJuridicaId: string,
    user: AuthUser,
  ) {
    const documento = await this.prisma.client.documento.findFirst({
      where: { id: documentoId, escritorioId },
      select: { id: true },
    });
    if (!documento) return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));
    await this.legalFolders.get(user, pastaJuridicaId);
    await this.prisma.client.documentoVinculo.deleteMany({
      where: {
        escritorioId,
        documentoId,
        tipoRecurso: 'PASTA_JURIDICA',
        recursoId: pastaJuridicaId,
      },
    });
    return Result.ok(undefined);
  }
}
