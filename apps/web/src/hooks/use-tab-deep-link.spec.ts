import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTabDeepLink } from './use-tab-deep-link';

const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  usePathname: () => '/clientes/1',
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams,
}));

describe('useTabDeepLink', () => {
  beforeEach(() => {
    replace.mockClear();
    searchParams = new URLSearchParams();
  });

  it('usa a aba da URL quando presente e válida', () => {
    searchParams = new URLSearchParams('tab=processos');
    const { result } = renderHook(() => useTabDeepLink(new Set(['resumo', 'processos']), 'resumo'));

    expect(result.current[0]).toBe('processos');
  });

  it('cai no padrão quando a URL não tem uma aba (ou tem uma aba inválida)', () => {
    searchParams = new URLSearchParams('tab=nao-existe');
    const { result } = renderHook(() => useTabDeepLink(new Set(['resumo', 'processos']), 'resumo'));

    expect(result.current[0]).toBe('resumo');
  });

  it('setTab atualiza o estado local e substitui a URL (sem empilhar histórico)', () => {
    const { result } = renderHook(() => useTabDeepLink(new Set(['resumo', 'processos']), 'resumo'));

    act(() => result.current[1]('processos'));

    expect(result.current[0]).toBe('processos');
    expect(replace).toHaveBeenCalledWith('/clientes/1?tab=processos', { scroll: false });
  });
});
