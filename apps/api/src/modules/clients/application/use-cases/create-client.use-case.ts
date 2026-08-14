import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { CreateClientDto } from '../../presentation/schemas/client.schemas';
import { onlyDigits } from '../../../../shared/domain/validators/br-documents';
import { validateClientConfiguration } from '../client-configuration-validation';

export interface CreateClientResult {
  cliente: { id: string };
  avisos: Array<{ codigo: 'DUPLICATE_DOCUMENT'; clienteExistenteId: string }>;
}

/**
 * Reafirma docs/api/08-clients.md §8.2 — CPF/CNPJ duplicado no escritório
 * nunca bloqueia a criação, apenas retorna aviso não bloqueante em `avisos`.
 */
@Injectable()
export class CreateClientUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, dto: CreateClientDto): Promise<CreateClientResult> {
    await validateClientConfiguration(this.prisma, escritorioId, dto, true);
    const avisos: CreateClientResult['avisos'] = [];
    const documento = dto.cpf ? onlyDigits(dto.cpf) : dto.cnpj ? onlyDigits(dto.cnpj) : null;

    if (documento) {
      const existente = await this.prisma.client.cliente.findFirst({
        where: {
          escritorioId,
          OR: [{ cpf: documento }, { cnpj: documento }],
        },
        select: { id: true },
      });
      if (existente) {
        avisos.push({ codigo: 'DUPLICATE_DOCUMENT', clienteExistenteId: existente.id });
      }
    }

    const cliente = await this.prisma.client.cliente.create({
      data: {
        escritorioId,
        tipo: dto.tipo,
        nome: dto.nome,
        nomeSocial: dto.nomeSocial,
        razaoSocial: dto.razaoSocial,
        cpf: dto.cpf ? onlyDigits(dto.cpf) : undefined,
        cnpj: dto.cnpj ? onlyDigits(dto.cnpj) : undefined,
        rg: dto.tipo === 'PESSOA_FISICA' ? dto.rg : undefined,
        emails: dto.emails ?? [],
        telefones: dto.telefones ?? [],
        telefoneResidencial: dto.tipo === 'PESSOA_FISICA' ? dto.telefoneResidencial : undefined,
        telefoneResponsavel: dto.tipo === 'PESSOA_JURIDICA' ? dto.telefoneResponsavel : undefined,
        enderecoLogradouro: dto.enderecoLogradouro,
        enderecoNumero: dto.enderecoNumero,
        enderecoComplemento: dto.enderecoComplemento,
        enderecoBairro: dto.enderecoBairro,
        enderecoCidade: dto.enderecoCidade,
        enderecoUf: dto.enderecoUf,
        enderecoCep: dto.enderecoCep,
        observacoes: dto.observacoes,
        responsavelId: dto.responsavelId,
        responsavelNome: dto.tipo === 'PESSOA_JURIDICA' ? dto.responsavelNome : undefined,
        avatarUrl: dto.avatarUrl,
        nomeMae: dto.nomeMae,
        nomePai: dto.nomePai,
        estadoCivil: dto.estadoCivil,
        profissao: dto.profissao,
        dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : undefined,
        camposExtrasValores: (dto.camposExtrasValores ?? {}) as Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    return { cliente, avisos };
  }
}
