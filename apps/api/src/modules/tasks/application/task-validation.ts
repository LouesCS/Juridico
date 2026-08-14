import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { DomainError } from '../../../shared/domain/result';

/**
 * Validações cross-módulo compartilhadas por Create/Update — todas as
 * referências de `Tarefa` para Categoria/Status/Prioridade/Responsável/
 * Grupo são colunas soltas (ver nota no schema), então a garantia de que
 * pertencem ao mesmo escritório é responsabilidade da aplicação, nunca de
 * FK de banco. Retorna `null` quando válido, ou a mensagem de erro.
 */
export async function validateTaskReferences(
  prisma: PrismaService,
  escritorioId: string,
  input: {
    categoriaId?: string | null;
    statusId?: string | null;
    prioridadeId?: string | null;
    responsavelPrincipalId?: string | null;
    responsaveisAuxiliaresIds?: string[];
    equipeId?: string | null;
    grupoColaboradoresId?: string | null;
  },
): Promise<DomainError | null> {
  if (input.categoriaId) {
    const categoria = await prisma.client.categoriaTarefa.findFirst({
      where: { id: input.categoriaId, escritorioId },
      select: { id: true },
    });
    if (!categoria) return new DomainError('NOT_FOUND', 'Categoria de tarefa não encontrada.');
  }

  for (const [campo, id] of [
    ['statusId', input.statusId],
    ['prioridadeId', input.prioridadeId],
  ] as const) {
    if (!id) continue;
    const item = await prisma.client.conjuntoValorItem.findFirst({
      where: { id, conjunto: { escritorioId } },
      select: { id: true },
    });
    if (!item) {
      return new DomainError('NOT_FOUND', `Valor de "${campo}" não encontrado neste escritório.`);
    }
  }

  const membroIds = [
    ...(input.responsavelPrincipalId ? [input.responsavelPrincipalId] : []),
    ...(input.responsaveisAuxiliaresIds ?? []),
  ];
  if (membroIds.length > 0) {
    const membros = await prisma.client.membro.findMany({
      where: { id: { in: membroIds }, escritorioId },
      select: { id: true },
    });
    if (membros.length !== new Set(membroIds).size) {
      return new DomainError(
        'NOT_FOUND',
        'Um ou mais responsáveis não pertencem a este escritório.',
      );
    }
  }

  if (input.equipeId) {
    const equipe = await prisma.client.equipe.findFirst({
      where: { id: input.equipeId, escritorioId },
      select: { id: true },
    });
    if (!equipe) return new DomainError('NOT_FOUND', 'Equipe não encontrada.');
  }

  if (input.grupoColaboradoresId) {
    const grupo = await prisma.client.grupoColaboradores.findFirst({
      where: { id: input.grupoColaboradoresId, escritorioId },
      select: { id: true },
    });
    if (!grupo) return new DomainError('NOT_FOUND', 'Grupo de colaboradores não encontrado.');
  }

  return null;
}
