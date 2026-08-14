import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import {
  buildCaseScopeWhere,
  CaseReadScope,
  resolveCaseReadScope,
  ScopeActor,
} from '../../legal-cases/application/case-scope';

/**
 * Reafirma docs/api/03-autorizacao.md §3.7 — documento vinculado a um
 * processo herda o escopo de leitura do processo (importa as funções puras
 * de `legal-cases/application/case-scope.ts`, mesmo padrão de cross-module
 * import sem DI já usado por `ListRecentTimelineAggregateUseCase` na
 * Sprint 08 — nenhuma dependência circular de módulo NestJS é criada).
 * Documento "solto" (biblioteca geral, `processoId = null`) usa o escopo
 * próprio `document:read:{escopo}` com ownership por `autorUploadId`.
 */
export type DocumentReadScope = 'ALL' | 'TEAM' | 'ASSIGNED';

export function resolveDocumentReadScope(permissions: string[]): DocumentReadScope | null {
  if (permissions.includes('document:read:all')) return 'ALL';
  if (permissions.includes('document:read:team')) return 'TEAM';
  if (permissions.includes('document:read:assigned')) return 'ASSIGNED';
  return null;
}

export { resolveCaseReadScope };
export type { CaseReadScope, ScopeActor };

/**
 * Monta o `where` combinando as duas metades do escopo (documento vinculado
 * a processo vs. documento solto). `TEAM` para documento solto é tratado
 * como `ASSIGNED` — `Documento` sem processo não tem conceito de "equipe"
 * próprio (a `Equipe` só existe pendurada em `Processo`); simplificação
 * documentada, não uma omissão silenciosa.
 */
export function buildDocumentScopeWhere(
  caseScope: CaseReadScope | null,
  documentScope: DocumentReadScope | null,
  actor: ScopeActor,
): Prisma.DocumentoWhereInput {
  const branches: Prisma.DocumentoWhereInput[] = [];

  if (caseScope) {
    branches.push({
      processoId: { not: null },
      processo: buildCaseScopeWhere(caseScope, actor),
    });
  }

  if (documentScope) {
    branches.push({
      processoId: null,
      ...(documentScope === 'ALL' ? {} : { autorUploadId: actor.membroId }),
    });
  }

  if (branches.length === 0) {
    // Nunca deveria ocorrer (o guard de permissão já bloqueia antes) — where
    // impossível como defesa em profundidade.
    return { id: '00000000-0000-0000-0000-000000000000' };
  }

  return branches.length === 1 ? branches[0] : { OR: branches };
}

/** Reafirma docs/api/03-autorizacao.md §3.7 — confidencialidade de documento é independente da do processo. */
export function applyDocumentConfidentialityFilter(
  permissions: string[],
): Prisma.DocumentoWhereInput {
  if (permissions.includes('case:read:confidential')) return {};
  return { confidencialidade: { not: 'CONFIDENCIAL' } };
}

/**
 * Checagem de acesso a UM documento específico — reusada por todo use case
 * de item único (get/update/move/delete/download/versões/favoritar) para não
 * duplicar a mesma regra de negócio em 7 lugares. 404 (nunca 403) reforça
 * docs/api/03-autorizacao.md §3.9.
 */
export async function assertDocumentAccess(
  prisma: PrismaService,
  documento: { processoId: string | null; autorUploadId: string; confidencialidade: string },
  user: AuthUser,
): Promise<boolean> {
  if (
    documento.confidencialidade === 'CONFIDENCIAL' &&
    !user.permissions.includes('case:read:confidential')
  ) {
    return false;
  }

  if (documento.processoId) {
    const caseScope = resolveCaseReadScope(user.permissions);
    if (!caseScope) return false;
    if (caseScope === 'ALL') return true;

    const souEquipe = await prisma.client.processoMembro.findFirst({
      where: { processoId: documento.processoId, membroId: user.membroId },
      select: { id: true },
    });
    if (souEquipe) return true;

    const processo = await prisma.client.processo.findFirst({
      where: { id: documento.processoId },
      select: { responsavelPrincipalId: true },
    });
    if (processo?.responsavelPrincipalId === user.membroId) return true;

    if (caseScope === 'TEAM' && processo?.responsavelPrincipalId) {
      const meuMembro = await prisma.client.membro.findFirst({
        where: { id: user.membroId },
        select: { equipeId: true },
      });
      if (meuMembro?.equipeId) {
        const mesmaEquipe = await prisma.client.membro.findFirst({
          where: { id: processo.responsavelPrincipalId, equipeId: meuMembro.equipeId },
          select: { id: true },
        });
        if (mesmaEquipe) return true;
      }
    }
    return false;
  }

  const documentScope = resolveDocumentReadScope(user.permissions);
  if (!documentScope) return false;
  if (documentScope === 'ALL') return true;
  return documento.autorUploadId === user.membroId;
}
