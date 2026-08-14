import { Prisma } from '@prisma/client';

/**
 * Reafirma docs/database/10-soft-delete-retencao-lgpd.md §10.9 e
 * docs/backend/11-testes.md — toda leitura de domínio filtra
 * `excluidoEm IS NULL` por padrão; `delete`/`deleteMany` viram `update` que
 * carimba `excluidoEm`. A tela de Lixeira usa `withDeleted: true` explícito
 * (ver base-tenant.repository.ts) para escapar deste comportamento.
 */
const SOFT_DELETE_MODELS = new Set([
  'Usuario',
  'Escritorio',
  'Cliente',
  'Processo',
  'ParteProcesso',
  'Pasta',
  'PastaJuridica',
  'Documento',
  'EventoTimeline',
  'Comentario',
  'Tag',
]);

const READ_OPERATIONS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'count',
]);

/**
 * Ver nota sobre `any` em tenant-scoped.extension.ts — mesma limitação de
 * tipagem genérica do Prisma Client Extensions, isolada a este arquivo.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function softDeleteExtension() {
  return Prisma.defineExtension((client) =>
    client.$extends({
      name: 'soft-delete',
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }: any) {
            if (!SOFT_DELETE_MODELS.has(model)) {
              return query(args);
            }

            if (READ_OPERATIONS.has(operation)) {
              // `'excluidoEm' in args.where` (não `=== undefined`) é o que torna
              // `INCLUDE_DELETED` (`{ excluidoEm: undefined }`) distinguível de
              // simplesmente não passar a chave — spread de um objeto com uma
              // chave presente cujo valor é `undefined` ainda deixa a chave
              // detectável via `in`/`Object.keys`, diferente de nunca a ter
              // definido. Bug real corrigido na Sprint 09 (achado registrado
              // desde o Prompt 7 em docs/backend-implementation/20-context-next-step.md) —
              // antes disso, `INCLUDE_DELETED` nunca escapava o filtro de fato.
              if (!args.where || !('excluidoEm' in args.where)) {
                args.where = { ...args.where, excluidoEm: null };
              }
              return query(args);
            }

            if (operation === 'delete') {
              return (client as any)[lowerFirst(model)].update({
                where: args.where,
                data: { excluidoEm: new Date() },
              });
            }

            if (operation === 'deleteMany') {
              return (client as any)[lowerFirst(model)].updateMany({
                where: args.where,
                data: { excluidoEm: new Date() },
              });
            }

            return query(args);
          },
        },
      },
    }),
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function lowerFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

/**
 * Opção de escape explícita para a tela de Lixeira — nunca o padrão.
 * Uso: prisma.$extends(withDeletedContext()) pontualmente, ou passe
 * `excluidoEm: undefined` no `where` diretamente pelo repositório dedicado.
 */
export const INCLUDE_DELETED = { excluidoEm: undefined } as const;
