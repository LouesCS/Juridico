import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { ListCollaboratorsQuery } from '../../presentation/schemas/membership.schemas';
import { buildCollaboratorOrderBy, buildCollaboratorWhere } from './collaborator-query-filters';
import { computeSituacaoAcesso } from './collaborator-status.util';

/**
 * `GET /members` estendido (módulo Colaboradores) — cursor-paginado, mesmo
 * formato `{ items, nextCursor }` de `ListClientsUseCase`, mais `total`
 * (contagem separada, sem paginar) pedido para o cadastro de colaboradores.
 * Query vazia (`{}`) preserva o comportamento anterior: lista tudo,
 * ordenação padrão (`nome_asc`) — retrocompatível com quem chama a rota sem
 * parâmetros hoje (ex.: seletor de "Responsável").
 */
@Injectable()
export class ListCollaboratorsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, query: ListCollaboratorsQuery) {
    const where = await buildCollaboratorWhere(this.prisma, escritorioId, query);
    const orderBy = buildCollaboratorOrderBy(query.sort);

    const [membros, total] = await Promise.all([
      this.prisma.client.membro.findMany({
        where,
        orderBy,
        take: query.limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        include: {
          usuario: { select: { status: true } },
          papel: { select: { id: true, nome: true } },
          cargoCatalogo: { select: { id: true, nome: true } },
          gruposColaboradores: { include: { grupo: { select: { id: true, nome: true } } } },
        },
      }),
      this.prisma.client.membro.count({ where }),
    ]);

    const hasMore = membros.length > query.limit;
    const pagina = hasMore ? membros.slice(0, query.limit) : membros;

    const membroIds = pagina.map((m) => m.id);
    const convitesPendentes = membroIds.length
      ? await this.prisma.client.convite.findMany({
          where: { escritorioId, membroId: { in: membroIds }, status: 'PENDENTE' },
          select: { membroId: true },
        })
      : [];
    const pendentesSet = new Set(convitesPendentes.map((c) => c.membroId));

    return {
      items: pagina.map((m) => ({
        id: m.id,
        nome: m.nome,
        nomeSocial: m.nomeSocial,
        fotoUrl: m.fotoUrl,
        cpf: m.cpf,
        email: m.email,
        telefone: m.telefone,
        celular: m.celular,
        dataNascimento: m.dataNascimento,
        cargo: m.cargoCatalogo ? { id: m.cargoCatalogo.id, nome: m.cargoCatalogo.nome } : null,
        grupos: m.gruposColaboradores.map((g) => ({ id: g.grupo.id, nome: g.grupo.nome })),
        papel: { id: m.papel.id, nome: m.papel.nome },
        temAcesso: m.usuarioId !== null,
        situacaoAcesso: computeSituacaoAcesso(m, pendentesSet.has(m.id)),
        status: m.status,
        criadoEm: m.criadoEm,
        atualizadoEm: m.atualizadoEm,
      })),
      nextCursor: hasMore ? pagina[pagina.length - 1].id : null,
      total,
    };
  }
}
