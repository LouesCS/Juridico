import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { Result } from '../../../../shared/domain/result';
import { CreateTagDto } from '../../presentation/schemas/document.schemas';

/**
 * `Tag` (docs/database/05-entidades-documentos-colaboracao.md §5.6) já
 * existe completa no schema desde a Fase 1 — esta rodada só implementa o
 * mínimo para o seletor de tags de Documentos funcionar (listar + criar sob
 * demanda); gestão completa de tags (editar/excluir, tags de Processo) segue
 * deferida, mesma pendência registrada desde o Prompt 7.
 */
@Injectable()
export class ListTagsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string) {
    const tags = await this.prisma.client.tag.findMany({
      where: { escritorioId },
      orderBy: { nome: 'asc' },
    });
    return Result.ok(tags);
  }
}

@Injectable()
export class CreateTagUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    dto: CreateTagDto,
  ): Promise<Result<{ id: string; nome: string; cor: string }>> {
    const existente = await this.prisma.client.tag.findFirst({
      where: { escritorioId, nome: { equals: dto.nome, mode: 'insensitive' } },
    });
    if (existente) return Result.ok(existente);

    const tag = await this.prisma.client.tag.create({
      data: { escritorioId, nome: dto.nome, cor: dto.cor, descricao: dto.descricao },
    });
    return Result.ok(tag);
  }
}
