import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import { DomainError, Result } from '../../../../shared/domain/result';
import {
  applyConfidentialityFilter,
  buildCaseScopeWhere,
  resolveCaseReadScope,
  ScopeActor,
} from '../../../legal-cases/application/case-scope';
import { AiContextResult, FonteIaDraft } from '../../domain/ai-types';
import { hashContent } from '../context-hash';

async function resolveTeamMemberIds(
  prisma: PrismaService,
  escritorioId: string,
  membroId: string,
): Promise<string[]> {
  const membro = await prisma.client.membro.findFirst({
    where: { id: membroId },
    select: { equipeId: true },
  });
  if (!membro?.equipeId) return [];
  const colegas = await prisma.client.membro.findMany({
    where: { equipeId: membro.equipeId, escritorioId },
    select: { id: true },
  });
  return colegas.map((c) => c.id);
}

/**
 * Reafirma Sprint 11 §"IA DO CLIENTE" — monta o contexto para
 * `resumo-cliente` ("Histórico Inteligente"). Só inclui processos que o
 * usuário atual poderia ler diretamente (reaproveita `case-scope.ts`) —
 * um histórico de cliente nunca revela a existência de um processo em
 * segredo de justiça/fora de escopo ao qual o usuário não tem acesso,
 * mesmo que o processo pertença a este cliente.
 *
 * Auditado no Permission Engine (Prompt 12 §IA/§Field Level Security, e de
 * novo na Sprint "Remover mascaramento de dados do cliente em Processos"):
 * `promptContext.campos` abaixo NUNCA incluiu CPF/CNPJ/endereço/contatos (só
 * Nome/Tipo/Status/datas/processos/documentos) — escolha deliberada de
 * minimizar o que sai para um provedor de IA terceiro, independente de
 * permissão. Isso é ortogonal à regra de mascaramento que existia em
 * `GetClientUseCase`/`ListClientsUseCase`/`ClientSearchAdapter` (removida —
 * ver docs/backend-implementation/21-permission-engine.md §21.4): mesmo
 * antes da remoção, esta rodada nunca dependeu de `client:read:sensitive`,
 * porque simplesmente nunca lia esses campos do cliente. Mantido assim
 * nesta rodada (ajuste pontual, não uma expansão do que a IA recebe) — se
 * um caso de uso real precisar desses campos no contexto de IA no futuro,
 * a checagem de acesso já existente aqui (`client:read` + escopo de
 * processo via `case-scope.ts`) é o lugar certo para gate-lo, nunca um
 * bypass do Permission Engine.
 */
@Injectable()
export class ClientContextBuilder {
  constructor(private readonly prisma: PrismaService) {}

  async build(
    escritorioId: string,
    clienteId: string,
    user: AuthUser,
  ): Promise<Result<AiContextResult>> {
    if (!user.permissions.includes('client:read')) {
      return Result.fail(new DomainError('NOT_FOUND', 'Cliente não encontrado.'));
    }

    const cliente = await this.prisma.client.cliente.findFirst({
      where: { id: clienteId, escritorioId },
    });
    if (!cliente) return Result.fail(new DomainError('NOT_FOUND', 'Cliente não encontrado.'));

    const caseScope = resolveCaseReadScope(user.permissions);
    let processosVisiveis: Array<{
      id: string;
      titulo: string;
      status: string;
      atualizadoEm: Date;
    }> = [];
    if (caseScope) {
      const teamMemberIds =
        caseScope === 'TEAM'
          ? await resolveTeamMemberIds(this.prisma, escritorioId, user.membroId)
          : [];
      const actor: ScopeActor = { membroId: user.membroId, teamMemberIds };
      processosVisiveis = await this.prisma.client.processo.findMany({
        where: {
          clienteId,
          escritorioId,
          ...buildCaseScopeWhere(caseScope, actor),
          ...applyConfidentialityFilter(user.permissions),
        },
        orderBy: { ultimaAtualizacaoEm: 'desc' },
        take: 10,
        select: { id: true, titulo: true, status: true, atualizadoEm: true },
      });
    }

    const processoIds = processosVisiveis.map((p) => p.id);
    const [documentosRecentes, proximoPrazo] = await Promise.all([
      processoIds.length
        ? this.prisma.client.documento.findMany({
            where: { processoId: { in: processoIds }, excluidoEm: null },
            orderBy: { atualizadoEm: 'desc' },
            take: 5,
            select: { nome: true },
          })
        : Promise.resolve([]),
      processoIds.length
        ? this.prisma.client.prazo.findFirst({
            where: { processoId: { in: processoIds }, status: 'PENDENTE' },
            orderBy: { dataVencimento: 'asc' },
          })
        : Promise.resolve(null),
    ]);

    const fontes: FonteIaDraft[] = [
      {
        sourceType: 'CLIENTE',
        clienteId: cliente.id,
        trechoOuReferencia: `Dados cadastrais de ${cliente.nome}`,
        hashFonte: hashContent({ nome: cliente.nome, status: cliente.status }),
      },
      ...processosVisiveis.map((p): FonteIaDraft => ({
        sourceType: 'PROCESSO',
        processoId: p.id,
        trechoOuReferencia: p.titulo,
        hashFonte: hashContent({
          id: p.id,
          titulo: p.titulo,
          status: p.status,
          atualizadoEm: p.atualizadoEm,
        }),
      })),
    ];

    const diasSemAtualizar = Math.floor(
      (Date.now() - cliente.atualizadoEm.getTime()) / (1000 * 60 * 60 * 24),
    );

    return Result.ok({
      promptContext: {
        campos: {
          Nome: cliente.nome,
          Tipo: cliente.tipo,
          Status: cliente.status,
          'Dias desde a última atualização cadastral': diasSemAtualizar,
          'Próximo prazo entre os processos visíveis': proximoPrazo
            ? `${proximoPrazo.titulo} em ${proximoPrazo.dataVencimento.toISOString().slice(0, 10)}`
            : null,
        },
        listas: {
          'Processos visíveis ao solicitante': processosVisiveis.map(
            (p) => `${p.titulo} (${p.status})`,
          ),
          'Documentos recentes': documentosRecentes.map((d) => d.nome),
        },
      },
      fontes,
    });
  }
}
