import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { ListCollaboratorsQuery } from '../../presentation/schemas/membership.schemas';

/**
 * Monta o `where` de `ListCollaboratorsUseCase` — mesma técnica de
 * `buildClientWhere` (`modules/clients/application/client-query-filters.ts`):
 * `nascimentoDia`/`nascimentoMes`/`nascimentoAno` (dia/mês/ano isolados, não
 * expressáveis com o `where` padrão do Prisma — sem `EXTRACT` nativo no
 * query builder) são resolvidos com uma consulta SQL auxiliar parametrizada
 * (`Prisma.sql`, nunca interpolação de string) que devolve só os `id`s
 * batendo, depois filtrados via `id: { in: [...] }` no `findMany`
 * principal. `nascimentoDe`/`nascimentoAte` (intervalo) já são expressáveis
 * com `where` normal e não passam por SQL cru.
 */
export async function buildCollaboratorWhere(
  prisma: PrismaService,
  escritorioId: string,
  query: Omit<ListCollaboratorsQuery, 'cursor' | 'limit' | 'sort'>,
): Promise<Prisma.MembroWhereInput> {
  const where: Prisma.MembroWhereInput = {
    escritorioId,
    ...(query.nome ? { nome: { contains: query.nome, mode: 'insensitive' } } : {}),
    ...(query.cpf ? { cpf: { contains: query.cpf.replace(/\D/g, '') } } : {}),
    ...(query.email ? { email: { contains: query.email, mode: 'insensitive' } } : {}),
    ...(query.telefone
      ? {
          OR: [
            { telefone: { contains: query.telefone } },
            { celular: { contains: query.telefone } },
            { whatsapp: { contains: query.telefone } },
          ],
        }
      : {}),
    ...(query.grupoId ? { gruposColaboradores: { some: { grupoId: query.grupoId } } } : {}),
    ...(query.cargoId ? { cargoId: query.cargoId } : {}),
  };

  if (query.q) {
    where.OR = [
      { nome: { contains: query.q, mode: 'insensitive' } },
      { email: { contains: query.q, mode: 'insensitive' } },
      { cpf: { contains: query.q.replace(/\D/g, '') } },
      { telefone: { contains: query.q } },
      { celular: { contains: query.q } },
      { cargoCatalogo: { nome: { contains: query.q, mode: 'insensitive' } } },
      {
        gruposColaboradores: {
          some: { grupo: { nome: { contains: query.q, mode: 'insensitive' } } },
        },
      },
    ];
  }

  if (query.acesso === 'com_acesso') where.usuarioId = { not: null };
  if (query.acesso === 'sem_acesso') where.usuarioId = null;

  // Traduz o status DERIVADO (`computeSituacaoAcesso`) para condições
  // relacionais reais — nunca um filtro client-side (não escala). Mesma
  // prioridade "Inativo/Suspenso > resto" da função pura.
  if (query.situacao) {
    switch (query.situacao) {
      case 'inativo':
        where.status = 'INATIVO';
        break;
      case 'suspenso':
        where.status = 'SUSPENSO';
        break;
      case 'sem_acesso':
        where.status = { notIn: ['INATIVO', 'SUSPENSO'] };
        where.usuarioId = null;
        where.convitesRecebidos = { none: { status: 'PENDENTE' } };
        break;
      case 'convite_pendente':
        where.status = { notIn: ['INATIVO', 'SUSPENSO'] };
        where.usuarioId = null;
        where.convitesRecebidos = { some: { status: 'PENDENTE' } };
        break;
      case 'bloqueado':
        where.status = { notIn: ['INATIVO', 'SUSPENSO'] };
        where.usuarioId = { not: null };
        where.usuario = { status: 'BLOQUEADO' };
        break;
      case 'desbloqueado':
        where.status = 'ATIVO';
        where.usuarioId = { not: null };
        where.usuario = { status: { not: 'BLOQUEADO' } };
        break;
    }
  }

  if (query.cadastroDe || query.cadastroAte) {
    where.criadoEm = {
      ...(query.cadastroDe ? { gte: new Date(`${query.cadastroDe}T00:00:00.000Z`) } : {}),
      ...(query.cadastroAte ? { lte: new Date(`${query.cadastroAte}T23:59:59.999Z`) } : {}),
    };
  }
  if (query.alteracaoDe || query.alteracaoAte) {
    where.atualizadoEm = {
      ...(query.alteracaoDe ? { gte: new Date(`${query.alteracaoDe}T00:00:00.000Z`) } : {}),
      ...(query.alteracaoAte ? { lte: new Date(`${query.alteracaoAte}T23:59:59.999Z`) } : {}),
    };
  }
  if (query.nascimentoDe || query.nascimentoAte) {
    where.dataNascimento = {
      ...(query.nascimentoDe ? { gte: new Date(`${query.nascimentoDe}T00:00:00.000Z`) } : {}),
      ...(query.nascimentoAte ? { lte: new Date(`${query.nascimentoAte}T23:59:59.999Z`) } : {}),
    };
  }

  if (query.nascimentoDia || query.nascimentoMes || query.nascimentoAno) {
    const condicoes: Prisma.Sql[] = [
      Prisma.sql`escritorio_id = ${escritorioId}::uuid`,
      Prisma.sql`data_nascimento IS NOT NULL`,
    ];
    if (query.nascimentoDia) {
      condicoes.push(Prisma.sql`EXTRACT(DAY FROM data_nascimento) = ${query.nascimentoDia}`);
    }
    if (query.nascimentoMes) {
      condicoes.push(Prisma.sql`EXTRACT(MONTH FROM data_nascimento) = ${query.nascimentoMes}`);
    }
    if (query.nascimentoAno) {
      condicoes.push(Prisma.sql`EXTRACT(YEAR FROM data_nascimento) = ${query.nascimentoAno}`);
    }
    const combinadas = condicoes.reduce((acc, cond) => Prisma.sql`${acc} AND ${cond}`);
    const encontrados = await prisma.client.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT id FROM membros WHERE ${combinadas}`,
    );
    where.id = { in: encontrados.map((m) => m.id) };
  }

  return where;
}

export function buildCollaboratorOrderBy(
  sort: ListCollaboratorsQuery['sort'],
): Prisma.MembroOrderByWithRelationInput {
  switch (sort) {
    case 'nome_desc':
      return { nome: 'desc' };
    case 'cargo_asc':
      return { cargoCatalogo: { nome: 'asc' } };
    case 'cargo_desc':
      return { cargoCatalogo: { nome: 'desc' } };
    case 'nascimento_asc':
      return { dataNascimento: 'asc' };
    case 'nascimento_desc':
      return { dataNascimento: 'desc' };
    case 'cadastro_asc':
      return { criadoEm: 'asc' };
    case 'cadastro_desc':
      return { criadoEm: 'desc' };
    case 'alteracao_asc':
      return { atualizadoEm: 'asc' };
    case 'alteracao_desc':
      return { atualizadoEm: 'desc' };
    case 'nome_asc':
    default:
      return { nome: 'asc' };
  }
}
