'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Aba controlada + sincronizada com `?tab=` na URL — extraído na Prompt 11
 * (Reorganização da Navegação) a partir do padrão `?tab=` que já existia em
 * `legal-case-detail-page.tsx` (Sprint 10, só lido uma vez via
 * `Tabs defaultValue`). Virou um hook porque o painel "Relacionados" agora
 * linka para abas da própria página (`/clientes/:id?tab=processos`
 * enquanto já se está em `/clientes/:id`) — um `Link` para a mesma rota não
 * remonta o componente, então `defaultValue` sozinho nunca reagiria; o
 * `useEffect` abaixo observa `searchParams` e resolve isso, além de manter
 * o clique manual em uma aba também refletido na URL (voltar/compartilhar
 * o link abre na aba certa).
 */
export function useTabDeepLink(validTabs: Set<string>, defaultTab: string): readonly [string, (next: string) => void] {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTabState] = React.useState(() => {
    const fromUrl = searchParams.get('tab');
    return fromUrl && validTabs.has(fromUrl) ? fromUrl : defaultTab;
  });

  React.useEffect(() => {
    const fromUrl = searchParams.get('tab');
    if (!fromUrl || !validTabs.has(fromUrl)) return;
    setTabState((current) => (fromUrl === current ? current : fromUrl));
  }, [searchParams, validTabs]);

  function setTab(next: string) {
    setTabState(next);
    router.replace(`${pathname}?tab=${next}`, { scroll: false });
  }

  return [tab, setTab] as const;
}
