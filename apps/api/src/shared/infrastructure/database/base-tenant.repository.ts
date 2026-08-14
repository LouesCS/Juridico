import { PrismaService } from './prisma.service';
import { TenantContextStorage } from './tenant-context';

/**
 * Repositório base para agregados tenant-scoped — exige `escritorioId` como
 * parâmetro posicional em todo método de leitura, reafirma
 * docs/database/01-estrategia-multitenancy.md §1.5 e
 * docs/backend/01-arquitetura.md §1.3.
 *
 * Isso é redundante com o filtro automático da tenant-scoped.extension, por
 * design: a extensão é a rede de segurança; a assinatura do método é o que
 * torna impossível *escrever* uma chamada sem tenant, mesmo antes de rodar.
 */
export abstract class BaseTenantRepository {
  protected constructor(protected readonly prisma: PrismaService) {}

  protected requireTenantContext(escritorioId: string): void {
    const ctx = TenantContextStorage.get();
    if (!ctx || ctx.escritorioId !== escritorioId) {
      throw new Error(
        'Chamada de repositório com escritorioId divergente do TenantContext ativo — bloqueado.',
      );
    }
  }
}
