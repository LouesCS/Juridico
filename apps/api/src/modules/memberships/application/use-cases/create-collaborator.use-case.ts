import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { DomainError, Result } from '../../../../shared/domain/result';
import { TimelineRecorderService } from '../../../timeline/application/timeline-recorder.service';
import { CreateCollaboratorDto } from '../../presentation/schemas/membership.schemas';
import { InviteMemberUseCase } from './invite-member.use-case';

/**
 * Cadastra um colaborador (`Membro`) — SEMPRE com `usuarioId: null`; a
 * concessão de acesso (quando `comAcesso: true`) é um efeito colateral que
 * reaproveita `InviteMemberUseCase` (mesma geração de token/hash/e-mail,
 * nenhuma lógica de convite duplicada aqui), passando o `id` do `Membro`
 * recém-criado como `membroId` — o convite fica vinculado a ESTE
 * colaborador em vez de criar um segundo `Membro` quando aceito
 * (`AcceptInvitationUseCase`, branch `convite.membroId`).
 */
@Injectable()
export class CreateCollaboratorUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inviteMemberUseCase: InviteMemberUseCase,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    atorMembroId: string,
    input: CreateCollaboratorDto,
  ): Promise<Result<{ id: string }>> {
    const papel = await this.prisma.client.papel.findFirst({
      where: { id: input.papelId, OR: [{ ehSistema: true }, { escritorioId }] },
    });
    if (!papel) {
      return Result.fail(new DomainError('NOT_FOUND', 'Papel inválido para este escritório.'));
    }

    if (input.comAcesso && !input.papelId) {
      // Inalcançável hoje (`papelId` é obrigatório no schema Zod — ver nota
      // em `membership.schemas.ts`), mantido como guarda defensiva caso o
      // schema mude para tornar `papelId` opcional quando `comAcesso: false`.
      return Result.fail(
        new DomainError('MALFORMED_REQUEST', 'Informe o papel para conceder acesso.'),
      );
    }

    if (input.cargoId) {
      const cargo = await this.prisma.client.cargo.findFirst({
        where: { id: input.cargoId, escritorioId },
      });
      if (!cargo) {
        return Result.fail(new DomainError('NOT_FOUND', 'Cargo não encontrado neste escritório.'));
      }
    }

    if (input.responsavelId) {
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

    let grupos: Array<{ id: string }> = [];
    if (input.grupoIds?.length) {
      grupos = await this.prisma.client.grupoColaboradores.findMany({
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
    }

    const membro = await this.prisma.client.membro.create({
      data: {
        escritorioId,
        papelId: input.papelId,
        nome: input.nome,
        email: input.email,
        nomeSocial: input.nomeSocial,
        cpf: input.cpf,
        rg: input.rg,
        dataNascimento: input.dataNascimento ? new Date(input.dataNascimento) : undefined,
        estadoCivil: input.estadoCivil,
        profissao: input.profissao,
        nomeMae: input.nomeMae,
        nomePai: input.nomePai,
        anotacoes: input.anotacoes,
        fotoUrl: input.fotoUrl,
        telefone: input.telefone,
        celular: input.celular,
        whatsapp: input.whatsapp,
        enderecoLogradouro: input.enderecoLogradouro,
        enderecoNumero: input.enderecoNumero,
        enderecoComplemento: input.enderecoComplemento,
        enderecoBairro: input.enderecoBairro,
        enderecoCidade: input.enderecoCidade,
        enderecoUf: input.enderecoUf,
        enderecoCep: input.enderecoCep,
        enderecoPais: input.enderecoPais,
        cargoId: input.cargoId,
        departamento: input.departamento,
        numeroOab: input.numeroOab,
        ufOab: input.ufOab,
        situacaoOab: input.situacaoOab,
        observacaoOab: input.observacaoOab,
        dataEntrada: input.dataEntrada ? new Date(input.dataEntrada) : undefined,
        responsavelId: input.responsavelId,
      },
      select: { id: true },
    });

    if (grupos.length) {
      await this.prisma.client.grupoColaboradorMembro.createMany({
        data: grupos.map((g) => ({ grupoId: g.id, membroId: membro.id })),
      });
    }

    await this.timeline.record({
      escritorioId,
      membroId: membro.id,
      tipo: 'COLABORADOR_CADASTRADO',
      titulo: `Colaborador ${input.nome} foi cadastrado`,
      autorId: atorMembroId,
    });

    if (input.comAcesso) {
      // Não duplica geração de token/hash/e-mail — reaproveita
      // `InviteMemberUseCase`, que também grava `CONVITE_ENVIADO` na
      // Timeline quando recebe `membroId`.
      await this.inviteMemberUseCase.execute(
        escritorioId,
        atorMembroId,
        { email: input.email, papelId: input.papelId },
        membro.id,
      );
    }

    return Result.ok({ id: membro.id });
  }
}
