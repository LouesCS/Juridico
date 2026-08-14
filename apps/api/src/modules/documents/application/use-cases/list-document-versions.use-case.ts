import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import { DomainError, Result } from '../../../../shared/domain/result';
import { assertDocumentAccess } from '../document-scope';

/** Reafirma docs/api/10-documents.md §10.2 — `GET /v1/documents/:id/versions`. */
@Injectable()
export class ListDocumentVersionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, documentoId: string, user: AuthUser) {
    const documento = await this.prisma.client.documento.findFirst({
      where: { id: documentoId, escritorioId },
    });
    if (!documento) return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));
    if (!(await assertDocumentAccess(this.prisma, documento, user))) {
      return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));
    }

    const versoes = await this.prisma.client.versaoDocumento.findMany({
      where: { documentoId },
      orderBy: { numero: 'desc' },
    });

    const autorIds = [...new Set(versoes.map((v) => v.autorId))];
    const autores = await this.prisma.client.membro.findMany({
      where: { id: { in: autorIds } },
      include: { usuario: true },
    });
    const autorPorId = new Map(autores.map((a) => [a.id, a]));

    return Result.ok(
      versoes.map((v) => ({
        id: v.id,
        numero: v.numero,
        tamanhoBytes: v.tamanhoBytes.toString(),
        comentarioVersao: v.comentarioVersao,
        vigente: v.id === documento.versaoVigenteId,
        autor: autorPorId.has(v.autorId)
          ? { id: v.autorId, nome: autorPorId.get(v.autorId)!.usuario?.nome }
          : null,
        criadoEm: v.criadoEm,
      })),
    );
  }
}
