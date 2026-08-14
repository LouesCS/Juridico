import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { AuthUser } from '../../../common/decorators/current-user.decorator';
import { assertDocumentAccess } from '../../documents/application/document-scope';
import {
  applyConfidentialityFilter,
  buildCaseScopeWhere,
  resolveCaseReadScope,
  ScopeActor,
} from '../../legal-cases/application/case-scope';
import { buildTaskScopeWhere, resolveTaskReadScope } from '../../tasks/application/task-scope';

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
 * Checagem de acesso a UM `ResumoIA` específico — reusada por todo use case
 * de item único (get/regenerate/cancel/feedback/sources), mesmo racional de
 * `assertDocumentAccess` (Sprint 09): reaproveita os `where` de escopo já
 * testados como filtro de query em vez de duplicar a regra de autorização.
 */
export async function assertResumoAccess(
  prisma: PrismaService,
  escritorioId: string,
  resumo: {
    processoId: string | null;
    documentoId: string | null;
    clienteId: string | null;
    tarefaId?: string | null;
  },
  user: AuthUser,
): Promise<boolean> {
  if (resumo.processoId) {
    const scope = resolveCaseReadScope(user.permissions);
    if (!scope) return false;
    const teamMemberIds =
      scope === 'TEAM' ? await resolveTeamMemberIds(prisma, escritorioId, user.membroId) : [];
    const actor: ScopeActor = { membroId: user.membroId, teamMemberIds };
    const processo = await prisma.client.processo.findFirst({
      where: {
        id: resumo.processoId,
        escritorioId,
        ...buildCaseScopeWhere(scope, actor),
        ...applyConfidentialityFilter(user.permissions),
      },
      select: { id: true },
    });
    return Boolean(processo);
  }

  if (resumo.documentoId) {
    const documento = await prisma.client.documento.findFirst({
      where: { id: resumo.documentoId, escritorioId },
    });
    if (!documento) return false;
    return assertDocumentAccess(prisma, documento, user);
  }

  if (resumo.clienteId) {
    if (!user.permissions.includes('client:read')) return false;
    const cliente = await prisma.client.cliente.findFirst({
      where: { id: resumo.clienteId, escritorioId },
      select: { id: true },
    });
    return Boolean(cliente);
  }

  if (resumo.tarefaId) {
    const scope = resolveTaskReadScope(user.permissions);
    if (!scope) return false;
    const membro = await prisma.client.membro.findFirst({
      where: { id: user.membroId },
      select: { equipeId: true },
    });
    const teamMemberIds =
      scope === 'TEAM' ? await resolveTeamMemberIds(prisma, escritorioId, user.membroId) : [];
    const tarefa = await prisma.client.tarefa.findFirst({
      where: {
        id: resumo.tarefaId,
        escritorioId,
        ...buildTaskScopeWhere(scope, {
          membroId: user.membroId,
          teamMemberIds,
          equipeId: membro?.equipeId ?? null,
        }),
      },
      select: { id: true },
    });
    return Boolean(tarefa);
  }

  return false;
}
