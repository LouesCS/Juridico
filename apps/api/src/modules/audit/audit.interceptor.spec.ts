import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, Observable, of, throwError } from 'rxjs';
import { DomainError } from '../../shared/domain/result';
import { AuditInterceptor } from './audit.interceptor';
import { AuditMetadata } from './audit-action.decorator';
import { AuditService } from './application/audit.service';

function buildContext(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function buildHandler(observable: Observable<unknown>): CallHandler {
  return { handle: () => observable } as CallHandler;
}

function buildRequest(overrides: Record<string, unknown> = {}) {
  return {
    ip: '127.0.0.1',
    header: () => 'jest-test-agent',
    correlationId: 'corr-1',
    requestId: 'req-1',
    params: {},
    query: {},
    body: {},
    authUser: undefined,
    ...overrides,
  };
}

describe('AuditInterceptor', () => {
  function buildInterceptor(metadata?: AuditMetadata) {
    const reflector = { get: jest.fn().mockReturnValue(metadata) } as unknown as Reflector;
    const registrar = jest.fn().mockResolvedValue(undefined);
    const auditService = { registrar } as unknown as AuditService;
    return { interceptor: new AuditInterceptor(reflector, auditService), registrar };
  }

  it('passa direto (sem auditar) quando a rota não tem @Audit', async () => {
    const { interceptor, registrar } = buildInterceptor(undefined);
    const context = buildContext(buildRequest());
    const result = await lastValueFrom(
      interceptor.intercept(context, buildHandler(of({ ok: true }))),
    );

    expect(result).toEqual({ ok: true });
    expect(registrar).not.toHaveBeenCalled();
  });

  it('registra SUCESSO com dados sanitizados quando o handler responde', async () => {
    const { interceptor, registrar } = buildInterceptor({ acao: 'LOGIN', recursoTipo: 'SESSAO' });
    const request = buildRequest({
      authUser: { usuarioId: 'user-1', escritorioId: 'office-1', sessionId: 'sess-1' },
    });
    const context = buildContext(request);

    await lastValueFrom(
      interceptor.intercept(context, buildHandler(of({ usuario: { id: 'user-1' }, senha: 'x' }))),
    );

    expect(registrar).toHaveBeenCalledTimes(1);
    const entry = registrar.mock.calls[0][0];
    expect(entry.acao).toBe('LOGIN');
    expect(entry.resultado).toBe('SUCESSO');
    expect(entry.atorId).toBe('user-1');
    expect(entry.escritorioId).toBe('office-1');
    expect(entry.dadosDepois.senha).toBe('x'); // sanitização acontece no AuditService, não no interceptor
  });

  it('registra FALHA e repropaga o erro quando o handler lança DomainError', async () => {
    const { interceptor, registrar } = buildInterceptor({ acao: 'LOGIN', recursoTipo: 'SESSAO' });
    const context = buildContext(buildRequest());
    const error = new DomainError('INVALID_CREDENTIALS', 'Credenciais inválidas.');

    await expect(
      lastValueFrom(interceptor.intercept(context, buildHandler(throwError(() => error)))),
    ).rejects.toThrow(DomainError);

    expect(registrar).toHaveBeenCalledTimes(1);
    const entry = registrar.mock.calls[0][0];
    expect(entry.resultado).toBe('FALHA');
    expect(entry.motivo).toBe('Credenciais inválidas.');
  });

  it('registra NEGADO quando o erro é FORBIDDEN', async () => {
    const { interceptor, registrar } = buildInterceptor({
      acao: 'REMOVE_MEMBER',
      recursoTipo: 'MEMBRO',
    });
    const context = buildContext(buildRequest({ params: { id: 'member-1' } }));
    const error = new DomainError('FORBIDDEN', 'Ação não permitida.');

    await expect(
      lastValueFrom(interceptor.intercept(context, buildHandler(throwError(() => error)))),
    ).rejects.toThrow(DomainError);

    const entry = registrar.mock.calls[0][0];
    expect(entry.resultado).toBe('NEGADO');
    expect(entry.recursoId).toBe('member-1');
  });

  it('usa o motivo de meta.motivo quando presente (ex.: reuso de refresh token)', async () => {
    const { interceptor, registrar } = buildInterceptor({ acao: 'REFRESH', recursoTipo: 'SESSAO' });
    const context = buildContext(buildRequest());
    const error = new DomainError('SESSION_REVOKED', 'Sessão revogada por segurança.', {
      motivo: 'REUSO_DETECTADO',
    });

    await expect(
      lastValueFrom(interceptor.intercept(context, buildHandler(throwError(() => error)))),
    ).rejects.toThrow(DomainError);

    const entry = registrar.mock.calls[0][0];
    expect(entry.motivo).toBe('REUSO_DETECTADO');
  });

  it('durante uma simulação, audita o ATOR REAL (nunca o simulado) e registra os dois ids (Permission Engine, Prompt 12)', async () => {
    const { interceptor, registrar } = buildInterceptor({
      acao: 'ARCHIVE_CLIENT',
      recursoTipo: 'CLIENTE',
    });
    const request = buildRequest({
      authUser: {
        usuarioId: 'usuario-simulado', // nunca deveria aparecer como atorId
        membroId: 'membro-estagiario',
        escritorioId: 'office-1',
        sessionId: 'sess-1',
        simulacao: { realUsuarioId: 'owner-real', realMembroId: 'membro-owner' },
      },
    });
    const context = buildContext(request);

    await lastValueFrom(interceptor.intercept(context, buildHandler(of({ ok: true }))));

    const entry = registrar.mock.calls[0][0];
    expect(entry.atorId).toBe('owner-real');
    expect(entry.metadados.simulacao).toEqual({
      realMembroId: 'membro-owner',
      membroSimuladoId: 'membro-estagiario',
    });
  });
});
