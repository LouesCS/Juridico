'use client';

import * as React from 'react';

/**
 * Efeito de "texto sendo construído" (Sprint 11 §"STREAMING") sobre o
 * `conteudo` FINAL já persistido — não é streaming real de token por token
 * (o backend expõe SSE genuíno em `GET /ai-summaries/:id/stream`, mas
 * `EventSource` não é testável neste ambiente jsdom/MSW; ver
 * `features/ai/api/queries.ts`). Reproduz a percepção de "vendo escrever"
 * sem depender de conexão persistente. Só anima na primeira renderização de
 * um `conteudo` novo — reabrir uma tela com um resumo já pronto mostra o
 * texto completo de uma vez (mesmo racional de "reconectar a uma stream já
 * concluída retorna o resultado imediato", docs/api/14-ai.md §14.3).
 */
export function TypewriterText({ text, animate }: { text: string; animate: boolean }) {
  const [visibleChars, setVisibleChars] = React.useState(animate ? 0 : text.length);

  React.useEffect(() => {
    if (!animate) {
      setVisibleChars(text.length);
      return;
    }
    setVisibleChars(0);
    const CHARS_PER_TICK = 6;
    const interval = setInterval(() => {
      setVisibleChars((current) => {
        const next = current + CHARS_PER_TICK;
        if (next >= text.length) {
          clearInterval(interval);
          return text.length;
        }
        return next;
      });
    }, 12);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <p className="text-sm whitespace-pre-wrap">
      {text.slice(0, visibleChars)}
      {visibleChars < text.length && (
        <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-primary align-middle" aria-hidden="true" />
      )}
    </p>
  );
}
