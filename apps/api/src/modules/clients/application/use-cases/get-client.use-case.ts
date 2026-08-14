import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';

/**
 * Reafirma docs/api/08-clients.md §8.3 (`ClienteDetalheDTO`). CPF/CNPJ,
 * endereço e demais dados cadastrais são sempre retornados por completo para
 * quem tem `client:read` (ver docs/backend-implementation/21-permission-engine.md
 * §21.4 — Sprint "Remover mascaramento de dados do cliente em Processos"): a
 * proteção é por acesso ao recurso (permissão + `escritorioId`), não por
 * ocultar campos de um cadastro que o usuário já pode ver. Continua não
 * havendo dado nenhum de fora do tenant — `findFirst` já filtra por
 * `escritorioId`.
 */
@Injectable()
export class GetClientUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, clienteId: string, membroId?: string) {
    const cliente = await this.prisma.client.cliente.findFirst({
      where: { id: clienteId, escritorioId },
    });
    if (!cliente) {
      return Result.fail(new DomainError('NOT_FOUND', 'Cliente não encontrado.'));
    }

    const responsavel = cliente.responsavelId
      ? await this.prisma.client.membro.findFirst({
          where: { id: cliente.responsavelId },
          include: { usuario: true },
        })
      : null;

    const processosAtivos = await this.prisma.client.processo.count({
      where: { clienteId, status: { in: ['ATIVO', 'SUSPENSO'] } },
    });

    const favorito = membroId
      ? !!(await this.prisma.client.clienteFavorito.findFirst({ where: { clienteId, membroId } }))
      : false;

    const dto = {
      id: cliente.id,
      tipo: cliente.tipo,
      nome: cliente.nome,
      nomeSocial: cliente.nomeSocial,
      razaoSocial: cliente.razaoSocial,
      cpf: cliente.cpf,
      cnpj: cliente.cnpj,
      rg: cliente.rg,
      emails: cliente.emails,
      telefones: cliente.telefones,
      telefoneResidencial: cliente.telefoneResidencial,
      telefoneResponsavel: cliente.telefoneResponsavel,
      enderecoLogradouro: cliente.enderecoLogradouro,
      enderecoNumero: cliente.enderecoNumero,
      enderecoComplemento: cliente.enderecoComplemento,
      enderecoBairro: cliente.enderecoBairro,
      enderecoCidade: cliente.enderecoCidade,
      enderecoUf: cliente.enderecoUf,
      enderecoCep: cliente.enderecoCep,
      observacoes: cliente.observacoes,
      responsavel: responsavel ? { id: responsavel.id, nome: responsavel.usuario?.nome } : null,
      responsavelNome: cliente.responsavelNome,
      avatarUrl: cliente.avatarUrl,
      nomeMae: cliente.nomeMae,
      nomePai: cliente.nomePai,
      estadoCivil: cliente.estadoCivil,
      profissao: cliente.profissao,
      dataNascimento: cliente.dataNascimento,
      camposExtrasValores: cliente.camposExtrasValores,
      favorito,
      criadoEm: cliente.criadoEm,
      atualizadoEm: cliente.atualizadoEm,
      processosAtivos,
      documentosCount: await this.prisma.client.documento.count({ where: { clienteId } }),
    };

    return Result.ok(dto);
  }
}
