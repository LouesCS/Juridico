import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { STORAGE_PORT, StoragePort } from '../../../../shared/infrastructure/storage/storage.port';
import {
  ANTIVIRUS_PORT,
  AntivirusPort,
} from '../../../../shared/infrastructure/storage/antivirus.port';
import { TimelineRecorderService } from '../../../timeline/application/timeline-recorder.service';
import { DocumentVersionTokenService } from '../document-version-token';
import { LegalFoldersService } from '../../../legal-folders/application/legal-folders.service';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import {
  ConfirmDocumentUploadDto,
  ConfirmDocumentVersionDto,
  PresignDocumentUploadDto,
  PresignDocumentVersionDto,
} from '../../presentation/schemas/document.schemas';

const TAMANHO_MAXIMO_BYTES = 100 * 1024 * 1024; // 100MB — reafirma docs/api/10-documents.md §10.3
const UPLOAD_TTL_SEGUNDOS = 15 * 60;

// Denylist pragmática (não allowlist) — escritórios recebem os formatos mais
// variados de prova/documento; bloqueia apenas o que é claramente executável.
const MIME_BLOQUEADOS = new Set([
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-sh',
  'application/x-executable',
  'application/x-bat',
  'application/vnd.microsoft.portable-executable',
]);

function extensaoDe(nomeArquivo: string): string {
  const partes = nomeArquivo.split('.');
  return partes.length > 1 ? partes[partes.length - 1].toLowerCase() : '';
}

function sanitizarNomeArquivo(nomeArquivo: string): string {
  return nomeArquivo.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function validarArquivo(tamanhoBytes: number, mimeType: string): DomainError | null {
  if (tamanhoBytes > TAMANHO_MAXIMO_BYTES) {
    return new DomainError('FILE_TOO_LARGE', 'Arquivo excede o tamanho máximo de 100MB.');
  }
  if (MIME_BLOQUEADOS.has(mimeType.toLowerCase())) {
    return new DomainError('MIME_NOT_ALLOWED', 'Tipo de arquivo não suportado.');
  }
  return null;
}

@Injectable()
export class PresignDocumentUploadUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    private readonly legalFolders: LegalFoldersService,
  ) {}

  async execute(
    escritorioId: string,
    dto: PresignDocumentUploadDto,
    autorUploadId: string,
    user?: AuthUser,
  ): Promise<Result<{ documentoId: string; uploadUrl: string; expiraEm: Date }>> {
    const erroArquivo = validarArquivo(dto.tamanhoBytes, dto.mimeType);
    if (erroArquivo) return Result.fail(erroArquivo);

    if (dto.processoId) {
      const processo = await this.prisma.client.processo.findFirst({
        where: { id: dto.processoId, escritorioId },
        select: { id: true },
      });
      if (!processo) return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));
    }
    if (dto.pastaId) {
      const pasta = await this.prisma.client.pasta.findFirst({
        where: { id: dto.pastaId, escritorioId },
        select: { id: true },
      });
      if (!pasta) return Result.fail(new DomainError('NOT_FOUND', 'Pasta não encontrada.'));
    }
    if (dto.resourceType === 'PASTA_JURIDICA' && dto.resourceId) {
      if (!user)
        return Result.fail(new DomainError('FORBIDDEN', 'Contexto de acesso não informado.'));
      await this.legalFolders.get(user, dto.resourceId);
    }

    const documento = await this.prisma.client.documento.create({
      data: {
        escritorioId,
        processoId: dto.processoId,
        clienteId: dto.clienteId,
        pastaId: dto.pastaId,
        nome: dto.nomeArquivo,
        nomeOriginal: dto.nomeArquivo,
        extensao: extensaoDe(dto.nomeArquivo),
        mimeType: dto.mimeType,
        tamanhoBytes: BigInt(dto.tamanhoBytes),
        storageKey: '',
        tipo: dto.tipo,
        categoria: dto.categoria,
        autorUploadId,
        statusUpload: 'PENDENTE',
      },
      select: { id: true },
    });

    if (dto.resourceType && dto.resourceId) {
      await this.prisma.client.documentoVinculo.create({
        data: {
          escritorioId,
          documentoId: documento.id,
          tipoRecurso: dto.resourceType,
          recursoId: dto.resourceId,
          criadoPorId: autorUploadId,
        },
      });
    }

    const storageKey = `${escritorioId}/${documento.id}/v1/${randomUUID()}-${sanitizarNomeArquivo(dto.nomeArquivo)}`;
    await this.prisma.client.documento.update({
      where: { id: documento.id },
      data: { storageKey },
    });

    const presigned = await this.storage.presignUpload(
      storageKey,
      dto.mimeType,
      UPLOAD_TTL_SEGUNDOS,
    );

    return Result.ok({
      documentoId: documento.id,
      uploadUrl: presigned.url,
      expiraEm: presigned.expiraEm,
    });
  }
}

@Injectable()
export class ConfirmDocumentUploadUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ANTIVIRUS_PORT) private readonly antivirus: AntivirusPort,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    documentoId: string,
    dto: ConfirmDocumentUploadDto,
    autorUploadId: string,
  ): Promise<
    Result<{ id: string; avisoDuplicidade: { documentoExistenteId: string; nome: string } | null }>
  > {
    const documento = await this.prisma.client.documento.findFirst({
      where: { id: documentoId, escritorioId },
    });
    if (!documento) return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));
    if (documento.statusUpload !== 'PENDENTE') {
      return Result.fail(
        new DomainError('UPLOAD_NOT_PENDING', 'Upload já foi confirmado ou expirou.'),
      );
    }

    const duplicado = await this.prisma.client.documento.findFirst({
      where: { escritorioId, hashSha256: dto.hashSha256, id: { not: documentoId } },
      select: { id: true, nome: true },
    });

    const versao = await this.prisma.client.versaoDocumento.create({
      data: {
        documentoId,
        numero: 1,
        storageKey: documento.storageKey,
        hashSha256: dto.hashSha256,
        tamanhoBytes: documento.tamanhoBytes,
        autorId: autorUploadId,
      },
    });

    const statusAntivirus = await this.antivirus.scan(documento.storageKey);

    await this.prisma.client.documento.update({
      where: { id: documentoId },
      data: {
        hashSha256: dto.hashSha256,
        versaoVigenteId: versao.id,
        statusUpload: 'CONCLUIDO',
        statusAntivirus,
        // Sem pipeline assíncrono real (BullMQ não implementado — ver
        // docs/backend-implementation/00-status.md) — extração/thumbnail/
        // indexação/embeddings ficam pendentes; PRONTO aqui significa apenas
        // "disponível para uso", não "totalmente processado".
        statusProcessamento: 'PRONTO',
      },
    });

    // `EventoTimeline.processoId` é NOT NULL (schema.prisma) — documento
    // "solto" (biblioteca geral, sem processo) não tem onde registrar o
    // evento automático; mesma limitação já documentada para Login/Acesso na
    // Sprint 08 (docs/backend-implementation/20-context-next-step.md achado #4).
    if (documento.processoId) {
      await this.timeline.record({
        escritorioId,
        processoId: documento.processoId,
        tipo: 'DOCUMENTO',
        titulo: `Documento enviado: ${documento.nome}`,
        autorId: autorUploadId,
        entidadeRelacionadaTipo: 'documento',
        entidadeRelacionadaId: documentoId,
      });
    }

    return Result.ok({
      id: documentoId,
      avisoDuplicidade: duplicado
        ? { documentoExistenteId: duplicado.id, nome: duplicado.nome }
        : null,
    });
  }
}

@Injectable()
export class PresignDocumentVersionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    private readonly versionTokens: DocumentVersionTokenService,
  ) {}

  async execute(
    escritorioId: string,
    documentoId: string,
    dto: PresignDocumentVersionDto,
  ): Promise<
    Result<{ uploadUrl: string; expiraEm: Date; proximoNumero: number; versionToken: string }>
  > {
    const erroArquivo = validarArquivo(dto.tamanhoBytes, dto.mimeType);
    if (erroArquivo) return Result.fail(erroArquivo);

    const documento = await this.prisma.client.documento.findFirst({
      where: { id: documentoId, escritorioId },
      include: { versoes: { orderBy: { numero: 'desc' }, take: 1 } },
    });
    if (!documento) return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));

    const proximoNumero = (documento.versoes[0]?.numero ?? 0) + 1;
    const storageKey = `${escritorioId}/${documentoId}/v${proximoNumero}/${randomUUID()}-${sanitizarNomeArquivo(dto.nomeArquivo)}`;
    const presigned = await this.storage.presignUpload(
      storageKey,
      dto.mimeType,
      UPLOAD_TTL_SEGUNDOS,
    );

    const versionToken = this.versionTokens.sign({
      documentoId,
      numero: proximoNumero,
      storageKey,
      tamanhoBytes: dto.tamanhoBytes,
      exp: Date.now() + UPLOAD_TTL_SEGUNDOS * 1000,
    });

    return Result.ok({
      uploadUrl: presigned.url,
      expiraEm: presigned.expiraEm,
      proximoNumero,
      versionToken,
    });
  }
}

@Injectable()
export class ConfirmDocumentVersionUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ANTIVIRUS_PORT) private readonly antivirus: AntivirusPort,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    private readonly timeline: TimelineRecorderService,
    private readonly versionTokens: DocumentVersionTokenService,
  ) {}

  async execute(
    escritorioId: string,
    documentoId: string,
    input: ConfirmDocumentVersionDto,
    autorId: string,
  ): Promise<Result<{ id: string; numero: number }>> {
    const documento = await this.prisma.client.documento.findFirst({
      where: { id: documentoId, escritorioId },
    });
    if (!documento) return Result.fail(new DomainError('NOT_FOUND', 'Documento não encontrado.'));

    const pending = this.versionTokens.verify(input.versionToken);
    if (!pending || pending.documentoId !== documentoId) {
      return Result.fail(
        new DomainError('UPLOAD_EXPIRED', 'Token de versão inválido ou expirado.'),
      );
    }

    const existe = await this.storage.exists(pending.storageKey);
    if (!existe)
      return Result.fail(new DomainError('UPLOAD_EXPIRED', 'Upload não encontrado no storage.'));

    const versao = await this.prisma.client.versaoDocumento.create({
      data: {
        documentoId,
        numero: pending.numero,
        storageKey: pending.storageKey,
        hashSha256: input.hashSha256,
        tamanhoBytes: BigInt(pending.tamanhoBytes),
        autorId,
        comentarioVersao: input.comentarioVersao,
      },
    });

    const statusAntivirus = await this.antivirus.scan(pending.storageKey);

    await this.prisma.client.documento.update({
      where: { id: documentoId },
      data: {
        versaoVigenteId: versao.id,
        storageKey: pending.storageKey,
        hashSha256: input.hashSha256,
        tamanhoBytes: BigInt(pending.tamanhoBytes),
        statusAntivirus,
        statusProcessamento: 'PRONTO',
      },
    });

    if (documento.processoId) {
      await this.timeline.record({
        escritorioId,
        processoId: documento.processoId,
        tipo: 'DOCUMENTO',
        titulo: `Nova versão de documento: ${documento.nome} (v${pending.numero})`,
        autorId,
        entidadeRelacionadaTipo: 'documento',
        entidadeRelacionadaId: documentoId,
      });
    }

    return Result.ok({ id: versao.id, numero: versao.numero });
  }
}
