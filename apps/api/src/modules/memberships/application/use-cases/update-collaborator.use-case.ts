import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { TimelineRecorderService } from '../../../timeline/application/timeline-recorder.service';
import { UpdateCollaboratorDto } from '../../presentation/schemas/membership.schemas';

/**
 * Atualização parcial do perfil do colaborador — acesso (`comAcesso`/
 * `papelId`/bloqueio/suspensão) NUNCA passa por aqui, só pelos endpoints
 * dedicados (`BlockMemberUseCase`/`GrantAccessUseCase`/etc.), reafirma a
 * separação de responsabilidades do prompt original. `grupoIds`, quando
 * informado, substitui o conjunto de vínculos por diff (adiciona os que
 * faltam, remove os que sobram) em vez de apagar/recriar tudo.
 */
@Injectable()
export class UpdateCollaboratorUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    atorMembroId: string,
    alvoMembroId: string,
    input: UpdateCollaboratorDto,
  ): Promise<Result<void>> {
    const membro = await this.prisma.client.membro.findFirst({
      where: { id: alvoMembroId, escritorioId },
      include: { gruposColaboradores: true },
    });
    if (!membro) {
      return Result.fail(new DomainError('NOT_FOUND', 'Colaborador não encontrado.'));
    }

    if (input.cargoId !== undefined && input.cargoId !== null) {
      const cargo = await this.prisma.client.cargo.findFirst({
        where: { id: input.cargoId, escritorioId },
      });
      if (!cargo) {
        return Result.fail(new DomainError('NOT_FOUND', 'Cargo não encontrado neste escritório.'));
      }
    }

    if (input.responsavelId !== undefined && input.responsavelId !== null) {
      if (input.responsavelId === alvoMembroId) {
        return Result.fail(
          new DomainError(
            'MALFORMED_REQUEST',
            'Um colaborador não pode ser responsável por si mesmo.',
          ),
        );
      }
      const responsavel = await this.prisma.client.membro.findFirst({
        where: { id: input.responsavelId, escritorioId },
        select: { id: true },
      });
      if (!responsavel) {
        return Result.fail(
          new DomainError('NOT_FOUND', 'Responsável não encontrado neste escritório.'),
        );
      }
    }

    let gruposValidados: string[] | undefined;
    if (input.grupoIds) {
      const grupos = await this.prisma.client.grupoColaboradores.findMany({
        where: { id: { in: input.grupoIds }, escritorioId },
        select: { id: true },
      });
      if (grupos.length !== input.grupoIds.length) {
        return Result.fail(
          new DomainError(
            'NOT_FOUND',
            'Um ou mais grupos de colaboradores informados não pertencem a este escritório.',
          ),
        );
      }
      gruposValidados = grupos.map((g) => g.id);
    }

    const cargoAlterado = input.cargoId !== undefined && input.cargoId !== membro.cargoId;

    // `grupoIds` é tratado à parte (diff de vínculos logo abaixo) — nunca
    // repassado direto para `membro.update` (não é uma coluna de `Membro`).
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { grupoIds, ...dadosPerfil } = input;
    await this.prisma.client.membro.update({
      where: { id: alvoMembroId },
      data: {
        ...dadosPerfil,
        dataNascimento: input.dataNascimento ? new Date(input.dataNascimento) : undefined,
        dataEntrada: input.dataEntrada ? new Date(input.dataEntrada) : undefined,
      },
    });

    let grupoAlterado = false;
    if (gruposValidados) {
      const atuais = new Set(membro.gruposColaboradores.map((g) => g.grupoId));
      const novos = new Set(gruposValidados);
      const paraAdicionar = gruposValidados.filter((id) => !atuais.has(id));
      const paraRemover = membro.gruposColaboradores
        .map((g) => g.grupoId)
        .filter((id) => !novos.has(id));
      grupoAlterado = paraAdicionar.length > 0 || paraRemover.length > 0;

      if (paraAdicionar.length) {
        await this.prisma.client.grupoColaboradorMembro.createMany({
          data: paraAdicionar.map((grupoId) => ({ grupoId, membroId: alvoMembroId })),
        });
      }
      if (paraRemover.length) {
        await this.prisma.client.grupoColaboradorMembro.deleteMany({
          where: { membroId: alvoMembroId, grupoId: { in: paraRemover } },
        });
      }
    }

    await this.timeline.record({
      escritorioId,
      membroId: alvoMembroId,
      tipo: 'COLABORADOR_ATUALIZADO',
      titulo: `Colaborador ${membro.nome} foi atualizado`,
      autorId: atorMembroId,
    });
    if (cargoAlterado) {
      await this.timeline.record({
        escritorioId,
        membroId: alvoMembroId,
        tipo: 'CARGO_ALTERADO',
        titulo: `Cargo de ${membro.nome} foi alterado`,
        autorId: atorMembroId,
      });
    }
    if (grupoAlterado) {
      await this.timeline.record({
        escritorioId,
        membroId: alvoMembroId,
        tipo: 'GRUPO_ALTERADO',
        titulo: `Grupos de colaboradores de ${membro.nome} foram alterados`,
        autorId: atorMembroId,
      });
    }

    return Result.ok(undefined);
  }
}
