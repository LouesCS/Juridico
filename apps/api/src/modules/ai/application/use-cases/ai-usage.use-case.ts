import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AiQuotaService } from '../ai-quota.service';

/** Reafirma docs/api/14-ai.md §14.7 — `GET /office/ai-usage`, gate `ai:usage:read`. */
@Injectable()
export class AiUsageUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quota: AiQuotaService,
  ) {}

  async execute(escritorioId: string) {
    const inicioMes = new Date();
    inicioMes.setUTCDate(1);
    inicioMes.setUTCHours(0, 0, 0, 0);

    const [quotaStatus, resumosDoMes] = await Promise.all([
      this.quota.checkQuota(escritorioId),
      this.prisma.client.resumoIA.findMany({
        where: { escritorioId, status: 'PRONTO', geradoEm: { gte: inicioMes } },
        select: { tipoResumo: true, custoEstimadoCentavos: true },
      }),
    ]);

    const porTipo: Record<string, number> = {};
    let custoEstimadoCentavosTotal = 0;
    for (const resumo of resumosDoMes) {
      porTipo[resumo.tipoResumo] = (porTipo[resumo.tipoResumo] ?? 0) + 1;
      custoEstimadoCentavosTotal += resumo.custoEstimadoCentavos ?? 0;
    }

    const mesReferencia = `${inicioMes.getUTCFullYear()}-${String(inicioMes.getUTCMonth() + 1).padStart(2, '0')}`;

    return {
      mesReferencia,
      resumosGerados: quotaStatus.resumosGerados,
      cotaMensal: quotaStatus.cotaMensal,
      custoEstimadoCentavosTotal,
      porTipo,
    };
  }
}
