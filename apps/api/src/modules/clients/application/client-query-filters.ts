import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { ListClientsQuery } from '../presentation/schemas/client.schemas';

/**
 * Monta o `where` compartilhado por `ListClientsUseCase` e
 * `ExportClientsUseCase` — mesmos filtros, sem duplicar a lógica (FASE 0:
 * "identificar código repetido, generalizar"). `dia`/`mesNascimento`
 * (dia-do-mês/mês, independente do ano) não são expressáveis com o
 * `where` padrão do Prisma (não há "EXTRACT" nativo no query builder) —
 * resolvidos com uma consulta SQL auxiliar que devolve só os `id`s
 * batendo, depois filtrados via `id: { in: [...] }` no `findMany`
 * principal; mesma técnica (SQL parametrizado, nunca interpolação de
 * string) já usada em `RestoreClientUseCase`.
 */
export async function buildClientWhere(
  prisma: PrismaService,
  escritorioId: string,
  query: ListClientsQuery | Omit<ListClientsQuery, 'cursor' | 'limit'>,
): Promise<Prisma.ClienteWhereInput> {
  const where: Prisma.ClienteWhereInput = {
    escritorioId,
    ...(query.tipo ? { tipo: query.tipo } : {}),
    ...(query.responsavelId ? { responsavelId: query.responsavelId } : {}),
    ...(query.estadoCivil ? { estadoCivil: query.estadoCivil } : {}),
    ...(query.nome ? { nome: { contains: query.nome, mode: 'insensitive' } } : {}),
    ...(query.nomeMae ? { nomeMae: { contains: query.nomeMae, mode: 'insensitive' } } : {}),
    ...(query.nomePai ? { nomePai: { contains: query.nomePai, mode: 'insensitive' } } : {}),
    ...(query.profissao ? { profissao: { contains: query.profissao, mode: 'insensitive' } } : {}),
    // Arrays (`telefones`/`emails`) só suportam igualdade de elemento no
    // Postgres (`has`) — sem `ILIKE` parcial num elemento da lista.
    ...(query.telefone ? { telefones: { has: query.telefone } } : {}),
    ...(query.celular ? { telefones: { has: query.celular } } : {}),
    ...(query.email ? { emails: { has: query.email } } : {}),
    ...(query.cpf ? { cpf: { contains: query.cpf.replace(/\D/g, '') } } : {}),
    ...(query.cnpj ? { cnpj: { contains: query.cnpj.replace(/\D/g, '') } } : {}),
    ...(query.q
      ? {
          OR: [
            { nome: { contains: query.q, mode: 'insensitive' } },
            { razaoSocial: { contains: query.q, mode: 'insensitive' } },
            { cpf: { contains: query.q.replace(/\D/g, '') } },
            { cnpj: { contains: query.q.replace(/\D/g, '') } },
            { rg: { contains: query.q } },
            { emails: { has: query.q } },
            { telefones: { has: query.q } },
          ],
        }
      : {}),
  };

  if (query.dataCadastro) {
    const inicio = new Date(`${query.dataCadastro}T00:00:00.000Z`);
    const fim = new Date(`${query.dataCadastro}T23:59:59.999Z`);
    where.criadoEm = { gte: inicio, lte: fim };
  }
  if (query.periodoCadastroInicio || query.periodoCadastroFim) {
    where.criadoEm = {
      ...(query.periodoCadastroInicio
        ? { gte: new Date(`${query.periodoCadastroInicio}T00:00:00.000Z`) }
        : {}),
      ...(query.periodoCadastroFim
        ? { lte: new Date(`${query.periodoCadastroFim}T23:59:59.999Z`) }
        : {}),
    };
  }
  if (query.ultimaAlteracao) {
    const inicio = new Date(`${query.ultimaAlteracao}T00:00:00.000Z`);
    const fim = new Date(`${query.ultimaAlteracao}T23:59:59.999Z`);
    where.atualizadoEm = { gte: inicio, lte: fim };
  }
  if (query.anoNascimento && !query.diaNascimento && !query.mesNascimento) {
    where.dataNascimento = {
      gte: new Date(Date.UTC(query.anoNascimento, 0, 1)),
      lte: new Date(Date.UTC(query.anoNascimento, 11, 31, 23, 59, 59)),
    };
  }

  if (query.diaNascimento || query.mesNascimento) {
    const condicoes: Prisma.Sql[] = [
      Prisma.sql`escritorio_id = ${escritorioId}::uuid`,
      Prisma.sql`data_nascimento IS NOT NULL`,
    ];
    if (query.diaNascimento)
      condicoes.push(Prisma.sql`EXTRACT(DAY FROM data_nascimento) = ${query.diaNascimento}`);
    if (query.mesNascimento)
      condicoes.push(Prisma.sql`EXTRACT(MONTH FROM data_nascimento) = ${query.mesNascimento}`);
    if (query.anoNascimento)
      condicoes.push(Prisma.sql`EXTRACT(YEAR FROM data_nascimento) = ${query.anoNascimento}`);

    const combinadas = condicoes.reduce((acc, cond) => Prisma.sql`${acc} AND ${cond}`);
    const encontrados = await prisma.client.$queryRaw<Array<{ id: string }>>(
      Prisma.sql`SELECT id FROM clientes WHERE ${combinadas}`,
    );
    where.id = { in: encontrados.map((c) => c.id) };
  }

  return where;
}
