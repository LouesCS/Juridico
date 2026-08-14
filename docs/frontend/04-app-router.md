# 04 — App Router

## 4.1 Route groups

`(public)` · `(onboarding)` · `(app)` — nomes sem acento no filesystem
(`public`, `onboarding`, `app`) por segurança de tooling, conteúdo em
português. Cada grupo tem seu próprio `layout.tsx`; não afetam a URL.

## 4.2 Layouts

| Layout | Escopo | Conteúdo |
|---|---|---|
| `app/layout.tsx` (root) | Toda a aplicação | `<html>`, fontes (`next/font`), `ThemeProvider`, `QueryProvider`, toaster global |
| `(public)/layout.tsx` | Login, registro, recuperação | Card centralizado, sem Sidebar/Topbar |
| `(onboarding)/layout.tsx` | Onboarding | Barra de progresso, sem Sidebar completa |
| `(app)/layout.tsx` | Toda área autenticada | AppShell (Sidebar + Topbar + `SseProvider` + `PermissionProvider`) — resolve sessão **antes** de renderizar filhos |
| `(app)/processos/[id]/layout.tsx` | Detalhe do processo | Header fixo (título, status, CNJ, responsável, ações) + Tabs — persiste entre troca de aba (reafirma `docs/ux/06-processos.md §6.15`: "header nunca desaparece na troca de aba") |

## 4.3 Server Component vs. Client Component — por rota

Regra geral em [01-arquitetura.md §1.6](01-arquitetura.md). Aplicação
concreta:

- **`page.tsx` de listagem** (processos, documentos, clientes): Server
  Component fazendo a leitura inicial (hidrata o TanStack Query — ver
  [10-tanstack-query.md §10.7](10-tanstack-query.md)); a tabela/filtros em
  si são Client Component (interação, ordenação, seleção).
- **`page.tsx` de formulário** (novo processo, novo cliente, editar):
  Client Component quase inteiro — React Hook Form exige estado no
  cliente.
- **Header do processo** (`layout.tsx`): Server Component para o dado
  (título, status, CNJ), Client Component apenas para os botões de ação e
  o menu "⋮".
- **Command Palette, drawers, toasts:** sempre Client Component (estado de
  UI, atalhos de teclado, `EventSource`).

## 4.4 Middleware

`src/middleware.ts` roda em toda rota de `(app)` e `(onboarding)`:

1. Lê o cookie `access_token`; ausente/expirado → redireciona para
   `/login?next=<rota>`.
2. Gera/propaga `X-Correlation-Id` (client-side origin, reafirma
   `docs/api/01-convencoes.md §1.10`) — anexado como header em toda
   chamada subsequente feita a partir dessa navegação.
3. **Não** decide autorização fina (permissão por recurso) — isso é
   responsabilidade do backend + `PermissionGate` em componente (ver
   [06-autorizacao.md](06-autorizacao.md)). O middleware só resolve
   "autenticado ou não", nunca "pode ver este processo específico".
4. Redireciona `/onboarding/*` para `/` se o escritório já não está em
   `TRIAL`, e vice-versa.

Middleware **não** faz refresh de token (side effect de escrita não cabe
em middleware do Next.js de forma segura/idempotente) — refresh é
responsabilidade do cliente HTTP, ver
[08-http-client.md §8.4](08-http-client.md).

## 4.5 Route Handlers (`app/api/`) — lista fechada, não um padrão genérico

Diferente de uma BFF tradicional, o Quilombo Dev **não tem segredo para
esconder** (o backend já é a autoridade, cookie httpOnly já protege o
token). Route Handlers existem só onde o browser genuinamente não
consegue fazer a chamada direta:

| Route Handler | Por quê existe |
|---|---|
| `app/api/sse/notifications/route.ts` | Fallback opcional para quando a conexão direta `EventSource` cross-origin-mesmo-site falha (rede corporativa, CSP mais restritiva do cliente do escritório) — proxeia o stream via `ReadableStream`, repassando o cookie que o próprio Next.js já tem no request. **Não é o caminho padrão** — ver [20-notifications-sse.md §20.3](20-notifications-sse.md) para quando este fallback é acionado. |
| `app/auth/callback/[provedor]` (page, não route handler) | Troca de `code` OAuth por sessão é feita direto pelo backend (`GET /v1/auth/google/callback`); a página Next.js só existe para exibir estado de carregamento enquanto o backend processa o redirect final |

Nenhum outro endpoint precisa de Route Handler — toda leitura/escrita de
domínio vai direto do Client/Server Component para a API NestJS.

## 4.6 Server Actions

Usadas para escritas simples sem necessidade de estado otimista
client-side complexo (ex.: marcar prazo concluído a partir de um link em
e-mail, ações de formulário que não precisam de feedback de progresso
granular). A maioria das escritas de domínio, porém, usa mutation do
TanStack Query em vez de Server Action — porque a maior parte das telas
já é Client Component (interatividade) e precisa de invalidação de cache
client-side de qualquer forma; Server Action forçaria um segundo caminho
de invalidação. Regra: **Server Action só quando a página inteira já é
majoritariamente Server Component** (ex.: aceitar convite em
`/convite/[token]`).

## 4.7 Metadata, navegação, breadcrumbs

- `generateMetadata` por rota para título de aba (ex.: "Ação Trabalhista —
  Cliente X · Quilombo Dev"), nunca UUID no título.
- Breadcrumb component lê o segmento atual via `usePathname` combinado com
  um mapa de título carregado pela própria página (o processo já buscou
  seu `titulo`; o breadcrumb não faz uma segunda chamada) — reafirma
  `docs/ux/04-navigation.md §4.8` (segmento mostra o título, nunca CNJ/UUID).

## 4.8 `loading.tsx`, `error.tsx`, `not-found.tsx`

- `loading.tsx` por rota de listagem/detalhe — Suspense boundary do
  próprio Next.js, skeleton com a forma real do conteúdo (nunca um
  spinner genérico).
- `error.tsx` por rota — recuperável, botão "Tentar novamente"
  (`reset()`), mostra `correlationId` — reafirma
  [23-errors.md](23-errors.md).
- `global-error.tsx` — falha catastrófica (erro no próprio root layout),
  única tela sem Sidebar/Topbar disponível nesse caso.
- `not-found.tsx` — usado tanto para rota inexistente quanto para
  qualquer recurso sem acesso (404 de segredo de justiça/confidencialidade
  reaproveita esta mesma tela, nunca uma variante que sugira "existe mas
  você não pode ver").

## 4.9 Modais por rota — decisão deliberada de não usar intercepting routes

Avaliado e **descartado nesta etapa**: intercepting/parallel routes para
tornar modais como "Novo Cliente rápido" linkáveis por URL própria. A
especificação de UX (`docs/ux/04-navigation.md §4.3`) já define esses
modais como estado client-side efêmero (fecham com Esc/click-outside,
sem necessidade de deep link) — introduzir intercepting routes adicionaria
complexidade de roteamento sem um requisito de produto que a justifique.
**Exceção já contemplada:** o drawer de notificação individual aceita
`?notificationId=` como query param simples (não uma rota interceptada),
suficiente para o único caso real de deep link (link de e-mail/push).
Reavaliar apenas se o produto pedir explicitamente compartilhar/favoritar
o estado de um modal específico.

---

**Anterior:** [03-rotas.md](03-rotas.md) · **Próximo:** [05-autenticacao.md](05-autenticacao.md)
