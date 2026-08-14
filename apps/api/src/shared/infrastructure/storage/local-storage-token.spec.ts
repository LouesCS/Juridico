import { LocalStorageTokenService } from './local-storage-token';

describe('LocalStorageTokenService', () => {
  const tokens = new LocalStorageTokenService('segredo-de-teste');

  it('assina e verifica um token válido', () => {
    const token = tokens.sign({ key: 'a/b/c.pdf', action: 'upload', exp: Date.now() + 60_000 });
    const payload = tokens.verify(token);
    expect(payload).toMatchObject({ key: 'a/b/c.pdf', action: 'upload' });
  });

  it('rejeita token expirado', () => {
    const token = tokens.sign({ key: 'a/b/c.pdf', action: 'download', exp: Date.now() - 1 });
    expect(tokens.verify(token)).toBeNull();
  });

  it('rejeita token com assinatura adulterada', () => {
    const token = tokens.sign({ key: 'a/b/c.pdf', action: 'download', exp: Date.now() + 60_000 });
    const [body] = token.split('.');
    expect(tokens.verify(`${body}.assinatura-invalida`)).toBeNull();
  });

  it('rejeita token assinado com outro segredo', () => {
    const outros = new LocalStorageTokenService('outro-segredo');
    const token = outros.sign({ key: 'a/b/c.pdf', action: 'download', exp: Date.now() + 60_000 });
    expect(tokens.verify(token)).toBeNull();
  });

  it('rejeita token malformado', () => {
    expect(tokens.verify('sem-ponto')).toBeNull();
    expect(tokens.verify('')).toBeNull();
  });
});
