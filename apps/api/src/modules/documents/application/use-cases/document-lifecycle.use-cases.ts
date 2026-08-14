import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { INCLUDE_DELETED } from '../../../../shared/infrastructure/database/soft-delete.extension';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import { DomainError, Result } from '../../../../shared/domain/result';
import { TipoEventoTimeline } from '@prisma/client';
import { TimelineRecorderService } from '../../../timeline/application/timeline-recorder.service';
import { MoveDocumentDto } from '../../presentation/schemas/document.schemas';
import { assertDocumentAccess } from '../document-scope';

/**
 * `EventoTimeline.processoId` é `NOT NULL` — documento "solto" (biblioteca
 * geral) não tem onde registrar o evento automático; mesma limitação já
 * documentada para Login/Acesso na Sprint 08. Grava só quando há processo
 * vinculado (antes OU depois da ação, o que existir).
 */
async function recordIfLinked(
  timeline: TimelineRecorderService,
  escritorioId: string,
  processoId: string | null | undefined,
  tipo: TipoEventoTimeline,
  titulo: string,
  autorId: string,
  documentoId: string,
): Promise<void> {
  if (!processoId) return;
  await timeline.record({
    escritorioId,
    processoId,
    tipo,
    titulo,
    autorId,
    entidadeRelacionadaTipo: 'documento',
    entidadeRelacionadaId: documentoId,
  });
}

@Injectable()
export class MoveDocumentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    documentoId: string,
    dto: MoveDocumentDto,
    user: AuthUser,
  ): Promise<Result<void>> {
    const documento = await this.prisma.client.documento.findFirst({
      where: { id: documentoId, escritorioId },
    });
    if (!documento) return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));
    if (!(await assertDocumentAccess(this.prisma, documento, user))) {
      return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));
    }

    if (dto.pastaId) {
      const pasta = await this.prisma.client.pasta.findFirst({
        where: { id: dto.pastaId, escritorioId },
      });
      if (!pasta)
        return Result.fail(new DomainError('NOT_FOUND', 'Pasta de destino não encontrada.'));
    }
    if (dto.processoId) {
      const processo = await this.prisma.client.processo.findFirst({
        where: { id: dto.processoId, escritorioId },
      });
      if (!processo)
        return Result.fail(new DomainError('NOT_FOUND', 'Processo de destino não encontrado.'));
    }

    await this.prisma.client.documento.update({
      where: { id: documentoId },
      data: {
        pastaId: dto.pastaId === undefined ? undefined : dto.pastaId,
        processoId: dto.processoId === undefined ? undefined : dto.processoId,
      },
    });

    const processoRelevante = dto.processoId !== undefined ? dto.processoId : documento.processoId;
    await recordIfLinked(
      this.timeline,
      escritorioId,
      processoRelevante,
      'DOCUMENTO',
      `Documento movido: ${documento.nome}`,
      user.membroId,
      documentoId,
    );

    return Result.ok(undefined);
  }
}

@Injectable()
export class DeleteDocumentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(escritorioId: string, documentoId: string, user: AuthUser): Promise<Result<void>> {
    const documento = await this.prisma.client.documento.findFirst({
      where: { id: documentoId, escritorioId },
    });
    if (!documento) return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));
    if (!(await assertDocumentAccess(this.prisma, documento, user))) {
      return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));
    }

    await this.prisma.client.documento.delete({ where: { id: documentoId } });

    await recordIfLinked(
      this.timeline,
      escritorioId,
      documento.processoId,
      'DOCUMENTO',
      `Documento excluído: ${documento.nome}`,
      user.membroId,
      documentoId,
    );

    return Result.ok(undefined);
  }
}

@Injectable()
export class RestoreDocumentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(escritorioId: string, documentoId: string, user: AuthUser): Promise<Result<void>> {
    const documento = await this.prisma.client.documento.findFirst({
      where: { id: documentoId, escritorioId, ...INCLUDE_DELETED },
    });
    if (!documento) return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));

    await this.prisma.client.documento.update({
      where: { id: documentoId },
      data: { excluidoEm: null },
    });

    await recordIfLinked(
      this.timeline,
      escritorioId,
      documento.processoId,
      'DOCUMENTO',
      `Documento restaurado: ${documento.nome}`,
      user.membroId,
      documentoId,
    );

    return Result.ok(undefined);
  }
}

/**
 * "Duplicar" cria um novo `Documento` + `VersaoDocumento` v1 apontando para a
 * MESMA `storageKey` do original — `StoragePort` não tem (nem deveria ter)
 * um método `copy` (docs/backend/07-storage.md §7.1 fixa o contrato em 4
 * métodos); como `VersaoDocumento` é imutável por design (nunca sobrescrita),
 * duas linhas de `Documento` apontando para o mesmo binário imutável é seguro
 * e evita reinventar o storage port só para este caso.
 */
@Injectable()
export class DuplicateDocumentUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    documentoId: string,
    user: AuthUser,
  ): Promise<Result<{ id: string }>> {
    const original = await this.prisma.client.documento.findFirst({
      where: { id: documentoId, escritorioId },
    });
    if (!original) return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));
    if (!(await assertDocumentAccess(this.prisma, original, user))) {
      return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));
    }

    const copia = await this.prisma.client.documento.create({
      data: {
        escritorioId,
        processoId: original.processoId,
        clienteId: original.clienteId,
        pastaId: original.pastaId,
        nome: `${original.nome} (cópia)`,
        nomeOriginal: original.nomeOriginal,
        extensao: original.extensao,
        mimeType: original.mimeType,
        tamanhoBytes: original.tamanhoBytes,
        storageKey: original.storageKey,
        hashSha256: original.hashSha256,
        statusUpload: 'CONCLUIDO',
        statusProcessamento: original.statusProcessamento,
        statusAntivirus: original.statusAntivirus,
        categoria: original.categoria,
        tipo: original.tipo,
        confidencialidade: original.confidencialidade,
        visibilidade: original.visibilidade,
        descricao: original.descricao,
        autorUploadId: user.membroId,
        dataDocumento: original.dataDocumento,
      },
    });

    const versao = await this.prisma.client.versaoDocumento.create({
      data: {
        documentoId: copia.id,
        numero: 1,
        storageKey: original.storageKey,
        hashSha256: original.hashSha256 ?? '',
        tamanhoBytes: original.tamanhoBytes,
        autorId: user.membroId,
        comentarioVersao: `Duplicado de "${original.nome}"`,
      },
    });

    await this.prisma.client.documento.update({
      where: { id: copia.id },
      data: { versaoVigenteId: versao.id },
    });

    await recordIfLinked(
      this.timeline,
      escritorioId,
      copia.processoId,
      'DOCUMENTO',
      `Documento duplicado: ${copia.nome}`,
      user.membroId,
      copia.id,
    );

    return Result.ok({ id: copia.id });
  }
}

@Injectable()
export class ToggleDocumentFavoriteUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    documentoId: string,
    user: AuthUser,
  ): Promise<Result<{ favorito: boolean }>> {
    const documento = await this.prisma.client.documento.findFirst({
      where: { id: documentoId, escritorioId },
    });
    if (!documento) return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));
    if (!(await assertDocumentAccess(this.prisma, documento, user))) {
      return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));
    }

    const membroId = user.membroId;
    const existente = await this.prisma.client.documentoFavorito.findUnique({
      where: { documentoId_membroId: { documentoId, membroId } },
    });

    if (existente) {
      await this.prisma.client.documentoFavorito.delete({
        where: { documentoId_membroId: { documentoId, membroId } },
      });
      await recordIfLinked(
        this.timeline,
        escritorioId,
        documento.processoId,
        'DOCUMENTO',
        `Documento desfavoritado: ${documento.nome}`,
        membroId,
        documentoId,
      );
      return Result.ok({ favorito: false });
    }

    await this.prisma.client.documentoFavorito.create({ data: { documentoId, membroId } });
    await recordIfLinked(
      this.timeline,
      escritorioId,
      documento.processoId,
      'DOCUMENTO',
      `Documento favoritado: ${documento.nome}`,
      membroId,
      documentoId,
    );
    return Result.ok({ favorito: true });
  }
}
