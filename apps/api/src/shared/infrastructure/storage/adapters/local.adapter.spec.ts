import { LocalStorageAdapter } from './local.adapter';

function buildConfig(overrides: Record<string, string | undefined> = {}) {
  const values: Record<string, string> = {
    LOCAL_STORAGE_DIR: './storage-data-test',
    API_PUBLIC_URL: 'http://localhost:3000',
    API_PREFIX: 'api/v1',
    LOCAL_STORAGE_SECRET: 'segredo-fixo-de-teste',
    NODE_ENV: 'test',
    ...overrides,
  };
  return { get: (key: string) => values[key] } as never;
}

describe('LocalStorageAdapter', () => {
  it('presignUpload gera uma URL apontando para /storage/local/upload/:token', async () => {
    const adapter = new LocalStorageAdapter(buildConfig());
    const presigned = await adapter.presignUpload(
      'escritorio-1/doc-1/v1/arquivo.pdf',
      'application/pdf',
      900,
    );

    expect(presigned.url).toMatch(/^http:\/\/localhost:3000\/api\/v1\/storage\/local\/upload\//);
  });

  it('presignDownload gera uma URL apontando para /storage/local/download/:token', async () => {
    const adapter = new LocalStorageAdapter(buildConfig());
    const presigned = await adapter.presignDownload('escritorio-1/doc-1/v1/arquivo.pdf', 300);

    expect(presigned.url).toMatch(/^http:\/\/localhost:3000\/api\/v1\/storage\/local\/download\//);
  });

  it('bloqueia storageKey que tenta escapar do diretório base (path traversal)', () => {
    const adapter = new LocalStorageAdapter(buildConfig());
    expect(() => adapter.resolvedPath('../../etc/passwd')).toThrow();
  });

  it('resolve o mesmo caminho para a mesma key dentro do diretório base', () => {
    const adapter = new LocalStorageAdapter(buildConfig());
    const caminho = adapter.resolvedPath('escritorio-1/doc-1/v1/arquivo.pdf');
    expect(caminho).toContain('escritorio-1');
    expect(caminho).toContain('arquivo.pdf');
  });
});
