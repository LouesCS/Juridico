# 19 — Decisões, Conflitos e Riscos desta Etapa

## 19.1 Bug real: `Slot`/`asChild` do `Button` quebrava o build

`Button` injetava `{loading && <Loader2 />}{children}` como dois filhos
mesmo quando `asChild=true` (renderiza `Slot` do Radix). `Slot` exige
exatamente um único elemento filho — `next build` falhava com "Slot
failed to slot onto its children" ao prerender qualquer página que
compartilhasse `not-found.tsx` (única rota usando `<Button asChild>`
nesta rodada, mas o erro se propagava para outras páginas durante a
geração estática porque o 404 global é gerado como parte do mesmo
processo). Isolado removendo temporariamente `not-found.tsx` e comparando
o build (falhava com o arquivo, passava sem ele). Corrigido separando o
branch `asChild` (retorna `<Slot>{children}</Slot>` sem o ícone) do
branch normal (`<button>` com ícone condicional) em
`components/ui/button.tsx`. Este é exatamente o tipo de erro que só um
`next build` real pega — nenhum teste unitário/typecheck o detectaria,
reafirma a mesma lição já registrada em
`docs/backend-implementation/19-decisions.md §19.5` (testes reais pegam
bug que revisão de código não pegaria sozinha).

## 19.2 Tipos de DTO escritos à mão — pendência explícita, não decisão definitiva

`docs/frontend/09-openapi.md §9.1` decidiu gerar tipos via
`openapi-typescript` a partir do OpenAPI real do backend. Nesta rodada
isso não é executável: gerar o `openapi.json` exige o processo NestJS de
pé (`NestFactory.create` já dispara o ciclo de vida de todos os
providers, incluindo `PrismaService.onModuleInit` → `$connect()`), e não
há Postgres neste ambiente — mesma limitação já documentada para o
backend. Resolução aplicada: tipos manuais em
`features/auth/api/auth.api.ts`, espelhando campo a campo os DTOs reais
das use cases do backend (não inventados) — explicitamente marcado como
solução interina no próprio arquivo e em
[03-http-openapi.md](03-http-openapi.md), a ser substituído assim que o
pipeline de geração puder rodar contra um backend real.

## 19.3 `authKeys.me()` não é escopado por `officeId` — exceção já prevista

`docs/frontend/10-tanstack-query.md §10.2` exige toda chave escopada por
`officeId`. `['me']` é a exceção deliberada (já antecipada na própria
arquitetura): é o bootstrap que resolve qual é o escritório ativo, então
não pode depender de um `officeId` que ainda não existe. Toda chave de
qualquer outro módulo, quando implementado, deve seguir
`['office', officeId, ...]` sem exceção — registrado para não ser
confundido com um esquecimento futuro.

## 19.4 `zod` divergente entre backend (3.24.1) e frontend (3.25.76)

`@hookform/resolvers@5.5.7` (mais recente compatível com o restante do
stack de formulário escolhido) exige `zod ^3.25.0 || ^4.0.0`, incompatível
com a versão já fixada em `apps/api/package.json` (`^3.24.1`). Como os
dois apps têm `package.json`/`node_modules` independentes (sem monorepo,
decisão já registrada em `docs/frontend/31-decisions.md §31.4`), a
divergência de versão não tem efeito prático — cada app resolve Zod
isoladamente. Resolvido fixando `zod@3.25.76` (ainda major 3, mesma API)
só em `apps/web/package.json`.

## 19.5 Risco: `NEXT_PUBLIC_API_MOCKING=enabled` bloqueando SSR — corrigido antes de virar bug em produção

Primeira versão de `MockProvider` gate­ava a renderização dos filhos atrás
de um estado `ready` que começava `false` sempre que mocking estivesse
ligado — como esse estado é computado também durante a passagen de SSR de
um Client Component, e o `useEffect` que o resolveria não roda no
servidor, a página inteira renderizaria `null` até a hidratação no
cliente rodar o efeito (visível como "flash em branco" e potencial
mismatch de hidratação). Corrigido removendo o gate: o worker do MSW
inicia em background sem bloquear a árvore de componentes — aceitável
porque `mocks/browser.ts` está vazio nesta rodada (nenhum handler de
módulo mock-only existe ainda); reavaliar quando os primeiros handlers de
desenvolvimento existirem (Clients/Legal Cases, quando retomados).

## 19.6 Riscos herdados do backend

Mesmos riscos já registrados em `docs/backend-implementation/19-decisions.md`
e `00-status.md`: RLS não aplicada, sem Postgres/Redis/Docker no
ambiente — nenhuma integração real (frontend↔backend↔banco) é
verificável ponta a ponta até isso mudar.

## 19.7 `CurrentUserDTO` corrigido — contrato inventado no Prompt 6B nunca validado

Ao implementar o Office Context (Prompt 6C), que depende diretamente da
forma de `GET /me` para popular o escritório ativo, a leitura de
`apps/api/src/modules/identity/application/use-cases/get-current-user.use-case.ts`
revelou que o tipo escrito no Prompt 6B (`{ usuarioId, nome, email,
escritorioId, membroId, sessionId, roles, permissions }`, plano) não
correspondia ao retorno real do use case (`{ usuario: {...}, membro: { id,
papel, permissions }, escritorio: { id, nome, slug } }`, aninhado) — um
erro que passou por `tsc`/`eslint`/`vitest`/`next build` no Prompt 6B
porque nada ali chamava `GET /me` contra um contrato de verdade nem
comparava a forma retornada com o use case real; só exercitava o campo
`.nome`/`.email` que por coincidência existiam em ambos os formatos sob
nomes diferentes (`nome` direto vs. `usuario.nome`), então o TypeScript
não tinha como flagrar a divergência sem o tipo já estar errado dos dois
lados. Corrigido em `auth.api.ts`, no handler MSW de `/me`, e nos
consumidores (`(app)/page.tsx`, `UserMenu`). Lição: ao construir um DTO
manual "espelhando" um contrato real, ler o código-fonte do lado que
gera a resposta é obrigatório antes de escrever o tipo, não opcional —
não basta a intenção documentada de "espelhar campo a campo".

## 19.8 `GET /me` não retorna a lista de escritórios do usuário — lacuna real de backend

`docs/frontend/07-office-context.md §7.1` presume que `GET /me` retorna
`escritorioAtivoId` e a lista de escritórios do usuário. O use case real
só retorna o escritório **ativo**; a lista completa (`escritorios[]`) só
existe na resposta de `POST /auth/login`. Não há endpoint de backend para
listar os escritórios/memberships de um usuário fora do momento do
login — confirmado varrendo todos os `@Controller`/`@Get`/`@Post` reais
do backend (`identity`, `offices`, `memberships`, `health`); `GET /office`
retorna só o escritório ativo, `GET /members` lista membros do escritório
ativo (não os escritórios do usuário).

Resolução aplicada, sem inventar dado: `stores/office.store.ts` guarda a
lista completa só quando ela chega (login desta aba); `GET /me`
(`OfficeProvider`) hidrata só o escritório ativo, adicionando-o à lista
local se ainda não estiver lá (caso "reload sem login nesta aba" — a
lista fica com um único item, e `WorkspaceSwitcher` degrada corretamente
para o comportamento de "um único escritório" já previsto em §7.6, em vez
de fingir que não existem outros escritórios ou inventar uma chamada de
rede que não existe). Pendência de produto, não implementação: o backend
precisaria de um endpoint tipo `GET /me/offices` para que o seletor
funcione de forma completa após um reload — fora do escopo desta etapa
(mudança de backend), registrado aqui para priorização futura.

## 19.9 `WorkspaceSwitcher`/`UserMenu` vivem em `features/`, não em `components/layout/`

`docs/frontend/02-estrutura-pastas.md §2.1` lista `WorkspaceSwitcher` em
`components/layout/`. Isso conflita com a regra de fronteira já fixada em
`docs/frontend/01-arquitetura.md §1.4` ("`components/` nunca importa
`features/*`") — `WorkspaceSwitcher` precisa de `useSwitchOffice`
(mutation) e `useOffice` (store), ambos em `features/office`; o mesmo
vale para `UserMenu`, que precisa de `useCurrentUser`/`useLogout` de
`features/auth`. Resolução (menor mudança, sem enfraquecer a regra de
fronteira): os dois componentes ficam em `features/office/components/` e
`features/auth/components/` respectivamente (onde já vivem suas
mutations/queries irmãs); `components/layout/app-shell.tsx` os recebe
prontos via prop (`workspaceSwitcher`, `userMenu`) — composição feita em
`app/(app)/layout.tsx`, a única camada da árvore que pode importar
`features/*` livremente. `components/layout/*` continua sem nenhum
import de `features/*`, verificável pelo próprio ESLint (regra já
existente, sem necessidade de exceção).

## 19.10 Sem endpoint de reativação de membro — nenhum botão "reativar" construído

`memberships.controller.ts` real tem `DELETE /members/:id` (desativação
soft) mas **nenhuma rota** para reverter (`PATCH /members/:id/reactivate`
ou equivalente não existe). O Prompt 6C pedia "reativação, caso prevista
no contrato" — não está. Resolução: nenhum botão de reativar foi
construído; um membro `INATIVO` aparece na listagem (com `StatusBadge`),
mas sem nenhuma ação disponível para revertê-lo. Registrado como
pendência de backend, não implementado como funcionalidade simulada.

## 19.11 jsdom não implementa Pointer Events/`scrollIntoView` — Radix Select quebrava em teste

Ao escrever os testes de `MembersTable`/`InviteMemberDialog` (primeiro
uso real do `Select`, `components/ui/select.tsx`), os testes falhavam com
`TypeError: target.hasPointerCapture is not a function` — jsdom não
implementa `Element.prototype.hasPointerCapture`/`releasePointerCapture`/
`scrollIntoView`, usados internamente pelo Radix Select para abrir o
dropdown e posicionar o item selecionado. Corrigido com polyfills
mínimos em `src/test/setup.ts` (mesmo padrão já usado para
`ResizeObserver`/`matchMedia`). Separadamente, `Tooltip` (usado nas
proteções do último Owner) lançava `must be used within TooltipProvider`
porque `test/render.tsx` não incluía o provider — corrigido adicionando
`TooltipProvider` a `AllProviders`, já que qualquer tela real também o
tem via `app/layout.tsx`.

## 19.12 Namespace `/dashboard-mock/*` — deliberadamente fictício, não um endpoint "quase real"

O Dashboard precisa de 5 dos 7 blocos de `docs/ux/05-dashboard.md §5.3`
(Meus Processos, Documentos Recentes, Atividade Recente, Métricas de
Carteira, Notificações) sem que Legal Cases/Documents/Timeline/
Notifications existam no backend. Só um destes tem path **documentado**
(`GET /v1/deadlines`, docs/api/09-legal-cases.md §9.4) — os outros quatro
não têm nem contrato escrito ainda. Em vez de inventar paths que
parecessem reais (ex.: `/v1/legal-cases/recent`, que poderia ser
confundido com um endpoint real futuro e cobrado como regressão se o
nome mudar), os quatro sem contrato foram colocados sob
`/dashboard-mock/*` — um namespace que não existe em nenhuma
documentação de API, sinalizando por construção que a forma exata do
dado é ilustrativa. `mocks/browser.ts` ganhou conteúdo pela primeira vez
nesta rodada (estava vazio desde o Prompt 6B) para que estes blocos
também funcionem em `npm run dev:mock`, não só em teste.

## 19.13 `PortfolioMetricsCard` gated por papel, não por permissão

`docs/ux/05-dashboard.md §5.3` diz "Métricas de Carteira: Owner, Admin,
Sócio" — uma lista de papéis, não uma permissão do catálogo real
(`apps/api/prisma/seed.ts` não tem uma chave tipo `metrics:read`). Gate
implementado comparando `useCurrentUser().membro.papel` contra
`['OWNER', 'ADMIN', 'SOCIO']` diretamente em `dashboard-page.tsx`, não
via `usePermission()` — é o único lugar desta rodada que verifica papel
em vez de permissão, porque é o único caso onde a própria arquitetura
(não este código) já define a regra como lista de papéis, reafirma
docs/frontend/06-autorizacao.md §6.3 ("`RoleGate`... usado só para os
poucos casos onde a regra é literalmente 'só estes papéis'").

## 19.14 Sem `PATCH /me` real — nenhuma edição de perfil construída

Ao implementar `features/profile`, `identity.controller.ts` confirmou o
que §19.7/§19.8 já indicavam por outro ângulo: o backend real só expõe
`GET /me` (leitura) e `POST /me/password` — não existe `PATCH /me` nem
qualquer rota para atualizar nome, avatar, telefone, idioma ou tema.
Nenhum formulário de edição foi construído (nem desabilitado — construir
um formulário desabilitado sugeriria "quase pronto", o que não é o caso).
Em vez disso, `ProfileOverview` mostra os dados como somente-leitura e um
`Alert` explícito. O mesmo padrão já havia sido usado para MFA/OAuth no
Prompt 6C original — aplicado aqui de novo, não uma decisão nova.

## 19.15 Handler MSW de sessões precisou de estado mutável

Primeira versão de `mocks/handlers/identity.ts` para `GET /auth/sessions`
retornava uma lista estática — o teste de revogação
(`sessions-list.spec.tsx`) falhava porque, após `DELETE
/auth/sessions/:id` invalidar a query, o refetch trazia de volta a
sessão "removida" (o handler não tinha memória do `DELETE` anterior).
Corrigido com o mesmo padrão já usado em `mocks/handlers/team.ts`
(`resetTeamMocks`): estado mutável em módulo + `resetIdentityMocks()`
chamado em `test/setup.ts` no `afterEach`, para um teste não vazar estado
para o próximo.

## 19.16 Modo demonstração — Identity mockado só nesta exceção temporária, ponte de cookie via Route Handler

Pedido explícito: navegação completa (login → Dashboard → Team → Perfil)
sem Postgres/Docker disponíveis neste ambiente (confirmado: `docker` não
instalado, nenhum serviço Postgres/Redis local). Duas mudanças, ambas
isoladas atrás de `NEXT_PUBLIC_API_MOCKING=enabled` e sem efeito em
produção/backend real:

1. `mocks/browser.ts` passou a registrar `mocks/demo/handlers.ts` — um
   conjunto **separado** das fixtures de teste (`mocks/handlers/*.ts`,
   usadas só por `mocks/server.ts`/Vitest), incluindo Identity/
   Memberships com dados realistas ("Silva & Associados", "João Silva").
   Isso é uma exceção deliberada e temporária à regra de
   docs/frontend/28-mocks.md §28.1 ("Identity nunca mockado em
   desenvolvimento") — só existe porque não há backend real acessível
   neste ambiente; assim que houver, o modo demo deixa de ser necessário.
2. **Limitação real descoberta:** navegadores ignoram `Set-Cookie` em
   respostas sintetizadas por Service Worker (limitação documentada do
   próprio MSW) — então o login mockado nunca gravaria o cookie
   `access_token` que `middleware.ts` exige. Resolvido com dois `Route
   Handlers` reais e mínimos (`app/api/demo/login`, `app/api/demo/logout`,
   ambos respondendo 404 fora do modo mock) chamados por `LoginForm`/
   `UserMenu` só quando `NEXT_PUBLIC_API_MOCKING === 'enabled'` — grava/
   limpa o cookie de verdade, sem alterar o fluxo real de autenticação.
3. **Bug encontrado e corrigido:** o próprio middleware bloqueava
   `/api/demo/login` (a rota que grava o cookie exigia o cookie que ela
   mesma cria) — corrigido adicionando `/api/demo` a `PUBLIC_PATHS`.

## 19.17 CSP duplicada (`next.config.ts` + implícita) quebrava a hidratação em `next dev` — causa raiz real do login "quebrado"

A causa real do formulário de login caindo em submit HTML nativo (e-mail/
senha na querystring) não era o modo demo nem processos concorrentes
(hipótese anterior, descartada): `next.config.ts` definia uma
`Content-Security-Policy` **estática e igual em qualquer ambiente**, com
`script-src 'self'` — sem `'unsafe-eval'`. O `next dev` usa `eval()` no
devtool de source map do webpack (Fast Refresh) e injeta scripts inline
(hidratação, runtime de HMR); bloqueado pela CSP, o React nunca hidrata
`LoginForm`, nenhum `onSubmit` é anexado, e o navegador executa o
`<form>` como HTML puro (`method` padrão `GET`, `action` a própria URL).
Confirmado no Console real do navegador: `EvalError` e "Executing inline
script violates ... script-src 'self'".

**Resolução — fonte única, condicionada por ambiente:**

- `Content-Security-Policy` passou a ser gerada só em `middleware.ts`
  (`buildContentSecurityPolicy`, `lib/security/csp.ts`) — removida de
  `next.config.ts` (que ficou só com os headers estáticos que não
  precisam de nonce/condição por ambiente: `X-Frame-Options` etc.).
  Precisava ser no middleware porque cada requisição precisa de um nonce
  novo — `headers()` do `next.config.ts` é resolvido uma vez, no build.
- **Desenvolvimento**: `script-src 'self' 'unsafe-inline' 'unsafe-eval'`
  + `connect-src` com `ws:`/`wss:`/`http://localhost:*`/`ws://localhost:*`
  (WebSocket do Fast Refresh).
- **Produção**: `script-src 'self' 'nonce-<valor>' 'strict-dynamic'` —
  nunca `unsafe-eval`/`unsafe-inline` — padrão oficial do Next.js App
  Router. O nonce é passado ao layout raiz via header de requisição
  `x-nonce` (lido com `headers()` do `next/headers`) e repassado ao
  script anti-flash de tema do `next-themes` (`ThemeProvider` aceita
  `nonce` nativamente) — o único script inline desta árvore fora do que
  o próprio Next.js já gerencia com o nonce automaticamente.

**Efeito colateral aceito, documentado, não escondido:** ler `headers()`
no layout raiz tira TODAS as rotas da renderização estática (`next build`
passou a marcar `/login`, `/registro` etc. como `ƒ Dynamic`, antes
`○ Static`). É o trade-off já documentado do próprio padrão oficial do
Next.js para CSP com nonce — aceito aqui porque a alternativa (não
propagar o nonce) quebraria o script do `next-themes` em produção com CSP
estrita. Reavaliar se o orçamento de performance (`docs/frontend/
26-performance.md`) for medido e mostrar impacto real.

**Por que a hipótese anterior (processos `next dev` concorrentes) não
era a causa real:** era um problema real e genuíno (confirmado, corrigido
— três servidores rodando ao mesmo tempo sobre o mesmo `.next` correm o
risco real de corromper manifests), mas não o único nem o principal:
mesmo com um único processo limpo, a CSP estática do `next.config.ts`
continuaria bloqueando `eval`/scripts inline em qualquer `next dev`,
neste ou em qualquer outro ambiente. As verificações anteriores via
`curl` nunca teriam pego isso — CSP só é aplicada/reportada pelo
navegador, não por um cliente HTTP puro.

**Testes:** `lib/security/csp.spec.ts` (10 casos) — dev inclui
`unsafe-eval`/`unsafe-inline`; produção não inclui nenhum dos dois e usa
nonce+`strict-dynamic`; `connect-src` de dev permite WebSocket/localhost,
produção não; nonce muda por chamada; diretivas fixas presentes em
qualquer ambiente.

---

**Anterior:** [18-tests.md](18-tests.md) · **Próximo:** [20-docker-ci.md](20-docker-ci.md)
