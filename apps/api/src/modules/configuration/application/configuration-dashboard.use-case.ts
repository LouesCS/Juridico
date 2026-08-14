import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { AiProviderRegistry } from '../../../shared/infrastructure/ai/ai-provider.registry';
import { AiUsageUseCase } from '../../ai/application/use-cases/ai-usage.use-case';

const RECURSOS_CONFIGURACAO = [
  'CAMPO_EXTRA',
  'CAMPO_OBRIGATORIO',
  'CONJUNTO_VALORES',
  'CATEGORIA_TAREFA',
  'GRUPO_COLABORADORES',
  'CARGO',
  'MODELO_TAREFA',
  'FERIADO',
  'CONFIGURACAO_GERAL',
  'CONFIGURACAO_FINANCEIRA',
  'CONFIGURACAO_IA',
];

/**
 * "Dashboard das Configurações" pedido pelo Prompt 13 — reaproveita
 * `AiUsageUseCase` (Sprint 11, exportado do `AiModule` nesta rodada) em vez
 * de recalcular consumo de IA, e `log_auditoria` (já gravado desde o
 * Prompt 5C) para "Últimas Alterações" — nenhuma tabela nova só para
 * métricas.
 */
@Injectable()
export class ConfigurationDashboardUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiUsage: AiUsageUseCase,
    private readonly providerRegistry: AiProviderRegistry,
  ) {}

  async execute(escritorioId: string) {
    const [
      camposExtra,
      categorias,
      conjuntos,
      modelos,
      grupos,
      cargos,
      usuarios,
      consumoIa,
      ultimasAlteracoes,
    ] = await Promise.all([
      this.prisma.client.campoExtra.count({ where: { escritorioId } }),
      this.prisma.client.categoriaTarefa.count({ where: { escritorioId } }),
      this.prisma.client.conjuntoValores.count({ where: { escritorioId } }),
      this.prisma.client.modeloTarefa.count({ where: { escritorioId } }),
      this.prisma.client.grupoColaboradores.count({ where: { escritorioId } }),
      this.prisma.client.cargo.count({ where: { escritorioId } }),
      this.prisma.client.membro.count({ where: { escritorioId, status: 'ATIVO' } }),
      this.aiUsage.execute(escritorioId),
      this.prisma.client.logAuditoria.findMany({
        where: { escritorioId, recursoTipo: { in: RECURSOS_CONFIGURACAO } },
        orderBy: { criadoEm: 'desc' },
        take: 10,
        select: {
          id: true,
          acao: true,
          recursoTipo: true,
          recursoId: true,
          atorId: true,
          criadoEm: true,
        },
      }),
    ]);

    return {
      quantidadeCamposExtra: camposExtra,
      quantidadeCategorias: categorias,
      quantidadeConjuntos: conjuntos,
      quantidadeModelos: modelos,
      quantidadeGrupos: grupos,
      quantidadeCargos: cargos,
      quantidadeUsuarios: usuarios,
      quantidadeProvidersIa: this.providerRegistry.listNames().length,
      consumoIa,
      ultimasAlteracoes,
    };
  }
}
