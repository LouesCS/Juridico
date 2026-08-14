import { execSync } from 'child_process';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaClient } from '@prisma/client';

/**
 * Suíte de isolamento de tenant via Row-Level Security — PROMPT 5C Etapa 2.
 * Reafirma docs/backend/11-testes.md §11.2 ("Postgres real via
 * Testcontainers, nunca mock de Prisma — o valor destes testes está em
 * validar RLS, FK composta e constraint que um mock não reproduz").
 *
 * NUNCA EXECUTADA NESTE AMBIENTE — requer Docker (Testcontainers sobe um
 * container Postgres real), indisponível na sandbox onde esta etapa foi
 * escrita. Ver docs/backend-implementation/17-tests.md e
 * docs/backend-implementation/19-decisions.md. Roda via
 * `npm run test:integration`, não faz parte de `npm test` (jest.config
 * default aponta apenas para src/**\/*.spec.ts).
 *
 * Ponto crítico que este teste PRECISA respeitar (documentado na própria
 * migration, prisma/migrations/20260731000001_enable_rls/migration.sql):
 * Postgres ignora RLS para o DONO da tabela mesmo com FORCE ROW LEVEL
 * SECURITY. `prisma migrate deploy` roda com o usuário padrão do container
 * (dono das tabelas criadas) — por isso as queries de teste usam uma role
 * SEPARADA (`app_runtime`, sem BYPASSRLS, sem ser dona de nada), criada
 * depois da migration, exatamente como a aplicação real deveria se conectar
 * em produção.
 */
describe('Isolamento de tenant via RLS (Postgres real)', () => {
  jest.setTimeout(120_000);

  let container: StartedPostgreSqlContainer;
  let adminUrl: string;
  let runtimeUrl: string;
  let admin: PrismaClient;
  let runtime: PrismaClient;

  let escritorioA: string;
  let escritorioB: string;
  let responsavelA: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    adminUrl = container.getConnectionUri();

    execSync('npx prisma migrate deploy', {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: adminUrl },
      stdio: 'inherit',
    });

    admin = new PrismaClient({ datasources: { db: { url: adminUrl } } });
    await admin.$connect();

    // Role de runtime — sem BYPASSRLS, sem ser dona das tabelas (o admin
    // acima é quem rodou a migration e é o owner). Espelha a role
    // `app_runtime` referenciada em prisma/migrations/*/enable_rls.
    await admin.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE ROLE app_runtime LOGIN PASSWORD 'app_runtime';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await admin.$executeRawUnsafe(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime',
    );

    const url = new URL(adminUrl);
    url.username = 'app_runtime';
    url.password = 'app_runtime';
    runtimeUrl = url.toString();
    runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl } } });
    await runtime.$connect();

    const escritorios = await admin.escritorio.createManyAndReturn({
      data: [
        {
          nomeFantasia: 'Escritório A',
          slug: 'escritorio-a',
          email: 'a@a.com',
          status: 'ATIVO',
          plano: 'TRIAL',
        },
        {
          nomeFantasia: 'Escritório B',
          slug: 'escritorio-b',
          email: 'b@b.com',
          status: 'ATIVO',
          plano: 'TRIAL',
        },
      ],
    });
    escritorioA = escritorios[0].id;
    escritorioB = escritorios[1].id;

    await admin.cliente.create({
      data: {
        escritorioId: escritorioA,
        nome: 'Cliente da A',
        tipo: 'PESSOA_FISICA',
        status: 'ATIVO',
      },
    });
    await admin.cliente.create({
      data: {
        escritorioId: escritorioB,
        nome: 'Cliente da B',
        tipo: 'PESSOA_FISICA',
        status: 'ATIVO',
      },
    });

    const papel = await admin.papel.create({
      data: { nome: 'OWNER', ehSistema: true, nivel: 1, descricao: 'Owner (fixture de teste)' },
    });
    const usuario = await admin.usuario.create({
      data: { nome: 'Fixture', sobrenome: 'A', email: 'fixture-a@test.local', status: 'ATIVO' },
    });
    const membroA = await admin.membro.create({
      data: {
        usuarioId: usuario.id,
        escritorioId: escritorioA,
        papelId: papel.id,
        status: 'ATIVO',
        nome: `${usuario.nome} ${usuario.sobrenome}`,
        email: usuario.email,
      },
    });
    responsavelA = membroA.id;
  });

  afterAll(async () => {
    await admin?.$disconnect();
    await runtime?.$disconnect();
    await container?.stop();
  });

  type RuntimeTx = Parameters<Parameters<typeof runtime.$transaction>[0]>[0];

  /**
   * `SET LOCAL` só vale para a transação corrente — por isso toda query do
   * cenário PRECISA rodar através do `tx` recebido aqui, nunca do client
   * `runtime` top-level (que abriria uma conexão/transação nova, sem o
   * `app.tenant_id` setado, e o teste passaria escondendo um bug).
   */
  async function withTenant<T>(
    escritorioId: string,
    fn: (tx: RuntimeTx) => Promise<T>,
  ): Promise<T> {
    return runtime.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.tenant_id', '${escritorioId}', true)`);
      return fn(tx);
    });
  }

  it('Tenant A não lê clientes do Tenant B', async () => {
    const clientes = await withTenant(escritorioA, (tx) =>
      tx.cliente.findMany({ where: { escritorioId: escritorioB } }),
    );
    expect(clientes).toHaveLength(0);
  });

  it('Tenant A só lê os próprios clientes mesmo sem filtro explícito de escritorioId', async () => {
    const clientes = await withTenant(escritorioA, (tx) => tx.cliente.findMany());
    expect(clientes.every((c) => c.escritorioId === escritorioA)).toBe(true);
  });

  it('Tenant A não altera cliente do Tenant B (UPDATE afeta 0 linhas)', async () => {
    const clienteB = await admin.cliente.findFirstOrThrow({ where: { escritorioId: escritorioB } });
    await withTenant(escritorioA, (tx) =>
      tx.cliente.updateMany({
        where: { id: clienteB.id },
        data: { nome: 'Nome alterado indevidamente' },
      }),
    );
    const aindaIntacto = await admin.cliente.findUniqueOrThrow({ where: { id: clienteB.id } });
    expect(aindaIntacto.nome).toBe('Cliente da B');
  });

  it('Tenant A não exclui cliente do Tenant B (DELETE afeta 0 linhas)', async () => {
    const clienteB = await admin.cliente.findFirstOrThrow({ where: { escritorioId: escritorioB } });
    await withTenant(escritorioA, (tx) => tx.cliente.deleteMany({ where: { id: clienteB.id } }));
    const aindaExiste = await admin.cliente.findUnique({ where: { id: clienteB.id } });
    expect(aindaExiste).not.toBeNull();
  });

  it('ausência de contexto (app.tenant_id não setado) bloqueia toda leitura', async () => {
    const clientes = await runtime.cliente.findMany();
    expect(clientes).toHaveLength(0);
  });

  it('relação satélite (processo_tag) é bloqueada transitivamente via EXISTS na tabela pai', async () => {
    const processoA = await admin.processo.create({
      data: {
        escritorioId: escritorioA,
        clienteId: (await admin.cliente.findFirstOrThrow({ where: { escritorioId: escritorioA } }))
          .id,
        titulo: 'Processo de teste A',
        area: 'Cível',
        poloCliente: 'ATIVO',
        responsavelPrincipalId: responsavelA,
        tipo: 'JUDICIAL',
        status: 'ATIVO',
      },
    });
    const tagB = await admin.tag.create({
      data: { escritorioId: escritorioB, nome: 'tag-b', cor: '#000000' },
    });
    await admin.processoTag.create({ data: { processoId: processoA.id, tagId: tagB.id } });

    const visiveisParaA = await withTenant(escritorioA, (tx) =>
      tx.processoTag.findMany({ where: { processoId: processoA.id } }),
    );
    // O processo pertence a A; a tag pertence a B, mas a linha de junção
    // segue o tenant do processo (política via EXISTS em processos, não em
    // tags) — o teste real de vazamento é buscar pelo tenant de B, que não
    // deveria enxergar a linha de junção mesmo a tag sendo dele.
    const visiveisParaB = await withTenant(escritorioB, (tx) =>
      tx.processoTag.findMany({ where: { processoId: processoA.id } }),
    );
    expect(visiveisParaA.length).toBeGreaterThan(0);
    expect(visiveisParaB).toHaveLength(0);
  });
});
