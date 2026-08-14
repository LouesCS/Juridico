import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { computeSituacaoAcesso } from './collaborator-status.util';

/** Detalhe completo de um colaborador, escopado ao escritório do ator. */
@Injectable()
export class GetCollaboratorUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, id: string): Promise<Result<Record<string, unknown>>> {
    const membro = await this.prisma.client.membro.findFirst({
      where: { id, escritorioId },
      include: {
        usuario: { select: { status: true } },
        papel: { select: { id: true, nome: true } },
        cargoCatalogo: { select: { id: true, nome: true } },
        gruposColaboradores: { include: { grupo: { select: { id: true, nome: true } } } },
        responsavel: { select: { id: true, nome: true } },
      },
    });
    if (!membro) {
      return Result.fail(new DomainError('NOT_FOUND', 'Colaborador não encontrado.'));
    }

    const convitePendente = await this.prisma.client.convite.findFirst({
      where: { escritorioId, membroId: id, status: 'PENDENTE' },
      select: { id: true },
    });

    return Result.ok({
      id: membro.id,
      nome: membro.nome,
      nomeSocial: membro.nomeSocial,
      email: membro.email,
      cpf: membro.cpf,
      rg: membro.rg,
      dataNascimento: membro.dataNascimento,
      estadoCivil: membro.estadoCivil,
      profissao: membro.profissao,
      nomeMae: membro.nomeMae,
      nomePai: membro.nomePai,
      anotacoes: membro.anotacoes,
      fotoUrl: membro.fotoUrl,
      telefone: membro.telefone,
      celular: membro.celular,
      whatsapp: membro.whatsapp,
      enderecoLogradouro: membro.enderecoLogradouro,
      enderecoNumero: membro.enderecoNumero,
      enderecoComplemento: membro.enderecoComplemento,
      enderecoBairro: membro.enderecoBairro,
      enderecoCidade: membro.enderecoCidade,
      enderecoUf: membro.enderecoUf,
      enderecoCep: membro.enderecoCep,
      enderecoPais: membro.enderecoPais,
      cargo: membro.cargoCatalogo
        ? { id: membro.cargoCatalogo.id, nome: membro.cargoCatalogo.nome }
        : null,
      // Campo legado (texto livre), mantido só para leitura — reafirma o
      // comentário do schema em `Membro.cargo`.
      cargoLegado: membro.cargo,
      departamento: membro.departamento,
      numeroOab: membro.numeroOab,
      ufOab: membro.ufOab,
      situacaoOab: membro.situacaoOab,
      observacaoOab: membro.observacaoOab,
      dataEntrada: membro.dataEntrada,
      responsavel: membro.responsavel
        ? { id: membro.responsavel.id, nome: membro.responsavel.nome }
        : null,
      papel: { id: membro.papel.id, nome: membro.papel.nome },
      grupos: membro.gruposColaboradores.map((g) => ({ id: g.grupo.id, nome: g.grupo.nome })),
      temAcesso: membro.usuarioId !== null,
      situacaoAcesso: computeSituacaoAcesso(membro, !!convitePendente),
      status: membro.status,
      criadoEm: membro.criadoEm,
      atualizadoEm: membro.atualizadoEm,
    });
  }
}
