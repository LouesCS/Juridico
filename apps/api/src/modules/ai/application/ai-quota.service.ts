import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../../config/env.schema';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';

export interface QuotaStatus {
  permitido: boolean;
  resumosGerados: number;
  cotaMensal: number | null;
}

/**
 * Reafirma docs/api/14-ai.md §14.1/§14.7 — cota mensal de resumos por
 * `PlanoEscritorio`, verificada ANTES de criar a linha `PENDENTE` (nunca
 * depois de gastar a chamada ao provedor). Números exatos são um placeholder
 * de produto razoável (nenhuma doc fixa valores) configurável via env, sem
 * migração — mesmo racional de `PAPEL_PERMISSOES` em `seed.ts`.
 */
@Injectable()
export class AiQuotaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  private quotaForPlano(plano: string): number | null {
    switch (plano) {
      case 'TRIAL':
        return this.config.get('AI_MONTHLY_QUOTA_TRIAL', { infer: true });
      case 'ESSENCIAL':
        return this.config.get('AI_MONTHLY_QUOTA_ESSENCIAL', { infer: true });
      case 'PROFISSIONAL':
        return this.config.get('AI_MONTHLY_QUOTA_PROFISSIONAL', { infer: true });
      default:
        return null; // ENTERPRISE — ilimitado
    }
  }

  async checkQuota(escritorioId: string): Promise<QuotaStatus> {
    const escritorio = await this.prisma.client.escritorio.findFirst({
      where: { id: escritorioId },
      select: { plano: true, configuracoes: true },
    });
    // Configuration Engine (Prompt 13) — `configuracoes.ia.cotaMensalPersonalizada`
    // sobrepõe a cota do plano quando o OWNER define uma explicitamente
    // (docs/backend-implementation/22-configuration-engine.md §22.4).
    const configuracoes = escritorio?.configuracoes;
    const overrideIa =
      configuracoes && typeof configuracoes === 'object'
        ? (configuracoes as { ia?: { cotaMensalPersonalizada?: number | null } }).ia
            ?.cotaMensalPersonalizada
        : undefined;
    const cotaMensal =
      overrideIa !== undefined && overrideIa !== null
        ? overrideIa
        : this.quotaForPlano(escritorio?.plano ?? 'TRIAL');
    const resumosGerados = await this.countThisMonth(escritorioId);

    return {
      permitido: cotaMensal === null || resumosGerados < cotaMensal,
      resumosGerados,
      cotaMensal,
    };
  }

  async countThisMonth(escritorioId: string): Promise<number> {
    const inicioMes = new Date();
    inicioMes.setUTCDate(1);
    inicioMes.setUTCHours(0, 0, 0, 0);

    return this.prisma.client.resumoIA.count({
      where: { escritorioId, status: 'PRONTO', geradoEm: { gte: inicioMes } },
    });
  }
}
