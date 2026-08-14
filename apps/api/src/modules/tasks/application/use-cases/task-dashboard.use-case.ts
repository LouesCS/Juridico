import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';

/** Reafirma docs/backend-implementation/23-task-engine.md §23.7 (Dashboard). */
@Injectable()
export class TaskDashboardUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, user: AuthUser) {
    const membro = await this.prisma.client.membro.findFirst({
      where: { id: user.membroId },
      select: { equipeId: true },
    });

    const hoje = new Date();
    hoje.setUTCHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setUTCDate(amanha.getUTCDate() + 1);
    const em7dias = new Date(hoje);
    em7dias.setUTCDate(em7dias.getUTCDate() + 7);
    const inicioMes = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));

    const minhasWhere = {
      escritorioId,
      excluidoEm: null,
      OR: [
        { responsavelPrincipalId: user.membroId },
        { responsaveisAuxiliares: { some: { membroId: user.membroId } } },
      ],
    };
    const pendenteWhere = { concluidaEm: null, canceladaEm: null, arquivadaEm: null };

    const [
      minhasPendentes,
      equipePendentes,
      atrasadas,
      hojeCount,
      proximas,
      concluidasNoMes,
      criadasNoMes,
    ] = await Promise.all([
      this.prisma.client.tarefa.count({ where: { ...minhasWhere, ...pendenteWhere } }),
      membro?.equipeId
        ? this.prisma.client.tarefa.count({
            where: { escritorioId, excluidoEm: null, equipeId: membro.equipeId, ...pendenteWhere },
          })
        : Promise.resolve(0),
      this.prisma.client.tarefa.count({
        where: { ...minhasWhere, ...pendenteWhere, dataVencimento: { lt: hoje } },
      }),
      this.prisma.client.tarefa.count({
        where: { ...minhasWhere, ...pendenteWhere, dataVencimento: { gte: hoje, lt: amanha } },
      }),
      this.prisma.client.tarefa.count({
        where: { ...minhasWhere, ...pendenteWhere, dataVencimento: { gte: amanha, lte: em7dias } },
      }),
      this.prisma.client.tarefa.count({
        where: { ...minhasWhere, concluidaEm: { gte: inicioMes } },
      }),
      this.prisma.client.tarefa.count({
        where: { ...minhasWhere, criadoEm: { gte: inicioMes } },
      }),
    ]);

    return {
      minhasTarefasPendentes: minhasPendentes,
      equipeTarefasPendentes: equipePendentes,
      atrasadas,
      hoje: hojeCount,
      proximas,
      concluidasNoMes,
      produtividade: {
        concluidas: concluidasNoMes,
        criadas: criadasNoMes,
        percentual: criadasNoMes > 0 ? Math.round((concluidasNoMes / criadasNoMes) * 100) : 0,
      },
    };
  }
}
