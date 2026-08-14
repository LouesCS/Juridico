import { Injectable } from '@nestjs/common';
import { Sessao } from '@prisma/client';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { CriarSessaoInput, SessaoRepository } from '../../domain/repositories/sessao.repository';

@Injectable()
export class PrismaSessaoRepository implements SessaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(input: CriarSessaoInput) {
    return this.prisma.client.sessao.create({
      data: {
        usuarioId: input.usuarioId,
        escritorioAtivoId: input.escritorioAtivoId,
        familiaId: input.familiaId,
        refreshTokenHash: input.refreshTokenHash,
        ip: input.ip,
        userAgent: input.userAgent,
        dispositivo: input.dispositivo,
        expiraEm: input.expiraEm,
      },
    });
  }

  async buscarPorId(id: string) {
    return this.prisma.client.sessao.findFirst({ where: { id } });
  }

  async listarAtivasPorUsuario(usuarioId: string) {
    return this.prisma.client.sessao.findMany({
      where: { usuarioId, revogadaEm: null, expiraEm: { gt: new Date() } },
      orderBy: { ultimoUsoEm: 'desc' },
    });
  }

  async revogar(id: string, motivo: Sessao['motivoRevogacao']) {
    await this.prisma.client.sessao.update({
      where: { id },
      data: { revogadaEm: new Date(), motivoRevogacao: motivo },
    });
  }

  async revogarFamilia(familiaId: string, motivo: Sessao['motivoRevogacao']) {
    await this.prisma.client.sessao.updateMany({
      where: { familiaId, revogadaEm: null },
      data: { revogadaEm: new Date(), motivoRevogacao: motivo },
    });
  }

  async revogarTodasDoUsuario(
    usuarioId: string,
    exceto: string | undefined,
    motivo: Sessao['motivoRevogacao'],
  ) {
    await this.prisma.client.sessao.updateMany({
      where: { usuarioId, revogadaEm: null, ...(exceto ? { id: { not: exceto } } : {}) },
      data: { revogadaEm: new Date(), motivoRevogacao: motivo },
    });
  }

  async atualizarUltimoUso(id: string) {
    await this.prisma.client.sessao.update({ where: { id }, data: { ultimoUsoEm: new Date() } });
  }
}
