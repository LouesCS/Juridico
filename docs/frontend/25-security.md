# 25 — Segurança Frontend

## 25.1 XSS e sanitização

React já escapa por padrão todo texto renderizado via JSX — o risco real
concentra-se nos poucos pontos que fogem disso:

- **Nenhum uso de `dangerouslySetInnerHTML`** para conteúdo vindo do
  usuário ou de terceiro (comentários, descrição de processo, nome de
  documento). O único candidato — destaque de trecho de busca
  (`docs/ux/09-busca-global.md`, `<mark>` ao redor do termo encontrado) —
  usa um componente de highlight que opera sobre texto já sanitizado
  (`react` renderiza os fragmentos como nós de texto normais, nunca HTML
  bruto vindo da API).
- **Preview de documento (PDF/imagem/Office)** roda em `<iframe
  sandbox="allow-scripts allow-same-origin">` apontando para a URL
  assinada do storage — isolado do documento principal da aplicação
  (nenhum script do conteúdo do arquivo tem acesso ao DOM/cookies da
  aplicação).

## 25.2 CSP

`Content-Security-Policy` definida em `next.config.ts` (headers), sem
`unsafe-inline`/`unsafe-eval` para script — Tailwind é compilado
estaticamente (sem CSS-in-JS runtime que exigisse `style-src
unsafe-inline`); `connect-src` restrito ao domínio da própria API e ao
domínio de storage assinado; `frame-src` restrito ao domínio de storage
(para o preview em iframe do §25.1).

## 25.3 Open redirect

O parâmetro `next` do fluxo de login (§5.5) é validado contra uma
allowlist de formato: **apenas path relativo começando com `/`**, nunca
URL absoluta nem `//` (protocol-relative) — rejeitado, cai para `/` por
padrão. Mesma regra para qualquer outro parâmetro de redirecionamento que
vier a existir (ex.: retorno de OAuth).

## 25.4 Tokens — nunca no navegador de forma inspecionável

Reafirma [05-autenticacao.md §5.1](05-autenticacao.md): `httpOnly` em
ambos os cookies, nenhum em `localStorage`/`sessionStorage`/variável JS
de longa duração. `mfaChallengeToken` (curto, 5 min) é a única exceção
que passa por estado de componente em memória — nunca persistido, nunca
logado.

## 25.5 Dado jurídico sensível — não persistir sem necessidade

Nenhum conteúdo de processo, documento, cliente ou comentário é escrito em
`localStorage`/`sessionStorage`/`IndexedDB` — inclusive o autosave de
rascunho de formulário longo (§12.4) persiste contra o **backend**, não
localmente, justamente para não deixar dado jurídico em disco do
navegador de forma não auditável. Exceções permitidas em
`localStorage` (§11.2/§21.4): preferências visuais, IDs+títulos de itens
recentes da busca (já visíveis na sessão, não conteúdo sensível), termos
de busca digitados.

## 25.6 Downloads seguros

URL assinada de curta duração, gerada a cada clique (nunca reaproveitada
de estado antigo) — reafirma
[18-documents-folders.md §18.3](18-documents-folders.md). Nenhum link de
download é montado manualmente a partir de um `documentoId` + template de
URL — sempre vem pronto da resposta da API.

## 25.7 Não logar dado sensível

[29-observability.md §29.4](29-observability.md) define a lista exata do
que nunca é enviado a uma ferramenta de telemetria — nome de
cliente/processo, conteúdo de documento/comentário, CPF/CNPJ, qualquer
`fieldErrors.message` que ecoe valor digitado. O cliente HTTP (§8.6) e o
error boundary global nunca incluem o corpo da requisição/resposta em
nenhum log, mesmo em desenvolvimento (para que o hábito de dev não vire
hábito de produção por descuido).

## 25.8 Clickjacking

`X-Frame-Options: DENY` / `frame-ancestors 'none'` no CSP — a aplicação
nunca é legitimamente embutida em iframe de terceiro.

## 25.9 CSRF

Mitigado pela combinação já decidida no backend
(`docs/api/02-autenticacao.md §2.9`): cookies `SameSite=Lax` + toda
mutação de estado exige método não-`GET` (nenhuma escrita acontece via
link/imagem). O frontend não implementa um token CSRF adicional próprio —
seria redundante com a proteção que `SameSite=Lax` já oferece para este
modelo de cookie, e o backend não exige um header CSRF customizado hoje;
reavaliar apenas se o backend migrar para `SameSite=None` (cross-site de
verdade) no futuro.

## 25.10 Limpeza de cache no logout

Coberto em [05-autenticacao.md §5.4](05-autenticacao.md) — `queryClient.clear()`
+ fechamento de SSE + stores voláteis resetados. Preferências
não-sensíveis (tema, densidade) **não** são limpas no logout — são
propriedade do dispositivo/navegador, não da sessão.

---

**Anterior:** [24-accessibility.md](24-accessibility.md) · **Próximo:** [26-performance.md](26-performance.md)
