import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { INCLUDE_DELETED } from '../../../../shared/infrastructure/database/soft-delete.extension';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import { DomainError, Result } from '../../../../shared/domain/result';
import {
  CreateFolderDto,
  ListFoldersQuery,
  ReorderFolderDto,
  UpdateFolderDto,
} from '../../presentation/schemas/folder.schemas';

const MAX_DEPTH = 6;

/** Profundidade da própria pasta na árvore (raiz = 1). Percorre a cadeia de ancestrais, nunca confia em cache. */
async function computeDepth(prisma: PrismaService, pastaId: string | null): Promise<number> {
  let depth = 0;
  let currentId = pastaId;
  let guard = 0;
  while (currentId && guard < MAX_DEPTH + 2) {
    const pasta = await prisma.client.pasta.findFirst({
      where: { id: currentId },
      select: { pastaPaiId: true },
    });
    if (!pasta) break;
    depth += 1;
    currentId = pasta.pastaPaiId;
    guard += 1;
  }
  return depth;
}

/** Verdadeiro se `candidatoId` é a própria pasta ou um descendente dela — reafirma docs/database/05 §5.2. */
async function criaCiclo(
  prisma: PrismaService,
  pastaId: string,
  candidatoId: string,
): Promise<boolean> {
  if (pastaId === candidatoId) return true;
  let currentId: string | null = candidatoId;
  let guard = 0;
  while (currentId && guard < MAX_DEPTH + 2) {
    const pasta: { pastaPaiId: string | null } | null = await prisma.client.pasta.findFirst({
      where: { id: currentId },
      select: { pastaPaiId: true },
    });
    if (!pasta) return false;
    if (pasta.pastaPaiId === pastaId) return true;
    currentId = pasta.pastaPaiId;
    guard += 1;
  }
  return false;
}

@Injectable()
export class ListFolderTreeUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, user: AuthUser, query: ListFoldersQuery) {
    const pastas = await this.prisma.client.pasta.findMany({
      where: {
        escritorioId,
        processoId: query.processoId ?? null,
        ...(query.q ? { nome: { contains: query.q, mode: 'insensitive' } } : {}),
      },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
      include: { _count: { select: { documentos: true } } },
    });

    const favoritas = await this.prisma.client.pastaFavorito.findMany({
      where: { membroId: user.membroId, pastaId: { in: pastas.map((p) => p.id) } },
      select: { pastaId: true },
    });
    const favoritasSet = new Set(favoritas.map((f) => f.pastaId));

    return Result.ok(
      pastas.map((p) => ({
        id: p.id,
        nome: p.nome,
        pastaPaiId: p.pastaPaiId,
        processoId: p.processoId,
        ordem: p.ordem,
        totalDocumentos: p._count.documentos,
        favorito: favoritasSet.has(p.id),
        criadoEm: p.criadoEm,
        atualizadoEm: p.atualizadoEm,
      })),
    );
  }
}

@Injectable()
export class CreateFolderUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    dto: CreateFolderDto,
    criadaPorId: string,
  ): Promise<Result<{ id: string }>> {
    if (dto.pastaPaiId) {
      const pai = await this.prisma.client.pasta.findFirst({
        where: { id: dto.pastaPaiId, escritorioId },
      });
      if (!pai) return Result.fail(new DomainError('NOT_FOUND', 'Pasta pai não encontrada.'));
      if ((pai.processoId ?? null) !== (dto.processoId ?? null)) {
        return Result.fail(
          new DomainError(
            'MALFORMED_REQUEST',
            'A subpasta deve pertencer ao mesmo processo da pasta pai.',
          ),
        );
      }
      const depthPai = await computeDepth(this.prisma, dto.pastaPaiId);
      if (depthPai + 1 >= MAX_DEPTH) {
        return Result.fail(
          new DomainError(
            'MAX_DEPTH_EXCEEDED',
            `Profundidade máxima de ${MAX_DEPTH} níveis excedida.`,
          ),
        );
      }
    }

    const totalIrmas = await this.prisma.client.pasta.count({
      where: {
        escritorioId,
        processoId: dto.processoId ?? null,
        pastaPaiId: dto.pastaPaiId ?? null,
      },
    });

    const pasta = await this.prisma.client.pasta.create({
      data: {
        escritorioId,
        processoId: dto.processoId,
        pastaPaiId: dto.pastaPaiId,
        nome: dto.nome,
        ordem: totalIrmas,
        criadaPorId,
      },
      select: { id: true },
    });

    return Result.ok(pasta);
  }
}

@Injectable()
export class RenameMoveFolderUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    pastaId: string,
    dto: UpdateFolderDto,
  ): Promise<Result<void>> {
    const pasta = await this.prisma.client.pasta.findFirst({
      where: { id: pastaId, escritorioId },
    });
    if (!pasta) return Result.fail(new DomainError('NOT_FOUND', 'Pasta não encontrada.'));

    if (dto.pastaPaiId !== undefined && dto.pastaPaiId !== pasta.pastaPaiId) {
      if (dto.pastaPaiId) {
        const novoPai = await this.prisma.client.pasta.findFirst({
          where: { id: dto.pastaPaiId, escritorioId },
        });
        if (!novoPai)
          return Result.fail(new DomainError('NOT_FOUND', 'Pasta de destino não encontrada.'));
        if ((novoPai.processoId ?? null) !== (pasta.processoId ?? null)) {
          return Result.fail(
            new DomainError(
              'MALFORMED_REQUEST',
              'Só é possível mover entre pastas do mesmo processo.',
            ),
          );
        }
        if (await criaCiclo(this.prisma, pastaId, dto.pastaPaiId)) {
          return Result.fail(
            new DomainError(
              'CIRCULAR_REFERENCE',
              'Não é possível mover uma pasta para dentro dela mesma ou de um descendente.',
            ),
          );
        }
        const depthNovoPai = await computeDepth(this.prisma, dto.pastaPaiId);
        if (depthNovoPai + 1 >= MAX_DEPTH) {
          return Result.fail(
            new DomainError(
              'MAX_DEPTH_EXCEEDED',
              `Profundidade máxima de ${MAX_DEPTH} níveis excedida.`,
            ),
          );
        }
      }
    }

    await this.prisma.client.pasta.update({
      where: { id: pastaId },
      data: {
        nome: dto.nome,
        pastaPaiId: dto.pastaPaiId === undefined ? undefined : dto.pastaPaiId,
      },
    });

    return Result.ok(undefined);
  }
}

@Injectable()
export class ReorderFolderUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    pastaId: string,
    dto: ReorderFolderDto,
  ): Promise<Result<void>> {
    const pasta = await this.prisma.client.pasta.findFirst({
      where: { id: pastaId, escritorioId },
    });
    if (!pasta) return Result.fail(new DomainError('NOT_FOUND', 'Pasta não encontrada.'));

    await this.prisma.client.pasta.update({ where: { id: pastaId }, data: { ordem: dto.ordem } });
    return Result.ok(undefined);
  }
}

@Injectable()
export class DeleteFolderUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, pastaId: string, cascata: boolean): Promise<Result<void>> {
    const pasta = await this.prisma.client.pasta.findFirst({
      where: { id: pastaId, escritorioId },
    });
    if (!pasta) return Result.fail(new DomainError('NOT_FOUND', 'Pasta não encontrada.'));

    const [totalSubpastas, totalDocumentos] = await Promise.all([
      this.prisma.client.pasta.count({ where: { pastaPaiId: pastaId } }),
      this.prisma.client.documento.count({ where: { pastaId } }),
    ]);

    if ((totalSubpastas > 0 || totalDocumentos > 0) && !cascata) {
      return Result.fail(
        new DomainError(
          'FOLDER_NOT_EMPTY',
          `Mova ou exclua os ${totalSubpastas + totalDocumentos} itens desta pasta primeiro, ou confirme a exclusão em cascata.`,
          { totalSubpastas, totalDocumentos },
        ),
      );
    }

    if (cascata) {
      await this.excluirRecursivo(pastaId);
    } else {
      await this.prisma.client.pasta.delete({ where: { id: pastaId } });
    }

    return Result.ok(undefined);
  }

  private async excluirRecursivo(pastaId: string): Promise<void> {
    const subpastas = await this.prisma.client.pasta.findMany({
      where: { pastaPaiId: pastaId },
      select: { id: true },
    });
    for (const sub of subpastas) {
      await this.excluirRecursivo(sub.id);
    }
    await this.prisma.client.documento.deleteMany({ where: { pastaId } });
    await this.prisma.client.pasta.delete({ where: { id: pastaId } });
  }
}

/**
 * Restaura apenas a pasta em si — se ela foi excluída em cascata junto de
 * subpastas/documentos, cada um aparece separadamente na Lixeira e é
 * restaurado individualmente (não há "sessão de exclusão" registrada para
 * agrupar um restore atômico); simplificação documentada.
 */
@Injectable()
export class RestoreFolderUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, pastaId: string): Promise<Result<void>> {
    const pasta = await this.prisma.client.pasta.findFirst({
      where: { id: pastaId, escritorioId, ...INCLUDE_DELETED },
    });
    if (!pasta) return Result.fail(new DomainError('NOT_FOUND', 'Pasta não encontrada.'));

    await this.prisma.client.pasta.update({ where: { id: pastaId }, data: { excluidoEm: null } });
    return Result.ok(undefined);
  }
}

@Injectable()
export class ToggleFolderFavoriteUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    pastaId: string,
    membroId: string,
  ): Promise<Result<{ favorito: boolean }>> {
    const pasta = await this.prisma.client.pasta.findFirst({
      where: { id: pastaId, escritorioId },
    });
    if (!pasta) return Result.fail(new DomainError('NOT_FOUND', 'Pasta não encontrada.'));

    const existente = await this.prisma.client.pastaFavorito.findUnique({
      where: { pastaId_membroId: { pastaId, membroId } },
    });

    if (existente) {
      await this.prisma.client.pastaFavorito.delete({
        where: { pastaId_membroId: { pastaId, membroId } },
      });
      return Result.ok({ favorito: false });
    }

    await this.prisma.client.pastaFavorito.create({ data: { pastaId, membroId } });
    return Result.ok({ favorito: true });
  }
}
