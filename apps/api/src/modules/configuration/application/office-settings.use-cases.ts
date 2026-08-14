import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { AiProviderRegistry } from '../../../shared/infrastructure/ai/ai-provider.registry';
import { DomainError, Result } from '../../../shared/domain/result';
import { hasPermission } from '../../../shared/authorization/permission-check';
import {
  UpdateAiSettingsDto,
  UpdateFinancialSettingsDto,
  UpdateGeneralSettingsDto,
} from '../presentation/schemas/configuration.schemas';

/**
 * Geral/Financeiro/IA reaproveitam `Escritorio.configuracoes` (Json,
 * existia desde a Fase 1, nunca lido/escrito por nenhum use case até esta
 * rodada) — zero migration nova para os três, ao contrário dos catálogos
 * (Campos Extras etc.) que têm ciclo de vida próprio e por isso são
 * tabelas reais. Ver docs/backend-implementation/22-configuration-engine.md §22.3.
 */
interface GeneralSettingsShape {
  formatoData: string;
  moedaPadrao: string;
  diaInicioSemana: number;
  notificacoesPadrao: boolean;
}
export interface FinancialSettingsShape {
  formaCalculoHonorarioPadrao: string;
  percentualHonorarioPadrao: number | null;
  diasVencimentoPadrao: number;
}
interface AiSettingsShape {
  providerPadrao: string;
  modeloPadrao: string | null;
  cotaMensalPersonalizada: number | null;
  exigirRevisaoHumana: boolean;
}

const GENERAL_DEFAULTS: GeneralSettingsShape = {
  formatoData: 'DD/MM/YYYY',
  moedaPadrao: 'BRL',
  diaInicioSemana: 1,
  notificacoesPadrao: true,
};
const FINANCIAL_DEFAULTS: FinancialSettingsShape = {
  formaCalculoHonorarioPadrao: 'FIXO',
  percentualHonorarioPadrao: null,
  diasVencimentoPadrao: 30,
};
const AI_DEFAULTS: AiSettingsShape = {
  providerPadrao: 'fake',
  modeloPadrao: null,
  cotaMensalPersonalizada: null,
  exigirRevisaoHumana: false,
};

type ConfiguracoesJson = {
  geral?: Partial<GeneralSettingsShape>;
  financeiro?: Partial<FinancialSettingsShape>;
  ia?: Partial<AiSettingsShape>;
};

function asConfiguracoes(value: unknown): ConfiguracoesJson {
  return value && typeof value === 'object' ? (value as ConfiguracoesJson) : {};
}

@Injectable()
export class GetGeneralSettingsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string) {
    const escritorio = await this.prisma.client.escritorio.findFirstOrThrow({
      where: { id: escritorioId },
      select: { fusoHorario: true, idioma: true, configuracoes: true },
    });
    const config = asConfiguracoes(escritorio.configuracoes);
    return {
      fusoHorario: escritorio.fusoHorario,
      idioma: escritorio.idioma,
      ...GENERAL_DEFAULTS,
      ...config.geral,
    };
  }
}

@Injectable()
export class UpdateGeneralSettingsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, dto: UpdateGeneralSettingsDto) {
    const escritorio = await this.prisma.client.escritorio.findFirstOrThrow({
      where: { id: escritorioId },
      select: { fusoHorario: true, idioma: true, configuracoes: true },
    });
    const config = asConfiguracoes(escritorio.configuracoes);
    const { fusoHorario, idioma, ...jsonFields } = dto;
    const novoGeral = { ...GENERAL_DEFAULTS, ...config.geral, ...jsonFields };

    await this.prisma.client.escritorio.update({
      where: { id: escritorioId },
      data: {
        fusoHorario: fusoHorario ?? undefined,
        idioma: idioma ?? undefined,
        configuracoes: { ...config, geral: novoGeral },
      },
    });

    return {
      fusoHorario: fusoHorario ?? escritorio.fusoHorario,
      idioma: idioma ?? escritorio.idioma,
      ...novoGeral,
    };
  }
}

@Injectable()
export class GetFinancialSettingsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    permissions: string[],
  ): Promise<Result<FinancialSettingsShape>> {
    if (!hasPermission(permissions, 'financeiro:read')) {
      return Result.fail(
        new DomainError(
          'FORBIDDEN',
          'Você não tem permissão para acessar configurações financeiras.',
        ),
      );
    }
    const escritorio = await this.prisma.client.escritorio.findFirstOrThrow({
      where: { id: escritorioId },
      select: { configuracoes: true },
    });
    const config = asConfiguracoes(escritorio.configuracoes);
    return Result.ok({ ...FINANCIAL_DEFAULTS, ...config.financeiro });
  }
}

@Injectable()
export class UpdateFinancialSettingsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    escritorioId: string,
    dto: UpdateFinancialSettingsDto,
    permissions: string[],
  ): Promise<Result<FinancialSettingsShape>> {
    if (!hasPermission(permissions, 'financeiro:read')) {
      return Result.fail(
        new DomainError(
          'FORBIDDEN',
          'Você não tem permissão para alterar configurações financeiras.',
        ),
      );
    }
    const escritorio = await this.prisma.client.escritorio.findFirstOrThrow({
      where: { id: escritorioId },
      select: { configuracoes: true },
    });
    const config = asConfiguracoes(escritorio.configuracoes);
    const novoFinanceiro = { ...FINANCIAL_DEFAULTS, ...config.financeiro, ...dto };

    await this.prisma.client.escritorio.update({
      where: { id: escritorioId },
      data: { configuracoes: { ...config, financeiro: novoFinanceiro } },
    });

    return Result.ok(novoFinanceiro);
  }
}

@Injectable()
export class GetAiSettingsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRegistry: AiProviderRegistry,
  ) {}

  async execute(escritorioId: string) {
    const escritorio = await this.prisma.client.escritorio.findFirstOrThrow({
      where: { id: escritorioId },
      select: { configuracoes: true },
    });
    const config = asConfiguracoes(escritorio.configuracoes);
    return {
      ...AI_DEFAULTS,
      ...config.ia,
      providersDisponiveis: this.providerRegistry.listNames(),
    };
  }
}

@Injectable()
export class UpdateAiSettingsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, dto: UpdateAiSettingsDto) {
    const escritorio = await this.prisma.client.escritorio.findFirstOrThrow({
      where: { id: escritorioId },
      select: { configuracoes: true },
    });
    const config = asConfiguracoes(escritorio.configuracoes);
    const novaIa = { ...AI_DEFAULTS, ...config.ia, ...dto };

    await this.prisma.client.escritorio.update({
      where: { id: escritorioId },
      data: { configuracoes: { ...config, ia: novaIa } },
    });

    return novaIa;
  }
}
