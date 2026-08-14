import { withRetry } from './ai-retry';

describe('withRetry', () => {
  it('retorna o resultado na primeira tentativa quando não há erro', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { retries: 2, backoffMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('tenta novamente após falha e eventualmente resolve', async () => {
    const fn = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok');
    const result = await withRetry(fn, { retries: 2, backoffMs: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('lança o último erro após esgotar as tentativas', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('sempre falha'));
    await expect(withRetry(fn, { retries: 2, backoffMs: 1 })).rejects.toThrow('sempre falha');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('lança GENERATION_TIMEOUT quando a função demora mais que timeoutMs', async () => {
    const fn = () => new Promise((resolve) => setTimeout(resolve, 100));
    await expect(withRetry(fn, { retries: 0, timeoutMs: 10 })).rejects.toMatchObject({
      code: 'GENERATION_TIMEOUT',
    });
  });
});
