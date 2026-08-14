# 01 — Bootstrap

## Implementado e verificado

- `apps/web/` — Next.js 15.5.22, React 19.2.8, TypeScript 5.9.3 (strict),
  Tailwind CSS 4.3.3, ESLint 9 (flat config) + `eslint-config-next` +
  `eslint-config-prettier`, Prettier + `prettier-plugin-tailwindcss`.
- `src/config/env.ts` — validação de env com Zod, falha o boot com
  mensagem explícita se `NEXT_PUBLIC_API_URL` estiver ausente/inválida.
- `next.config.ts` — headers de segurança (`Content-Security-Policy` sem
  `unsafe-inline`/`unsafe-eval` para script, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `Permissions-Policy`), `output: 'standalone'` (para o Dockerfile).
- `src/app/layout.tsx` — fontes via `next/font/google` (Inter, Source
  Serif 4, JetBrains Mono, self-hosted), `metadata`/`viewport`, skip link
  "Ir para o conteúdo" como primeiro elemento tabulável.
- `src/app/error.tsx`, `global-error.tsx`, `not-found.tsx`, `loading.tsx`
  — os quatro arquivos especiais do App Router, reafirmando
  `docs/frontend/04-app-router.md §4.8`.
- `.env.example`/`.env.local` — `NEXT_PUBLIC_API_URL`,
  `NEXT_PUBLIC_STORAGE_URL`, `NEXT_PUBLIC_API_MOCKING`.

## Verificado de fato

`npm install` (574 pacotes), `npx tsc --noEmit` (0 erros), `npx eslint`
(0 erros), `npx next build` (sucesso), `next dev` real + `curl` (HTML
correto nas 4 rotas públicas + redirecionamento correto na rota
protegida).

## Não implementado / pendente

- Suporte a idioma (i18n) — preparado só estruturalmente (`lang="pt-BR"`
  fixo no `<html>`), sem seletor de idioma real (fora do MVP documentado
  em `docs/00-resumo-executivo.md`).
- Timezone — não há seletor ainda (parte do módulo Users/Profile, não
  implementado nesta rodada).

---

**Anterior:** [00-status.md](00-status.md) · **Próximo:** [02-design-system.md](02-design-system.md)
