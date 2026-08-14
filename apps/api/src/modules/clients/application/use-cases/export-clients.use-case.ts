import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { buildClientWhere } from '../client-query-filters';
import { ExportClientsQuery } from '../../presentation/schemas/client.schemas';

/** Teto pragmático — evita que um escritório com uma base gigante trave a requisição; a UI comunica quando o teto é atingido. */
const EXPORT_LIMIT = 5000;

/**
 * Mesmos filtros de `ListClientsUseCase` (`buildClientWhere` compartilhado),
 * sem paginação por cursor — devolve até `EXPORT_LIMIT` linhas de uma vez,
 * já no formato "achatado" que a UI converte para CSV no navegador (o
 * cliente HTTP compartilhado, `lib/api/client.ts`, só fala JSON — gerar o
 * CSV no backend exigiria estendê-lo para respostas binárias/texto, fora
 * do escopo desta Sprint e usado por todo o app).
 */
@Injectable()
export class ExportClientsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, query: ExportClientsQuery) {
    const where = await buildClientWhere(this.prisma, escritorioId, query);

    const clientes = await this.prisma.client.cliente.findMany({
      where,
      orderBy: { nome: 'asc' },
      take: EXPORT_LIMIT,
    });

    const truncado = clientes.length === EXPORT_LIMIT;

    return {
      items: clientes.map((c) => ({
        id: c.id,
        nome: c.nome,
        tipo: c.tipo,
        documento: c.tipo === 'PESSOA_FISICA' ? c.cpf : c.cnpj,
        email: c.emails[0] ?? '',
        telefone: c.telefones[0] ?? '',
        celular: c.telefones[1] ?? '',
        criadoEm: c.criadoEm,
        atualizadoEm: c.atualizadoEm,
      })),
      truncado,
      limite: EXPORT_LIMIT,
    };
  }
}
