import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import { ListDeadlinesAggregateQuery } from '../../presentation/schemas/legal-case.schemas';

/**
 * Reafirma docs/api/09-legal-cases.md §9.4 — sustenta o bloco "Prazos
 * Críticos" do Dashboard e a tela dedicada `/prazos` (Sprint 08) sem exigir
 * N chamadas por processo. `escopo` reaproveita o mesmo racional de
 * `case-scope.ts`, mas aplicado a `Prazo` (que não tem escopo de permissão
 * dedicado — usa o escopo de leitura de processo do próprio usuário como
 * proxy, já que todo prazo pertence a um processo).
 *
 * Lacuna real conhecida: `Prazo` não tem coluna `criadoPorId` — a coluna
 * "Criado por" pedida na listagem não pode ser preenchida com um dado real
 * (por isso o frontend não a exibe; ver docs/backend-implementation/19-decisions.md).
 * `StatusPrazo.ATRASADO` também não é definido automaticamente por nenhum
 * job (BullMQ não implementado nesta rodada) — "vencidos" é calculado pelo
 * cliente/consulta como `PENDENTE` com `dataVencimento` no passado, não
 * pelo status `ATRASADO` em si.
 */
@Injectable()
export class ListDeadlinesAggregateUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, user: AuthUser, query: ListDeadlinesAggregateQuery) {
    const escopoWhere: Prisma.PrazoWhereInput =
      query.escopo === 'todos'
        ? {}
        : query.escopo === 'equipe'
          ? await this.buildEquipeWhere(escritorioId, user.membroId)
          : { responsavelId: user.membroId };

    const where: Prisma.PrazoWhereInput = {
      escritorioId,
      ...escopoWhere,
      ...(query.status ? { status: query.status } : {}),
      ...(query.tipo ? { tipo: query.tipo } : {}),
      ...(query.prioridade ? { prioridade: query.prioridade } : {}),
      ...(query.responsavelId ? { responsavelId: query.responsavelId } : {}),
      ...(query.processoId ? { processoId: query.processoId } : {}),
      ...(query.clienteId ? { processo: { clienteId: query.clienteId } } : {}),
      ...(query.q ? { titulo: { contains: query.q, mode: 'insensitive' } } : {}),
      ...(query.dataVencimentoDe || query.dataVencimentoAte
        ? {
            dataVencimento: {
              ...(query.dataVencimentoDe ? { gte: new Date(query.dataVencimentoDe) } : {}),
              ...(query.dataVencimentoAte ? { lte: new Date(query.dataVencimentoAte) } : {}),
            },
          }
        : {}),
    };

    const orderBy: Prisma.PrazoOrderByWithRelationInput = query.sort.startsWith('-')
      ? { [query.sort.slice(1)]: 'desc' }
      : { [query.sort]: 'asc' };

    const prazos = await this.prisma.client.prazo.findMany({
      where,
      orderBy,
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: {
        processo: { select: { id: true, titulo: true, numeroCnj: true, clienteId: true } },
      },
    });

    const hasMore = prazos.length > query.limit;
    const pagina = hasMore ? prazos.slice(0, query.limit) : prazos;

    const clienteIds = [...new Set(pagina.map((p) => p.processo.clienteId))];
    const responsavelIds = [...new Set(pagina.map((p) => p.responsavelId))];
    const [clientes, responsaveis] = await Promise.all([
      clienteIds.length
        ? this.prisma.client.cliente.findMany({
            where: { id: { in: clienteIds } },
            select: { id: true, nome: true },
          })
        : Promise.resolve([]),
      responsavelIds.length
        ? this.prisma.client.membro.findMany({
            where: { id: { in: responsavelIds } },
            include: { usuario: true },
          })
        : Promise.resolve([]),
    ]);
    const clientePorId = new Map(clientes.map((c) => [c.id, c]));
    const responsavelPorId = new Map(responsaveis.map((r) => [r.id, r]));

    return {
      items: pagina.map((p) => ({
        id: p.id,
        titulo: p.titulo,
        tipo: p.tipo,
        origem: p.origem,
        dataVencimento: p.dataVencimento,
        prioridade: p.prioridade,
        status: p.status,
        criadoEm: p.criadoEm,
        processo: {
          id: p.processo.id,
          titulo: p.processo.titulo,
          numeroCnj: p.processo.numeroCnj,
        },
        cliente: clientePorId.has(p.processo.clienteId)
          ? { id: p.processo.clienteId, nome: clientePorId.get(p.processo.clienteId)!.nome }
          : null,
        responsavel: responsavelPorId.has(p.responsavelId)
          ? {
              id: p.responsavelId,
              nome: responsavelPorId.get(p.responsavelId)!.usuario?.nome,
              avatarUrl: responsavelPorId.get(p.responsavelId)!.usuario?.avatarUrl,
            }
          : null,
      })),
      nextCursor: hasMore ? pagina[pagina.length - 1].id : null,
    };
  }

  private async buildEquipeWhere(
    escritorioId: string,
    membroId: string,
  ): Promise<Prisma.PrazoWhereInput> {
    const membro = await this.prisma.client.membro.findFirst({
      where: { id: membroId },
      select: { equipeId: true },
    });
    if (!membro?.equipeId) return { responsavelId: membroId };

    const colegas = await this.prisma.client.membro.findMany({
      where: { equipeId: membro.equipeId, escritorioId },
      select: { id: true },
    });
    return { responsavelId: { in: colegas.map((c) => c.id) } };
  }
}
