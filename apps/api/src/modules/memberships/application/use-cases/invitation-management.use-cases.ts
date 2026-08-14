import { Inject, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { hashToken } from '../../../../shared/infrastructure/security/hash-token.util';
import { MAIL_PORT, MailPort } from '../../../../shared/infrastructure/mail/mail.port';
import { DomainError, Result } from '../../../../shared/domain/result';

@Injectable()
export class ListInvitationsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string) {
    return this.prisma.client.convite.findMany({
      where: { escritorioId, status: 'PENDENTE' },
      select: {
        id: true,
        email: true,
        status: true,
        expiraEm: true,
        criadoEm: true,
        papelId: true,
      },
      orderBy: { criadoEm: 'desc' },
    });
  }
}

@Injectable()
export class ResendInvitationUseCase {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(MAIL_PORT) private readonly mail: MailPort,
  ) {}

  async execute(escritorioId: string, conviteId: string): Promise<Result<void>> {
    const convite = await this.prisma.client.convite.findFirst({
      where: { id: conviteId, escritorioId },
    });
    if (!convite || convite.status !== 'PENDENTE') {
      return Result.fail(
        new DomainError('NOT_FOUND', 'Convite não encontrado ou não está pendente.'),
      );
    }

    const token = randomBytes(32).toString('hex');
    await this.prisma.client.convite.update({
      where: { id: conviteId },
      data: {
        tokenHash: hashToken(token),
        expiraEm: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await this.mail.send({
      to: convite.email,
      template: 'invitation',
      variables: { token, escritorioId },
    });

    return Result.ok(undefined);
  }
}

@Injectable()
export class RevokeInvitationUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, conviteId: string): Promise<Result<void>> {
    const convite = await this.prisma.client.convite.findFirst({
      where: { id: conviteId, escritorioId },
    });
    if (!convite) {
      return Result.fail(new DomainError('NOT_FOUND', 'Convite não encontrado.'));
    }
    await this.prisma.client.convite.update({
      where: { id: conviteId },
      data: { status: 'REVOGADO' },
    });
    return Result.ok(undefined);
  }
}

@Injectable()
export class ListRolesUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string) {
    return this.prisma.client.papel.findMany({
      where: { OR: [{ ehSistema: true }, { escritorioId }] },
      orderBy: { nivel: 'desc' },
    });
  }
}
