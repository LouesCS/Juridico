import { DataJudProvider, resolveDataJudAlias } from './datajud.provider';

describe('DataJudProvider', () => {
  afterEach(() => jest.restoreAllMocks());
  it('resolve o alias do tribunal a partir do CNJ', () => {
    expect(resolveDataJudAlias('1234567-19.2024.8.26.0001')).toBe('tjsp');
    expect(resolveDataJudAlias('0000832-35.2018.4.01.3202')).toBe('trf1');
  });
  it('normaliza capa e movimentos sem vazar o payload externo', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          hits: {
            hits: [
              {
                _id: 'official-1',
                _source: {
                  numeroProcesso: '12345671920248260001',
                  tribunal: 'TJSP',
                  classe: { nome: 'Procedimento Comum' },
                  orgaoJulgador: { nome: '1ª Vara' },
                  movimentos: [
                    { codigo: 26, nome: 'Distribuição', dataHora: '2026-08-01T10:00:00.000Z' },
                  ],
                },
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );
    const config = {
      get: (key: string) =>
        ({
          DATAJUD_API_KEY: 'public-key',
          DATAJUD_BASE_URL: 'https://example.test',
          JUDICIAL_CAPTURE_TIMEOUT_MS: 1000,
        })[key],
    } as never;
    const result = await new DataJudProvider(config).findProcess('1234567-19.2024.8.26.0001');
    expect(result).toMatchObject({
      provider: 'DATAJUD',
      cnj: '12345671920248260001',
      court: 'TJSP',
      judgingBody: '1ª Vara',
      proceduralClass: 'Procedimento Comum',
    });
    expect(result?.movements[0]).toMatchObject({ type: '26', description: 'Distribuição' });
    expect(result?.movements[0].externalId).toHaveLength(64);
  });
  it('mapeia rate limit sem expor resposta externa', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 429 }));
    const config = {
      get: (key: string) =>
        ({
          DATAJUD_API_KEY: 'public-key',
          DATAJUD_BASE_URL: 'https://example.test',
          JUDICIAL_CAPTURE_TIMEOUT_MS: 1000,
        })[key],
    } as never;
    await expect(
      new DataJudProvider(config).findProcess('1234567-19.2024.8.26.0001'),
    ).rejects.toMatchObject({ code: 'RATE_LIMIT' });
  });
});
