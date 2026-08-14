import { Prisma } from '@prisma/client';
import { MissingTenantContextError, TenantContextStorage } from './tenant-context';

/**
 * Modelos que carregam `escritorioId` diretamente e por isso recebem o
 * filtro automático de tenant. Reafirma docs/database/01-estrategia-multitenancy.md §1.4
 * e docs/backend/03-camadas.md §3.4.
 *
 * Modelos satélite sem `escritorioId` próprio (ProcessoMembro, VersaoDocumento,
 * ComentarioMencao, ProcessoTag, DocumentoTag, FonteIA, PapelPermissao) são
 * protegidos transitivamente pela FK composta para o agregado pai — ver
 * decisão registrada em docs/backend-implementation/19-decisions.md.
 */
const TENANT_SCOPED_MODELS = new Set([
  'Membro',
  'Convite',
  'Equipe',
  'Cliente',
  'Processo',
  'ParteProcesso',
  'Prazo',
  'ProcessoRelacionado',
  'Documento',
  'Pasta',
  'PastaJuridica',
  'PrefixoPastaJuridica',
  'OpcaoPastaJuridica',
  'EventoTimeline',
  'Comentario',
  'Tag',
  'ResumoIA',
  'Notificacao',
  'ConfiguracaoCaptura',
  'HistoricoSincronizacaoCaptura',
  'MovimentoJudicialCapturado',
  'PublicacaoJudicialCapturada',
]);

const READ_OPERATIONS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
]);

const WRITE_OPERATIONS = new Set(['update', 'updateMany', 'upsert', 'delete', 'deleteMany']);

/**
 * Prisma Client Extensions expõem `args`/`query` com um tipo genérico de
 * união (um por operação × modelo) impraticável de anotar estruturalmente
 * neste ponto — o próprio time do Prisma resolve isso internamente com
 * `any` em exemplos oficiais de `$allOperations`. Isolado a este arquivo,
 * mutando o `args` recebido (nunca substituindo por objeto novo de tipo
 * diferente) para preservar o contrato que `query()` espera.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function tenantScopedExtension() {
  return Prisma.defineExtension((client) =>
    client.$extends({
      name: 'tenant-scoped',
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }: any) {
            if (!TENANT_SCOPED_MODELS.has(model)) {
              return query(args);
            }

            const context = TenantContextStorage.get();

            if (READ_OPERATIONS.has(operation) || WRITE_OPERATIONS.has(operation)) {
              if (!context) {
                throw new MissingTenantContextError(model, operation);
              }
              args.where = { ...args.where, escritorioId: context.escritorioId };
              return query(args);
            }

            if (operation === 'create') {
              const alreadyHasTenant = args.data && args.data['escritorioId'] !== undefined;

              // Exceção deliberada de bootstrap: criação do primeiro Membro/
              // Escritorio de um usuário acontece antes de existir qualquer
              // TenantContext (não há sessão ativa ainda). Permitido *apenas*
              // quando o chamador já forneceu escritorioId explicitamente —
              // nunca cria linha sem tenant, apenas dispensa o contexto de
              // sessão para este caso específico de onboarding. Registrado em
              // docs/backend-implementation/19-decisions.md.
              if (!alreadyHasTenant) {
                if (!context) {
                  throw new MissingTenantContextError(model, operation);
                }
                args.data = { ...args.data, escritorioId: context.escritorioId };
              }
              return query(args);
            }

            if (operation === 'createMany') {
              if (!context) {
                throw new MissingTenantContextError(model, operation);
              }
              args.data = (args.data ?? []).map((row: Record<string, unknown>) => ({
                escritorioId: context.escritorioId,
                ...row,
              }));
              return query(args);
            }

            return query(args);
          },
        },
      },
    }),
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */
