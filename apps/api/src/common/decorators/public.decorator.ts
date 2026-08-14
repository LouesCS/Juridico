import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca uma rota como isenta de JwtAuthGuard/TenantGuard — reafirma
 * docs/backend/05-autenticacao.md §5.3: negar por padrão, exceção explícita.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
