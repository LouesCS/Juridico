import { DomainError } from '../../../../shared/domain/result';
import { PermissionResolverService } from '../../../../shared/authorization/permission-resolver.service';
import { LoginUseCase } from './login.use-case';

describe('LoginUseCase', () => {
  const usuarioRepository = {
    buscarPorEmail: jest.fn(),
    atualizarUltimoAcesso: jest.fn(),
  };
  const sessaoRepository = {
    criar: jest.fn(),
  };
  const prisma = {
    listarMembrosAtivosDoUsuario: jest.fn(),
    client: {
      papelPermissao: { findMany: jest.fn().mockResolvedValue([]) },
      permissaoUsuario: { findMany: jest.fn().mockResolvedValue([]) },
    },
  };
  const passwordService = {
    hash: jest.fn().mockResolvedValue('hash-irrelevante'),
    verify: jest.fn(),
  };
  const tokenService = {
    signAccessToken: jest.fn().mockReturnValue('access-token'),
    signRefreshToken: jest.fn().mockReturnValue('refresh-token'),
    accessTtlSeconds: 900,
    refreshTtlSeconds: jest.fn().mockReturnValue(604800),
  };

  function buildUseCase() {
    return new LoginUseCase(
      usuarioRepository as never,
      sessaoRepository as never,
      prisma as never,
      passwordService as never,
      tokenService as never,
      new PermissionResolverService(prisma as never),
    );
  }

  beforeEach(() => jest.clearAllMocks());

  it('retorna INVALID_CREDENTIALS quando o e-mail não existe (sem revelar isso)', async () => {
    usuarioRepository.buscarPorEmail.mockResolvedValue(null);
    passwordService.verify.mockResolvedValue(false);

    const result = await buildUseCase().execute(
      { email: 'inexistente@x.com', senha: 'qualquer12345', lembrarDeMim: false },
      {},
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INVALID_CREDENTIALS');
    // mesmo custo computacional aproximado — reafirma docs/api/02-autenticacao.md
    expect(passwordService.hash).toHaveBeenCalled();
  });

  it('retorna INVALID_CREDENTIALS quando a senha está errada', async () => {
    usuarioRepository.buscarPorEmail.mockResolvedValue({
      id: 'u1',
      email: 'x@x.com',
      senhaHash: 'hash',
      status: 'ATIVO',
    });
    passwordService.verify.mockResolvedValue(false);

    const result = await buildUseCase().execute(
      { email: 'x@x.com', senha: 'errada1234567', lembrarDeMim: false },
      {},
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBeInstanceOf(DomainError);
  });

  it('retorna ACCOUNT_LOCKED quando o usuário está bloqueado', async () => {
    usuarioRepository.buscarPorEmail.mockResolvedValue({
      id: 'u1',
      email: 'x@x.com',
      senhaHash: 'hash',
      status: 'BLOQUEADO',
    });
    passwordService.verify.mockResolvedValue(true);

    const result = await buildUseCase().execute(
      { email: 'x@x.com', senha: 'correta123456', lembrarDeMim: false },
      {},
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('ACCOUNT_LOCKED');
  });

  it('autentica com sucesso e retorna tokens + escritórios', async () => {
    usuarioRepository.buscarPorEmail.mockResolvedValue({
      id: 'u1',
      nome: 'Camila',
      email: 'camila@x.com',
      senhaHash: 'hash',
      status: 'ATIVO',
    });
    passwordService.verify.mockResolvedValue(true);
    prisma.listarMembrosAtivosDoUsuario.mockResolvedValue([
      {
        id: 'membro-1',
        escritorioId: 'escritorio-1',
        papelId: 'papel-1',
        papel: { nome: 'ADVOGADO' },
        escritorio: { nomeFantasia: 'Almeida Advogados' },
      },
    ]);

    const result = await buildUseCase().execute(
      { email: 'camila@x.com', senha: 'correta123456', lembrarDeMim: false },
      { ip: '127.0.0.1' },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.accessToken).toBe('access-token');
      expect(result.value.refreshToken).toBe('refresh-token');
      expect(result.value.escritorioAtivoId).toBe('escritorio-1');
      expect(result.value.escritorios).toEqual([
        { id: 'escritorio-1', nome: 'Almeida Advogados', papel: 'ADVOGADO' },
      ]);
    }
    expect(sessaoRepository.criar).toHaveBeenCalledTimes(1);
    expect(usuarioRepository.atualizarUltimoAcesso).toHaveBeenCalledWith('u1');
  });

  it('resolve NEGAR de PermissaoUsuario vencendo CONCEDER do papel', async () => {
    usuarioRepository.buscarPorEmail.mockResolvedValue({
      id: 'u1',
      nome: 'Camila',
      email: 'camila@x.com',
      senhaHash: 'hash',
      status: 'ATIVO',
    });
    passwordService.verify.mockResolvedValue(true);
    prisma.listarMembrosAtivosDoUsuario.mockResolvedValue([
      {
        id: 'membro-1',
        escritorioId: 'escritorio-1',
        papelId: 'papel-1',
        papel: { nome: 'ADVOGADO' },
        escritorio: { nomeFantasia: 'Almeida Advogados' },
      },
    ]);
    prisma.client.papelPermissao.findMany.mockResolvedValue([
      { permissao: { chave: 'case:delete' } },
    ]);
    prisma.client.permissaoUsuario.findMany.mockResolvedValue([
      { efeito: 'NEGAR', permissao: { chave: 'case:delete' } },
    ]);

    await buildUseCase().execute(
      { email: 'camila@x.com', senha: 'correta123456', lembrarDeMim: false },
      {},
    );

    const signedClaims = tokenService.signAccessToken.mock.calls[0][0];
    expect(signedClaims.permissions).not.toContain('case:delete');
  });
});
