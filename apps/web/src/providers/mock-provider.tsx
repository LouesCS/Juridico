'use client';

import * as React from 'react';
import { env } from '@/config/env';

/**
 * Liga o MSW no navegador só quando `NEXT_PUBLIC_API_MOCKING=enabled` —
 * nunca em produção (reafirma docs/frontend/28-mocks.md §28.1). Import
 * dinâmico evita que o worker do MSW entre no bundle de produção mesmo
 * por engano.
 *
 * Não bloqueia a renderização dos filhos enquanto o worker inicia — fazer
 * isso via estado (`ready=false` até o worker responder) quebra a
 * renderização estática/SSR (o valor inicial do estado, calculado também
 * durante o SSR de um Client Component, teria que ser `false` sempre que
 * mocking está ligado, ocultando a página inteira até a hidratação rodar
 * o efeito). Nesta rodada nenhum handler de módulo mock-only existe ainda
 * (`mocks/browser.ts` está vazio) — o risco de uma requisição escapar do
 * worker nos primeiros milissegundos é irrelevante até isso mudar;
 * reavaliar quando os primeiros handlers de desenvolvimento existirem.
 */
export function MockProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (env.NEXT_PUBLIC_API_MOCKING !== 'enabled') return;
    import('@/mocks/browser').then(({ worker }) => worker.start({ onUnhandledRequest: 'bypass' }));
  }, []);

  return <>{children}</>;
}
