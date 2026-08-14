import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../../common/decorators/current-user.decorator';
import { DomainError, Result } from '../../../../shared/domain/result';
import { resolveCaseReadScope } from '../case-scope';

/**
 * Reafirma docs/api/09-legal-cases.md §9.1 (`ProcessoDetalheDTO`) — processo
 * fora do escopo do usuário ou em segredo de justiça sem
 * `case:read:confidential` retorna 404 (nunca 403), para não revelar a
 * existência de um processo confidencial a quem não tem acesso.
 */
@Injectable()
export class GetLegalCaseUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(escritorioId: string, processoId: string, user: AuthUser) {
    const scope = resolveCaseReadScope(user.permissions);
    if (!scope) return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));

    const processo = await this.prisma.client.processo.findFirst({
      where: { id: processoId, escritorioId },
      include: {
        cliente: { select: { id: true, nome: true, tipo: true } },
        pastasJuridicas: {
          select: {
            pastaJuridica: {
              select: {
                id: true,
                nome: true,
                numeroInterno: true,
                encarregadoId: true,
                clientePrincipal: { select: { id: true, nome: true } },
                parteContrariaPrincipal: { select: { id: true, nome: true } },
              },
            },
          },
          take: 1,
        },
      },
    });
    if (!processo) return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));

    if (processo.segredoJustica && !user.permissions.includes('case:read:confidential')) {
      return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));
    }

    if (scope !== 'ALL') {
      const podeVer = await this.usuarioPertenceAoEscopo(processo, user, scope);
      if (!podeVer) return Result.fail(new DomainError('NOT_FOUND', 'Processo não encontrado.'));
    }

    const responsavel = await this.prisma.client.membro.findFirst({
      where: { id: processo.responsavelPrincipalId },
      include: { usuario: true },
    });
    const pasta = processo.pastasJuridicas?.[0]?.pastaJuridica ?? null;
    const encarregadoPasta = pasta
      ? await this.prisma.client.membro.findFirst({
          where: { id: pasta.encarregadoId, escritorioId },
          include: { usuario: { select: { nome: true } } },
        })
      : null;

    // `Processo.proximaDataRelevante` é uma coluna nunca escrita por nenhum
    // use case (achado real da Sprint 08) — calculado aqui a partir do
    // próximo `Prazo` pendente em vez de ler um valor sempre nulo.
    const proximoPrazo = await this.prisma.client.prazo.findFirst({
      where: { processoId, status: 'PENDENTE' },
      orderBy: { dataVencimento: 'asc' },
      select: { dataVencimento: true },
    });

    return Result.ok({
      id: processo.id,
      titulo: processo.titulo,
      descricao: processo.descricao,
      numeroCnj: processo.numeroCnj,
      numeroInterno: processo.numeroInterno,
      instituicao: processo.instituicao,
      numeroBeneficio: processo.numeroBeneficio,
      roNumeroBeneficio: processo.roNumeroBeneficio,
      area: processo.area,
      tipoAcao: processo.tipoAcao,
      tipo: processo.tipo,
      tribunal: processo.tribunal,
      comarca: processo.comarca,
      vara: processo.vara,
      uf: processo.uf,
      instancia: processo.instancia,
      classeProcessual: processo.classeProcessual,
      assunto: processo.assunto,
      poloCliente: processo.poloCliente,
      status: processo.status,
      prioridade: processo.prioridade,
      segredoJustica: processo.segredoJustica,
      valorCausaCentavos: processo.valorCausaCentavos?.toString() ?? null,
      moedaValorCausa: processo.moedaValorCausa,
      dataDistribuicao: processo.dataDistribuicao,
      dataEncerramento: processo.dataEncerramento,
      cliente: processo.cliente,
      pastaJuridica: pasta
        ? {
            id: pasta.id,
            nome: pasta.nome,
            numeroInterno: pasta.numeroInterno,
            clientePrincipal: pasta.clientePrincipal,
            parteContrariaPrincipal: pasta.parteContrariaPrincipal,
            encarregado: encarregadoPasta?.usuario
              ? { id: encarregadoPasta.id, nome: encarregadoPasta.usuario.nome }
              : null,
          }
        : null,
      responsavel: responsavel
        ? {
            id: responsavel.id,
            nome: responsavel.usuario?.nome,
            avatarUrl: responsavel.usuario?.avatarUrl,
          }
        : null,
      proximaDataRelevante: proximoPrazo?.dataVencimento ?? null,
      observacoes: processo.observacoes,
      versao: processo.versao,
      criadoEm: processo.criadoEm,
      atualizadoEm: processo.atualizadoEm,
      arquivadoEm: processo.arquivadoEm,
      // Módulos ainda não implementados nesta rodada (docs/backend-implementation/00-status.md)
      // — placeholders explícitos, nunca dado inventado.
      resumoIaVigente: null,
      tagsAtivas: [] as Array<{ id: string; nome: string; cor: string }>,
    });
  }

  private async usuarioPertenceAoEscopo(
    processo: { responsavelPrincipalId: string; id: string },
    user: AuthUser,
    scope: 'TEAM' | 'ASSIGNED',
  ): Promise<boolean> {
    if (processo.responsavelPrincipalId === user.membroId) return true;

    const souEquipe = await this.prisma.client.processoMembro.findFirst({
      where: { processoId: processo.id, membroId: user.membroId },
      select: { id: true },
    });
    if (souEquipe) return true;

    if (scope === 'TEAM') {
      const meuMembro = await this.prisma.client.membro.findFirst({
        where: { id: user.membroId },
        select: { equipeId: true },
      });
      if (meuMembro?.equipeId) {
        const responsavelMesmaEquipe = await this.prisma.client.membro.findFirst({
          where: { id: processo.responsavelPrincipalId, equipeId: meuMembro.equipeId },
          select: { id: true },
        });
        if (responsavelMesmaEquipe) return true;
      }
    }

    return false;
  }
}
