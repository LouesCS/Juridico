import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { hashToken } from '../../../../shared/infrastructure/security/hash-token.util';
import { MAIL_PORT, MailPort } from '../../../../shared/infrastructure/mail/mail.port';
import { TimelineRecorderService } from '../../../timeline/application/timeline-recorder.service';
import { InviteMemberDto } from '../../presentation/schemas/membership.schemas';

/**
 * Reafirma docs/api/06-memberships.md §6.2 e
 * docs/database/03-entidades-identidade-escritorios.md §3.6.1 — token
 * gerado por CSPRNG, apenas o hash é persistido; reenvio revoga o convite
 * pendente anterior do mesmo e-mail antes de criar um novo.
 *
 * `membroId` (módulo Colaboradores, opcional) — quando informado, o convite
 * é para CONCEDER ACESSO a um colaborador (`Membro`) já cadastrado sem
 * conta, em vez do fluxo tradicional (convite direto, sem colaborador
 * pré-existente). `CreateCollaboratorUseCase`/`GrantAccessUseCase`
 * reaproveitam este use case passando o parâmetro em vez de duplicar a
 * geração de token/hash/e-mail.
 */
@Injectable()
export class InviteMemberUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MAIL_PORT) private readonly mail: MailPort,
    private readonly timeline: TimelineRecorderService,
  ) {}

  async execute(
    escritorioId: string,
    convidadoPorMembroId: string,
    input: InviteMemberDto,
    membroId?: string,
  ) {
    await this.prisma.client.convite.updateMany({
      where: { escritorioId, email: input.email, status: 'PENDENTE' },
      data: { status: 'REVOGADO' },
    });

    const token = randomBytes(32).toString('hex');
    const convite = await this.prisma.client.convite.create({
      data: {
        escritorioId,
        email: input.email,
        papelId: input.papelId,
        membroId,
        tokenHash: hashToken(token),
        convidadoPorId: convidadoPorMembroId,
        expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'PENDENTE',
      },
    });

    await this.mail.send({
      to: input.email,
      template: 'invitation',
      variables: { token, escritorioId },
    });

    // Só existe um `Membro` (colaborador) para anexar o evento quando este
    // convite passa por `CreateCollaboratorUseCase`/`GrantAccessUseCase`
    // (módulo Colaboradores) — o fluxo tradicional de convite direto (sem
    // `membroId`) ainda não tem um `Membro` criado neste ponto.
    if (membroId) {
      await this.timeline.record({
        escritorioId,
        membroId,
        tipo: 'CONVITE_ENVIADO',
        titulo: `Convite de acesso enviado para ${input.email}`,
        autorId: convidadoPorMembroId,
      });
    }

    return {
      id: convite.id,
      email: convite.email,
      status: convite.status,
      expiraEm: convite.expiraEm,
    };
  }
}
