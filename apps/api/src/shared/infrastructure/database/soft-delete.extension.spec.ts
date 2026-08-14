import { INCLUDE_DELETED, softDeleteExtension } from './soft-delete.extension';

/**
 * Reafirma o bug real documentado em
 * docs/backend-implementation/20-context-next-step.md (achado desde o
 * Prompt 7): `INCLUDE_DELETED` precisa distinguir "chave `excluidoEm`
 * ausente" de "chave presente com valor `undefined`" — corrigido na
 * Sprint 09 trocando `=== undefined` por `'excluidoEm' in args.where`.
 */
describe('softDeleteExtension', () => {
  function buildExtendedFake() {
    const fakeClient = {
      $extends(config: { query: { $allModels: { $allOperations: unknown } } }) {
        return { allOperations: config.query.$allModels.$allOperations };
      },
    };
    const extension = softDeleteExtension() as unknown as (client: unknown) => {
      allOperations: (input: {
        model: string;
        operation: string;
        args: { where?: Record<string, unknown> };
        query: (args: unknown) => unknown;
      }) => unknown;
    };
    return extension(fakeClient);
  }

  it('injeta excluidoEm: null quando a chave não é passada', async () => {
    const { allOperations } = buildExtendedFake();
    const query = jest.fn((args) => args);

    const result = await allOperations({
      model: 'Documento',
      operation: 'findMany',
      args: { where: { escritorioId: 'x' } },
      query,
    });

    expect(result).toEqual({ where: { escritorioId: 'x', excluidoEm: null } });
  });

  it('NÃO sobrescreve quando INCLUDE_DELETED é espalhado no where (escape hatch da Lixeira)', async () => {
    const { allOperations } = buildExtendedFake();
    const query = jest.fn((args) => args);

    const result = await allOperations({
      model: 'Documento',
      operation: 'findMany',
      args: { where: { escritorioId: 'x', ...INCLUDE_DELETED } },
      query,
    });

    expect(result).toEqual({ where: { escritorioId: 'x', excluidoEm: undefined } });
  });

  it('ignora modelos fora de SOFT_DELETE_MODELS', async () => {
    const { allOperations } = buildExtendedFake();
    const query = jest.fn((args) => args);

    const result = await allOperations({
      model: 'Sessao',
      operation: 'findMany',
      args: { where: {} },
      query,
    });

    expect(result).toEqual({ where: {} });
  });
});
