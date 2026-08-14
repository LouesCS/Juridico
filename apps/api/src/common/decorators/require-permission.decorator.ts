import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'requiredPermission';

/**
 * Reafirma docs/backend/06-autorizacao.md §6.1 — etapa 1 de 2 (ação).
 * A etapa 2 (recurso — ownership, segredo de justiça) é responsabilidade
 * da Policy do use case, nunca deste decorator.
 */
export const RequirePermission = (chave: string) => SetMetadata(PERMISSION_KEY, chave);
