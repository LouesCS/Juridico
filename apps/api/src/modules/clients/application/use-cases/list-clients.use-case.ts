import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { buildClientWhere } from '../client-query-filters';
import { ListClientsQuery } from '../../presentation/schemas/client.schemas';

const PROCESSOS_ATIVOS_STATUS: Prisma.ProcessoWhereInput['status'] = {
  in: ['ATIVO', 'SUSPENSO'],
};

/**
 * Reafirma docs/api/08-clients.md §8.1 e docs/api/18-dtos.md §18.4
 * (`ClienteResumoDTO`). `documento` (CPF/CNPJ) é sempre retornado por
 * completo para quem tem `client:read` — a proteção é por acesso ao
 * recurso, não por ocultar campo de um cadastro já visível (ver
 * docs/backend-implementation/21-permission-engine.md §21.4, revisado pela
 * Sprint "Remover mascaramento de dados do cliente em Processos"). Filtros/
 * ordenação ampliados no Sprint "Clientes e Contatos" — `buildClientWhere` é
 * compartilhado com `ExportClientsUseCase` (nunca duplicado).
 */
@Injectable()
export class ListClientsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, query: ListClientsQuery, membroId?: string) {
    const where = await buildClientWhere(this.prisma, escritorioId, query);

    const orderBy: Prisma.ClienteOrderByWithRelationInput = query.sort.startsWith('-')
      ? { [query.sort.slice(1)]: 'desc' }
      : { [query.sort]: 'asc' };

    const clientes = await this.prisma.client.cliente.findMany({
      where,
      orderBy,
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = clientes.length > query.limit;
    const pagina = hasMore ? clientes.slice(0, query.limit) : clientes;

    // `Cliente.responsavelId` é uma coluna solta (sem relação Prisma para
    // `Membro`, mesmo desacoplamento entre módulos de `Processo.responsavelPrincipalId`
    // — ver case-scope.ts) — resolvido aqui com uma busca à parte.
    const responsavelIds = [
      ...new Set(pagina.map((c) => c.responsavelId).filter(Boolean)),
    ] as string[];
    const responsaveis = responsavelIds.length
      ? await this.prisma.client.membro.findMany({
          where: { id: { in: responsavelIds } },
          include: { usuario: true },
        })
      : [];
    const responsavelPorId = new Map(responsaveis.map((m) => [m.id, m]));

    const contagens = await Promise.all(
      pagina.map((c) =>
        this.prisma.client.processo.count({
          where: { clienteId: c.id, status: PROCESSOS_ATIVOS_STATUS },
        }),
      ),
    );

    const favoritos = membroId
      ? await this.prisma.client.clienteFavorito.findMany({
          where: { membroId, clienteId: { in: pagina.map((c) => c.id) } },
          select: { clienteId: true },
        })
      : [];
    const favoritosSet = new Set(favoritos.map((f) => f.clienteId));

    return {
      items: pagina.map((c, i) => {
        const responsavel = c.responsavelId ? responsavelPorId.get(c.responsavelId) : undefined;
        return {
          id: c.id,
          nome: c.nome,
          tipo: c.tipo,
          avatarUrl: c.avatarUrl,
          documento: c.tipo === 'PESSOA_FISICA' ? c.cpf : c.cnpj,
          emails: c.emails,
          telefones: c.telefones,
          processosAtivos: contagens[i],
          responsavel: responsavel ? { id: responsavel.id, nome: responsavel.usuario?.nome } : null,
          favorito: favoritosSet.has(c.id),
          criadoEm: c.criadoEm,
          ultimaMovimentacaoEm: c.atualizadoEm,
          atualizadoEm: c.atualizadoEm,
        };
      }),
      nextCursor: hasMore ? pagina[pagina.length - 1].id : null,
    };
  }
}
