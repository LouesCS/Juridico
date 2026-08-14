import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import { DomainError, Result } from '../../../../shared/domain/result';
import { STORAGE_PORT, StoragePort } from '../../../../shared/infrastructure/storage/storage.port';
import { assertDocumentAccess } from '../document-scope';

const DOWNLOAD_TTL_SEGUNDOS = 5 * 60; // reafirma docs/backend/07-storage.md §7.4 e docs/api/10-documents.md §10.5

/**
 * Reafirma docs/api/10-documents.md §10.5 — `statusAntivirus = INFECTADO`
 * bloqueia download/preview incondicionalmente, verificado aqui (não apenas
 * na UI).
 */
async function resolverDocumentoParaEntrega(
  prisma: PrismaService,
  escritorioId: string,
  documentoId: string,
  user: AuthUser,
) {
  const documento = await prisma.client.documento.findFirst({
    where: { id: documentoId, escritorioId },
  });
  if (!documento)
    return Result.fail<never>(new DomainError('NOT_FOUND', 'Documento não encontrado.'));
  if (!(await assertDocumentAccess(prisma, documento, user))) {
    return Result.fail<never>(new DomainError('NOT_FOUND', 'Documento não encontrado.'));
  }
  if (documento.statusAntivirus === 'INFECTADO') {
    return Result.fail<never>(
      new DomainError(
        'FILE_INFECTED',
        'Arquivo bloqueado por segurança (antivírus detectou ameaça).',
      ),
    );
  }
  if (!documento.storageKey || documento.statusUpload !== 'CONCLUIDO') {
    return Result.fail<never>(
      new DomainError('NOT_FOUND', 'Documento ainda não possui conteúdo enviado.'),
    );
  }
  return Result.ok(documento);
}

@Injectable()
export class DownloadDocumentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
  ) {}

  async execute(escritorioId: string, documentoId: string, user: AuthUser) {
    const resolved = await resolverDocumentoParaEntrega(
      this.prisma,
      escritorioId,
      documentoId,
      user,
    );
    if (!resolved.ok) return resolved;

    const presigned = await this.storage.presignDownload(
      resolved.value.storageKey,
      DOWNLOAD_TTL_SEGUNDOS,
      {
        disposition: 'attachment',
        fileName: resolved.value.nome,
      },
    );
    return Result.ok(presigned);
  }
}

/** Reafirma docs/api/10-documents.md §10.2 — `GET /v1/documents/:id/versions/:versaoId/download`. */
@Injectable()
export class DownloadDocumentVersionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
  ) {}

  async execute(escritorioId: string, documentoId: string, versaoId: string, user: AuthUser) {
    const documento = await this.prisma.client.documento.findFirst({
      where: { id: documentoId, escritorioId },
    });
    if (!documento) return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));
    if (!(await assertDocumentAccess(this.prisma, documento, user))) {
      return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));
    }
    if (documento.statusAntivirus === 'INFECTADO') {
      return Result.fail(
        new DomainError(
          'FILE_INFECTED',
          'Arquivo bloqueado por segurança (antivírus detectou ameaça).',
        ),
      );
    }

    const versao = await this.prisma.client.versaoDocumento.findFirst({
      where: { id: versaoId, documentoId },
    });
    if (!versao) return Result.fail(new DomainError('NOT_FOUND', 'Versão não encontrada.'));

    const presigned = await this.storage.presignDownload(versao.storageKey, DOWNLOAD_TTL_SEGUNDOS, {
      disposition: 'attachment',
      fileName: `${documento.nome} (v${versao.numero})`,
    });
    return Result.ok(presigned);
  }
}

@Injectable()
export class PreviewDocumentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
  ) {}

  async execute(escritorioId: string, documentoId: string, user: AuthUser) {
    const resolved = await resolverDocumentoParaEntrega(
      this.prisma,
      escritorioId,
      documentoId,
      user,
    );
    if (!resolved.ok) return resolved;

    const presigned = await this.storage.presignDownload(
      resolved.value.storageKey,
      DOWNLOAD_TTL_SEGUNDOS,
      {
        disposition: 'inline',
        fileName: resolved.value.nome,
      },
    );
    return Result.ok({ ...presigned, mimeType: resolved.value.mimeType });
  }
}
