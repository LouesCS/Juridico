import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import { buildTaskScopeWhere, resolveTaskReadScope } from '../task-scope';
import { ListTasksQuery } from '../../presentation/schemas/task.schemas';

/** Reafirma docs/backend-implementation/23-task-engine.md §23.3 (`GET /tasks`). */
@Injectable()
export class ListTasksUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, user: AuthUser, query: ListTasksQuery) {
    const scope = resolveTaskReadScope(user.permissions);
    if (!scope) return { items: [], nextCursor: null };

    const membro = await this.prisma.client.membro.findFirst({
      where: { id: user.membroId },
      select: { equipeId: true },
    });
    const teamMemberIds = membro?.equipeId
      ? (
          await this.prisma.client.membro.findMany({
            where: { equipeId: membro.equipeId, escritorioId },
            select: { id: true },
          })
        ).map((m) => m.id)
      : [];

    const escopoFilter: Prisma.TarefaWhereInput =
      query.escopo === 'meus'
        ? {
            OR: [
              { responsavelPrincipalId: user.membroId },
              { responsaveisAuxiliares: { some: { membroId: user.membroId } } },
            ],
          }
        : query.escopo === 'equipe' && membro?.equipeId
          ? { equipeId: membro.equipeId }
          : {};

    const hoje = new Date();
    hoje.setUTCHours(0, 0, 0, 0);

    const where: Prisma.TarefaWhereInput = {
      escritorioId,
      ...buildTaskScopeWhere(scope, {
        membroId: user.membroId,
        teamMemberIds,
        equipeId: membro?.equipeId ?? null,
      }),
      ...escopoFilter,
      ...(query.statusId ? { statusId: query.statusId } : {}),
      ...(query.categoriaId ? { categoriaId: query.categoriaId } : {}),
      ...(query.prioridadeId ? { prioridadeId: query.prioridadeId } : {}),
      ...(query.responsavelId ? { responsavelPrincipalId: query.responsavelId } : {}),
      ...(query.equipeId ? { equipeId: query.equipeId } : {}),
      ...(query.clienteId
        ? { vinculos: { some: { tipoRecurso: 'CLIENTE', recursoId: query.clienteId } } }
        : {}),
      ...(query.processoId
        ? { vinculos: { some: { tipoRecurso: 'PROCESSO', recursoId: query.processoId } } }
        : {}),
      ...(query.pastaJuridicaId
        ? {
            vinculos: {
              some: { tipoRecurso: 'PASTA_JURIDICA', recursoId: query.pastaJuridicaId },
            },
          }
        : {}),
      ...(query.favoritas ? { favoritos: { some: { membroId: user.membroId } } } : {}),
      ...(query.concluidas === true ? { concluidaEm: { not: null } } : {}),
      ...(query.pendentes === true
        ? { concluidaEm: null, canceladaEm: null, arquivadaEm: null }
        : {}),
      ...(query.atrasadas === true
        ? { concluidaEm: null, canceladaEm: null, dataVencimento: { lt: hoje } }
        : {}),
      ...(query.dataVencimentoDe || query.dataVencimentoAte
        ? {
            dataVencimento: {
              ...(query.dataVencimentoDe
                ? { gte: new Date(`${query.dataVencimentoDe}T00:00:00.000Z`) }
                : {}),
              ...(query.dataVencimentoAte
                ? { lte: new Date(`${query.dataVencimentoAte}T00:00:00.000Z`) }
                : {}),
            },
          }
        : {}),
      ...(query.q ? { titulo: { contains: query.q, mode: 'insensitive' } } : {}),
      excluidoEm: null,
    };

    const orderBy: Prisma.TarefaOrderByWithRelationInput = query.sort.startsWith('-')
      ? { [query.sort.slice(1)]: 'desc' }
      : { [query.sort]: 'asc' };

    const tarefas = await this.prisma.client.tarefa.findMany({
      where,
      orderBy,
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: { vinculos: true },
    });

    const hasMore = tarefas.length > query.limit;
    const pagina = hasMore ? tarefas.slice(0, query.limit) : tarefas;

    const clienteIds = pagina.flatMap((t) =>
      t.vinculos.filter((v) => v.tipoRecurso === 'CLIENTE').map((v) => v.recursoId),
    );
    const processoIds = pagina.flatMap((t) =>
      t.vinculos.filter((v) => v.tipoRecurso === 'PROCESSO').map((v) => v.recursoId),
    );
    const [categorias, statusItens, prioridadeItens, membros, favoritos, clientes, processos] =
      await Promise.all([
        this.prisma.client.categoriaTarefa.findMany({
          where: {
            id: {
              in: [...new Set(pagina.map((t) => t.categoriaId).filter((v): v is string => !!v))],
            },
          },
        }),
        this.prisma.client.conjuntoValorItem.findMany({
          where: {
            id: { in: [...new Set(pagina.map((t) => t.statusId).filter((v): v is string => !!v))] },
          },
        }),
        this.prisma.client.conjuntoValorItem.findMany({
          where: {
            id: {
              in: [...new Set(pagina.map((t) => t.prioridadeId).filter((v): v is string => !!v))],
            },
          },
        }),
        this.prisma.client.membro.findMany({
          where: {
            id: {
              in: [
                ...new Set(
                  pagina
                    .flatMap((t) => [t.responsavelPrincipalId, t.criadoPorId])
                    .filter((v): v is string => !!v),
                ),
              ],
            },
          },
          include: { usuario: true },
        }),
        this.prisma.client.tarefaFavorito.findMany({
          where: { membroId: user.membroId, tarefaId: { in: pagina.map((t) => t.id) } },
        }),
        this.prisma.client.cliente.findMany({
          where: { escritorioId, id: { in: [...new Set(clienteIds)] } },
          select: { id: true, nome: true },
        }),
        this.prisma.client.processo.findMany({
          where: { escritorioId, id: { in: [...new Set(processoIds)] } },
          select: { id: true, titulo: true, numeroCnj: true },
        }),
      ]);

    const categoriaPorId = new Map(categorias.map((c) => [c.id, c]));
    const statusPorId = new Map(statusItens.map((s) => [s.id, s]));
    const prioridadePorId = new Map(prioridadeItens.map((p) => [p.id, p]));
    const membroPorId = new Map(membros.map((m) => [m.id, m]));
    const clientePorId = new Map(clientes.map((cliente) => [cliente.id, cliente]));
    const processoPorId = new Map(processos.map((processo) => [processo.id, processo]));
    const favoritoIds = new Set(favoritos.map((f) => f.tarefaId));

    return {
      items: pagina.map((t) => ({
        id: t.id,
        titulo: t.titulo,
        categoria: t.categoriaId ? (categoriaPorId.get(t.categoriaId) ?? null) : null,
        status: t.statusId ? (statusPorId.get(t.statusId) ?? null) : null,
        prioridade: t.prioridadeId ? (prioridadePorId.get(t.prioridadeId) ?? null) : null,
        responsavel: t.responsavelPrincipalId
          ? (() => {
              const m = membroPorId.get(t.responsavelPrincipalId!);
              return m
                ? { id: m.id, nome: m.usuario?.nome, avatarUrl: m.usuario?.avatarUrl }
                : null;
            })()
          : null,
        solicitante: (() => {
          const m = membroPorId.get(t.criadoPorId);
          return m ? { id: m.id, nome: m.usuario?.nome, avatarUrl: m.usuario?.avatarUrl } : null;
        })(),
        vinculos: t.vinculos.map((v) => ({
          tipoRecurso: v.tipoRecurso,
          recursoId: v.recursoId,
          recurso:
            v.tipoRecurso === 'CLIENTE'
              ? (clientePorId.get(v.recursoId) ?? null)
              : v.tipoRecurso === 'PROCESSO'
                ? (() => {
                    const processo = processoPorId.get(v.recursoId);
                    return processo
                      ? { id: processo.id, nome: processo.titulo, numeroCnj: processo.numeroCnj }
                      : null;
                  })()
                : null,
        })),
        dataVencimento: t.dataVencimento,
        concluidaEm: t.concluidaEm,
        canceladaEm: t.canceladaEm,
        arquivadaEm: t.arquivadaEm,
        favorita: favoritoIds.has(t.id),
        atrasada: !t.concluidaEm && !t.canceladaEm && !!t.dataVencimento && t.dataVencimento < hoje,
      })),
      nextCursor: hasMore ? pagina[pagina.length - 1].id : null,
    };
  }
}
