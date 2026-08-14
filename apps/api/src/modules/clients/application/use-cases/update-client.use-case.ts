import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { onlyDigits } from '../../../../shared/domain/validators/br-documents';
import { TimelineRecorderService } from '../../../timeline/application/timeline-recorder.service';
import { UpdateClientDto } from '../../presentation/schemas/client.schemas';
import { validateClientConfiguration } from '../client-configuration-validation';

export interface UpdateClientResult {
  avisos: Array<{ codigo: 'DUPLICATE_DOCUMENT'; clienteExistenteId: string }>;
}

/**
 * Reafirma docs/api/08-clients.md §8.4 — mesma regra de aviso não
 * bloqueante do POST. Reafirma Sprint 08: atualizar um cliente registra
 * `CLIENTE_ATUALIZADO` na Timeline de cada processo vinculado a ele — o
 * evento é sobre "este processo tem um cliente que mudou", não sobre o
 * cliente em si. `Cliente` continua sem escopo próprio de Timeline nesta
 * Sprint (`EventoTimeline.clienteId` exigiria alterar o Timeline Engine,
 * fora do escopo — ver docs do módulo, pendência aberta); o fan-out por
 * Processo é o único mecanismo disponível, então um cliente sem nenhum
 * processo vinculado continua sem gerar evento nenhum (limitação já
 * existente, não nova). `entidadeRelacionadaTipo: 'cliente'` em todo
 * evento permite que `ListClientTimelineUseCase` monte uma visão "Timeline
 * deste cliente" agregando os eventos de todos os seus processos.
 */
@Injectable()
export class UpdateClientUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    clienteId: string,
    dto: UpdateClientDto,
    atorMembroId?: string,
  ): Promise<Result<UpdateClientResult>> {
    const antes = await this.prisma.client.cliente.findFirst({
      where: { id: clienteId, escritorioId },
    });
    if (!antes) {
      return Result.fail(new DomainError('NOT_FOUND', 'Cliente não encontrado.'));
    }

    await validateClientConfiguration(this.prisma, escritorioId, {
      ...antes,
      ...dto,
      tipo: dto.tipo ?? antes.tipo,
      nome: dto.nome ?? antes.nome,
      emails: dto.emails ?? antes.emails,
      telefones: dto.telefones ?? antes.telefones,
      camposExtrasValores:
        dto.camposExtrasValores ?? (antes.camposExtrasValores as Record<string, string>),
    });

    const avisos: UpdateClientResult['avisos'] = [];
    const documento = dto.cpf ? onlyDigits(dto.cpf) : dto.cnpj ? onlyDigits(dto.cnpj) : null;
    if (documento) {
      const duplicado = await this.prisma.client.cliente.findFirst({
        where: {
          escritorioId,
          id: { not: clienteId },
          OR: [{ cpf: documento }, { cnpj: documento }],
        },
        select: { id: true },
      });
      if (duplicado) {
        avisos.push({ codigo: 'DUPLICATE_DOCUMENT', clienteExistenteId: duplicado.id });
      }
    }

    const clienteAtualizado = await this.prisma.client.cliente.update({
      where: { id: clienteId },
      data: {
        ...dto,
        cpf: dto.cpf ? onlyDigits(dto.cpf) : undefined,
        cnpj: dto.cnpj ? onlyDigits(dto.cnpj) : undefined,
        dataNascimento: dto.dataNascimento ? new Date(dto.dataNascimento) : undefined,
        rg: dto.tipo === 'PESSOA_JURIDICA' ? null : dto.rg,
        responsavelNome: dto.tipo === 'PESSOA_FISICA' ? null : dto.responsavelNome,
        telefoneResidencial: dto.tipo === 'PESSOA_JURIDICA' ? null : dto.telefoneResidencial,
        telefoneResponsavel: dto.tipo === 'PESSOA_FISICA' ? null : dto.telefoneResponsavel,
        camposExtrasValores: dto.camposExtrasValores
          ? (dto.camposExtrasValores as Prisma.InputJsonValue)
          : undefined,
      },
      select: { nome: true },
    });

    const mudouTelefone =
      dto.telefones && JSON.stringify(dto.telefones) !== JSON.stringify(antes.telefones);
    const mudouEmail = dto.emails && JSON.stringify(dto.emails) !== JSON.stringify(antes.emails);
    const mudouEndereco = [
      'enderecoLogradouro',
      'enderecoNumero',
      'enderecoComplemento',
      'enderecoBairro',
      'enderecoCidade',
      'enderecoUf',
      'enderecoCep',
    ].some(
      (campo) =>
        campo in dto && dto[campo as keyof UpdateClientDto] !== antes[campo as keyof typeof antes],
    );

    const titulo = mudouTelefone
      ? `Telefone de ${clienteAtualizado.nome} foi atualizado`
      : mudouEndereco
        ? `Endereço de ${clienteAtualizado.nome} foi atualizado`
        : mudouEmail
          ? `E-mail de ${clienteAtualizado.nome} foi atualizado`
          : `Dados do cliente ${clienteAtualizado.nome} foram atualizados`;

    const processos = await this.prisma.client.processo.findMany({
      where: { clienteId },
      select: { id: true },
    });
    await Promise.all(
      processos.map((p) =>
        this.timeline.record({
          escritorioId,
          processoId: p.id,
          tipo: 'CLIENTE_ATUALIZADO',
          titulo,
          autorId: atorMembroId,
          entidadeRelacionadaTipo: 'cliente',
          entidadeRelacionadaId: clienteId,
        }),
      ),
    );

    return Result.ok({ avisos });
  }
}
