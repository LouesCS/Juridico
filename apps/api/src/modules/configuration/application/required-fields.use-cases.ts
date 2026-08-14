import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import {
  BulkUpdateRequiredFieldsDto,
  ListByEntidadeQuery,
} from '../presentation/schemas/configuration.schemas';

/**
 * Define QUAIS campos fixos de uma entidade são obrigatórios — não
 * conectado ao formulário real de Cliente/Processo nesta rodada (exigiria
 * alterar o contrato desses módulos, proibido explicitamente pelo Prompt
 * 13). Ver pendência em docs/backend-implementation/22-configuration-engine.md §22.9.
 */
@Injectable()
export class ListRequiredFieldsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, query: ListByEntidadeQuery) {
    return this.prisma.client.campoObrigatorio.findMany({
      where: { escritorioId, entidade: query.entidade },
      orderBy: [{ entidade: 'asc' }, { campo: 'asc' }],
    });
  }
}

@Injectable()
export class BulkUpdateRequiredFieldsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, dto: BulkUpdateRequiredFieldsDto) {
    await this.prisma.client.$transaction(
      dto.itens.map((item) =>
        this.prisma.client.campoObrigatorio.upsert({
          where: {
            escritorioId_entidade_campo: {
              escritorioId,
              entidade: item.entidade,
              campo: item.campo,
            },
          },
          create: { escritorioId, ...item },
          update: { obrigatorio: item.obrigatorio },
        }),
      ),
    );

    return this.prisma.client.campoObrigatorio.findMany({
      where: { escritorioId },
      orderBy: [{ entidade: 'asc' }, { campo: 'asc' }],
    });
  }
}
