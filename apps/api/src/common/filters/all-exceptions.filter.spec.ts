import { ArgumentsHost } from '@nestjs/common';
import { z } from 'zod';
import { DomainError } from '../../shared/domain/result';
import { AllExceptionsFilter } from './all-exceptions.filter';

function buildHost(path = '/api/v1/legal-cases') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const request = { path, correlationId: 'corr-123' };

  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  it('mapeia DomainError para RFC 9457 com timestamp como extensão', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = buildHost();

    filter.catch(new DomainError('DUPLICATE_CNJ', 'Já existe um processo com este número.'), host);

    expect(status).toHaveBeenCalledWith(409);
    const body = json.mock.calls[0][0];
    expect(body.code).toBe('DUPLICATE_CNJ');
    expect(body.detail).toBe('Já existe um processo com este número.');
    expect(body.correlationId).toBe('corr-123');
    expect(body.instance).toBe('/api/v1/legal-cases');
    expect(typeof body.timestamp).toBe('string');
    expect(body.type).toContain('duplicate-cnj');
  });

  it('mapeia ZodError para 422 com fieldErrors', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = buildHost();

    const schema = z.object({ email: z.string().email() });
    const parseResult = schema.safeParse({ email: 'não-é-email' });
    expect(parseResult.success).toBe(false);

    if (!parseResult.success) {
      filter.catch(parseResult.error, host);
    }

    expect(status).toHaveBeenCalledWith(422);
    const body = json.mock.calls[0][0];
    expect(body.code).toBe('MALFORMED_REQUEST');
    expect(body.fieldErrors.length).toBeGreaterThan(0);
    expect(body.fieldErrors[0].field).toBe('email');
  });

  it('nunca vaza detalhe interno para exceção não mapeada', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = buildHost();

    filter.catch(new Error('detalhe interno sensível: SELECT * FROM usuarios'), host);

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0];
    expect(body.code).toBe('INTERNAL_ERROR');
    expect(body.detail).not.toContain('SELECT');
    expect(body.detail).not.toContain('sensível');
  });
});
