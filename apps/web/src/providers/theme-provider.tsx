'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({
  children,
  nonce,
}: {
  children: React.ReactNode;
  /**
   * `next-themes` injeta um script inline (anti-flash de tema) antes da
   * hidratação — em produção a CSP não tem `unsafe-inline` para script
   * (ver `lib/security/csp.ts`), então esse script só executa se levar o
   * mesmo nonce que o header `Content-Security-Policy` autorizou.
   */
  nonce?: string;
}) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      nonce={nonce}
    >
      {children}
    </NextThemesProvider>
  );
}
