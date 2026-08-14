# 05 — Autenticação

## 5.1 Decisão central: os dois tokens vivem só em cookie `httpOnly`

Reafirma o mecanismo já real no backend (`docs/backend-implementation/04-identity.md`,
`docs/api/02-autenticacao.md`): `access_token` (15 min) e `refresh_token`
(7 ou 30 dias) são cookies `httpOnly`, `Secure`, `SameSite=Lax`. **Nenhum
dos dois é lido por JavaScript em nenhum momento** — nem para inspeção, nem
para reenvio manual em header. O frontend não implementa um modo
"Bearer-em-memória" alternativo: como `app.quilombodev.com.br` e
`api.quilombodev.com.br` compartilham o mesmo site (mesmo eTLD+1), um
cookie `SameSite=Lax` já é enviado automaticamente em toda chamada
`fetch`/`EventSource` com `credentials: 'include'`/`withCredentials: true`,
inclusive cross-origin — não há necessidade de manter o access token em
memória JS para contornar isso. Isso simplifica o modelo de ameaça: XSS
não consegue exfiltrar um token que o JavaScript nunca vê.

**Nunca usar `localStorage`/`sessionStorage` para nenhum dos dois tokens.**

## 5.2 Onde validar sessão

- **Rápido (middleware):** existência do cookie `access_token`. Ausente →
  redireciona para `/login?next=<rota>` antes de renderizar qualquer
  Server Component protegido. Isso é uma checagem de presença, não de
  validade — o middleware não verifica assinatura JWT (evita duplicar
  lógica de verificação em dois lugares).
- **Real (toda chamada à API):** o backend valida assinatura, expiração e
  denylist do Redis em cada requisição. O frontend nunca decide
  "autenticado" por conta própria — só reage ao que a API responde.

## 5.3 Como carregar o usuário atual

`(app)/layout.tsx` (Server Component) faz `GET /me` usando o cookie já
presente no request Next.js recebido do browser, e hidrata o resultado na
chave `['me']` do TanStack Query (ver
[10-tanstack-query.md §10.7](10-tanstack-query.md)). Client Components
consomem via `useCurrentUser()`, nunca refazendo a chamada no primeiro
render (hidratação evita o "flash" de estado não-autenticado). `staleTime`
de `['me']` é longo (5 min) porque o dado muda pouco durante uma sessão —
invalidado explicitamente após troca de escritório, troca de senha e MFA.

## 5.4 Fluxos

| Fluxo | Endpoint | Comportamento no frontend |
|---|---|---|
| Login | `POST /auth/login` | `202 MFA_REQUIRED` → avança para etapa de código (mesma tela, não nova rota) com `mfaChallengeToken` em estado de componente (nunca em URL); sucesso → `invalidate(['me'])`, redireciona para `next` ou `/` |
| Registro | `POST /auth/register` | Sucesso → tela "verifique seu e-mail", **sem** login automático (verificação de e-mail é pré-requisito documentado, mesmo com o endpoint de verificação ainda pendente no backend — ver [31-decisions.md §31.1](31-decisions.md)) |
| Logout | `POST /auth/logout` | `queryClient.clear()`, fecha conexão SSE ativa, `BroadcastChannel` notifica outras abas, redireciona para `/login` |
| Refresh | `POST /auth/refresh` | Nunca chamado manualmente pela UI — só pelo interceptor 401 do cliente HTTP, ver §5.6 |
| Recuperação de senha | `POST /auth/password-recovery` | Sempre mostra a mesma mensagem de sucesso, exista ou não o e-mail (anti-enumeração, reafirma o próprio backend) |
| Redefinição | `POST /auth/password-reset` | Sucesso → redireciona para `/login` com mensagem, nunca loga automaticamente |
| Verificação de e-mail | — | Endpoint ainda não existe no backend (`31-decisions.md §31.1`) — tela pronta, chamada mockada via MSW até existir |
| OAuth | `GET /auth/google` (redirect completo, não fetch) | `/auth/callback/[provedor]` mostra spinner enquanto o backend processa e redireciona; erro do provedor mapeado para mensagem neutra |
| Troca de senha | `POST /me/password` | Sucesso → `queryClient.clear()` parcial (mantém `['me']`), pois o backend já revoga as outras sessões — usuário atual não precisa relogar, mas SSE é reaberto (sessionId mudou implicitamente do lado servidor para as outras sessões, não a atual) |
| Encerrar sessões | `DELETE /auth/sessions/:id`, `DELETE /auth/sessions` | Invalida `['auth','sessions']`; encerrar a **própria** sessão atual (raro, mas possível) força logout local imediato |

## 5.5 Proteção de rota e redirecionamento

Toda rota de `(app)` e `(onboarding)` passa pelo middleware (§4.4). O
parâmetro `next` preserva a rota original através do login
(`/login?next=/processos/abc123`) e é validado contra open redirect
(apenas paths relativos começando com `/`, nunca URL absoluta — reafirma
[25-security.md §25.3](25-security.md)).

## 5.6 Refresh transparente e prevenção de loop

O cliente HTTP central (ver [08-http-client.md §8.4](08-http-client.md))
intercepta toda resposta `401`:

1. Se `code === 'TOKEN_EXPIRED'` **e** a requisição ainda não foi retentada:
   chama `POST /auth/refresh` — usando uma **única Promise compartilhada**
   por vez (requisições concorrentes que falham com 401 ao mesmo tempo
   aguardam o mesmo refresh em vez de disparar N chamadas). Sucesso →
   retenta a requisição original **uma vez**; falha → trata como
   `SESSION_REVOKED` (item 2).
2. Se `code === 'SESSION_REVOKED'` (reuso de refresh detectado, sessão
   revogada por admin, ou o próprio refresh falhou): `queryClient.clear()`,
   fecha SSE, `BroadcastChannel` avisa outras abas, redireciona para
   `/login?reason=session-revoked` (mensagem: "Sua sessão expirou. Entre
   novamente para continuar." — reafirma `docs/ux/14-ux-writing.md`).
3. Uma requisição nunca é retentada mais de uma vez — a flag "já tentei
   refresh" viaja no próprio objeto de requisição interno do cliente HTTP,
   nunca em estado global, eliminando por construção qualquer loop
   infinito de 401 → refresh → 401.

## 5.7 Múltiplas sessões e múltiplas abas

- **Múltiplas sessões** (dispositivos diferentes): tela `/perfil/seguranca`
  lista via `GET /auth/sessions`; encerrar uma sessão remota é imediato do
  lado servidor (denylist Redis) — a aba correspondente só percebe na
  próxima requisição (não há push para "avisar" outra sessão fisicamente
  diferente, isso é aceitável e documentado).
- **Múltiplas abas do mesmo navegador:** como o cookie é compartilhado
  entre abas automaticamente, um refresh feito por uma aba já vale para as
  outras — o risco real é **cache client-side desatualizado** (aba B ainda
  mostra dado do escritório antigo depois que aba A trocou de escritório,
  ou aba B ainda mostra UI autenticada depois que aba A deslogou). Mitigado
  com `BroadcastChannel('quilombo-auth')`: eventos `logout` e
  `office-switched` publicados por qualquer aba disparam
  `queryClient.clear()` + redirecionamento nas demais.

## 5.8 MFA e OAuth — o que a UI assume

MFA (TOTP) e OAuth (Google/Microsoft) têm tela e fluxo desenhados aqui, mas
**nenhum dos dois tem endpoint implementado no backend hoje** — ver
[31-decisions.md §31.1](31-decisions.md). A implementação (Prompt 6B) constrói
a UI contra o contrato já definido em `docs/api/02-autenticacao.md §2.5-2.6`
e mocka via MSW até os endpoints reais existirem; a troca de mock para real
não deve exigir mudança de componente, só do handler MSW correspondente.

## 5.9 O que este documento não inventa

Nenhum endpoint além dos listados em
[`../api/04-identity.md`](../api/04-identity.md) é assumido. Nenhuma
lógica de verificação de assinatura JWT roda no frontend — isso é,
deliberadamente, responsabilidade exclusiva do backend.

---

**Anterior:** [04-app-router.md](04-app-router.md) · **Próximo:** [06-autorizacao.md](06-autorizacao.md)
