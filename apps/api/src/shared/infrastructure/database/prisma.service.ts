import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { softDeleteExtension } from './soft-delete.extension';
import { tenantScopedExtension } from './tenant-scoped.extension';

/**
 * Client Prisma estendido — composição de soft-delete + tenant-scoped,
 * reafirma docs/backend/01-arquitetura.md §1.2 e
 * docs/database/01-estrategia-multitenancy.md §1.4.
 *
 * Nenhum repositório importa @prisma/client diretamente fora desta pasta
 * (shared/infrastructure/database) e das implementações concretas em
 * modules/<nome>/infrastructure/repositories/*.
 */
function buildExtendedClient() {
  return new PrismaClient().$extends(softDeleteExtension()).$extends(tenantScopedExtension());
}

function buildGlobalScopeClient() {
  // Apenas soft-delete, SEM o filtro de tenant — reservado a leituras
  // legitimamente globais (ex.: "em quais escritórios este usuário tem
  // vínculo ativo", necessário no login antes de existir qualquer
  // TenantContext). Nunca exposto fora dos métodos explícitos desta classe;
  // nenhum repositório de módulo acessa isto diretamente. Registrado em
  // docs/backend-implementation/19-decisions.md.
  return new PrismaClient().$extends(softDeleteExtension());
}

export type ExtendedPrismaClient = ReturnType<typeof buildExtendedClient>;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public readonly client: ExtendedPrismaClient;
  private readonly globalScopeClient: ReturnType<typeof buildGlobalScopeClient>;

  constructor() {
    this.client = buildExtendedClient();
    this.globalScopeClient = buildGlobalScopeClient();
  }

  async onModuleInit() {
    await (this.client as unknown as PrismaClient).$connect();
    this.logger.log('Conexão com PostgreSQL estabelecida');
  }

  async onModuleDestroy() {
    await (this.client as unknown as PrismaClient).$disconnect();
    await (this.globalScopeClient as unknown as PrismaClient).$disconnect();
  }

  /**
   * Lista os vínculos ativos de um usuário em TODOS os escritórios —
   * inerentemente cross-tenant (é literalmente "a quais tenants este usuário
   * pertence"), sempre filtrado por `usuarioId` do próprio ator autenticado,
   * nunca por `escritorioId` arbitrário. Usado por Identity no login/troca
   * de escritório sem depender do módulo Memberships (docs/backend/02-modulos.md §2.1/§2.3).
   */
  async listarMembrosAtivosDoUsuario(usuarioId: string) {
    return this.globalScopeClient.membro.findMany({
      where: { usuarioId, status: 'ATIVO' },
      include: { escritorio: true, papel: true },
    });
  }

  /**
   * Transação de bootstrap/onboarding — usada por fluxos que legitimamente
   * não têm (e não podem ter) um TenantContext ainda: registro do primeiro
   * escritório e aceite de convite (o usuário está, por definição, entrando
   * em um tenant novo). A autorização nesses fluxos não vem do
   * TenantContext — vem da posse de um token de uso único válido (convite)
   * ou da própria intenção de criar algo novo (registro). Reafirma
   * docs/backend-implementation/19-decisions.md; nunca usado para ler ou
   * alterar dado de um tenant já existente fora desses dois fluxos.
   */
  async runBootstrapTransaction<T>(
    fn: (
      tx: Parameters<Parameters<typeof this.globalScopeClient.$transaction>[0]>[0],
    ) => Promise<T>,
  ): Promise<T> {
    return this.globalScopeClient.$transaction(fn);
  }

  /**
   * Acesso direto e explícito ao client sem filtro de tenant — mesmo
   * propósito do parágrafo acima, para leituras avulsas (fora de
   * transação) dos dois fluxos de bootstrap. Nome deliberadamente longo e
   * comentado para não ser confundido com `client` no autocomplete.
   */
  get bootstrapClientSemFiltroDeTenant() {
    return this.globalScopeClient;
  }

  /**
   * Transação com SET LOCAL de RLS como primeiro comando — reafirma
   * docs/database/01-estrategia-multitenancy.md §1.7 e
   * docs/backend/11-testes.md. A política RLS em si é aplicada via migration
   * SQL manual (ver pasta prisma/migrations, arquivo manual_rls.sql); esta
   * função garante que toda escrita multi-tabela abra transação com o
   * tenant já setado.
   */
  async runInTenantTransaction<T>(
    escritorioId: string,
    fn: (tx: Parameters<Parameters<ExtendedPrismaClient['$transaction']>[0]>[0]) => Promise<T>,
  ): Promise<T> {
    return this.client.$transaction(async (tx) => {
      // set_config(..., true) com terceiro parâmetro `true` = escopo LOCAL à
      // transação corrente — parametrizado via tagged template (Prisma.sql),
      // nunca interpolação de string, reafirma docs/database/08-permissoes-seguranca.md §8.4.
      await tx.$executeRaw`SELECT set_config('app.tenant_id', ${escritorioId}, true)`;
      return fn(tx);
    });
  }
}
