# 00 — Status da Implementação do Frontend

> **Código real em `apps/web/`** — projeto Next.js instalado (`npm install`
> executado), build de produção gerado, testes rodados de verdade neste
> ambiente. Este documento reflete o estado **real e verificado**, não um
> plano.
>
> **Ambiente desta etapa não tem o backend real em execução** (sem
> Postgres, `apps/api/` não sobe — mesma limitação já documentada em
> `docs/backend-implementation/00-status.md`). Isso significa: o cliente
> HTTP, os formulários e o middleware foram verificados com o servidor
> Next.js real rodando (`next dev`, HTML real inspecionado via `curl`) e
> com testes que mockam a API (Vitest + MSW) — mas **nenhuma chamada
> chegou a um backend NestJS real nesta rodada**. Integração ponta a ponta
> contra Identity/Offices/Memberships reais fica pendente até o ambiente
> ter Postgres disponível.

## 0.1 Resumo por etapa (ordem obrigatória do Prompt 6B, continuada pelo Prompt 6C)

| # | Etapa | Status |
|---|---|---|
| 1 | Bootstrap e configuração | ✅ Implementado e verificado |
| 2 | Design System | ⚠️ Parcial — 13 primitivos (8 do Prompt 6B + `DropdownMenu`, `Avatar`, `Separator`, `Sheet`, `Badge` desta rodada); catálogo completo (~35, incl. compostos como `DataTable`/`PermissionGate`/`FileUploader`) ainda pendente |
| 3 | Cliente HTTP e OpenAPI | ✅ Cliente HTTP completo e testado; geração de tipos via `openapi-typescript` **pendente** (depende de backend real de pé) |
| 4 | Providers e TanStack Query | ✅ Implementado e verificado |
| 5 | Autenticação | ✅ Implementado e testado — **DTO de `GET /me` corrigido nesta rodada** (era um formato plano inventado; ver [19-decisions.md §19.7](19-decisions.md)); integração real ainda não executável (sem backend de pé) |
| 6 | Contexto e troca de escritório | ✅ Implementado e testado (`office.store`, `OfficeProvider`, `useOffice`/`useActiveOffice`/`useSwitchOffice`, `WorkspaceSwitcher`, `BroadcastChannel` entre abas) — só MSW, integração real pendente |
| 7 | App Shell e navegação | ✅ Implementado e testado (Sidebar colapsável, Topbar, drawer mobile, menu de usuário, navegação filtrada por permissão) — substituiu o placeholder de `(app)/layout.tsx` |
| 8 | Team/Memberships | ✅ Implementado e testado (`/admin/usuarios`, `/convite/[token]`) — listagem, convite, alteração de papel, remoção, proteção do último Owner (client+backend real), auto-escalonamento bloqueado; só MSW, integração real pendente |
| 9 | Dashboard | ✅ Implementado e testado — saudação/equipe reais, prazos/processos/documentos/atividade/métricas/notificações mockados e claramente sinalizados; falha isolada por card verificada em teste |
| 10 | Users/Profile | ✅ Implementado e testado (`/perfil`: dados reais somente leitura, troca de senha real, sessões reais) — edição de perfil, "encerrar todas as sessões", MFA e OAuth mostrados como indisponíveis (sem endpoint real), nunca simulados |
| 11 | Clients | ✅ Implementado e testado (Prompt 7, reescrito no Sprint 17/Prompt "Clientes e Contatos" — ver [§0.5.14](#0514-sprint-17--clientes-e-contatos)) — `/clientes` (barra superior com Exportar/Atualizar/Importar-placeholder/contagem, filtros avançados sincronizados com a URL via `nuqs`, 6 ordenações, badge de categoria, favoritar) e `/clientes/[id]` (14 abas: Resumo/Dados Gerais/Contato/Endereço/Documentos/Comentários/Timeline real/Processos/Contratos/Financeiro/Serviços/Tarefas embutidas/Registros de Trabalho/IA) |
| 12 | Legal Cases | ✅ Implementado e testado (Prompt 7) — `/processos` (listagem com segredo de justiça sinalizado, criação) e `/processos/[id]` (Resumo, Informações gerais, Equipe, Prazos, Clientes vinculados reais; Documentos/Timeline/Comentários/IA/Histórico como placeholder elegante) |
| 13 | Deadlines e Timeline | ✅ Implementado e testado (Sprint 08) — `/prazos` (listagem com filtros rápidos Hoje/Amanhã/Esta semana/Este mês/Vencidos/Concluídos, calendário Dia/Semana/Mês, ações de ciclo de vida) e Timeline "workspace" real na aba Timeline do processo (agrupada por recência, filtros por categoria, busca, anotação manual, card de IA placeholder) |
| 14 | Documents e Folders | ✅ Implementado e testado (Sprint 09) — `/documentos` (árvore de pastas, visões Todos/Recentes/Favoritos/Versionados/Compartilhados/Lixeira, alternância lista/grid, busca, upload real drag-and-drop com fila/progresso/cancelar/retry), `/documentos/[id]` (layout dividido: preview + informações/versões/comentários), aba "Documentos" real em Clientes e Processos, 2 widgets novos no Dashboard (Documentos Recentes real, Indicador de Armazenamento) |
| 15 | Comments e Tags | ⚠️ Parcial (Tags tem um seletor mínimo dentro de Documentos; Comments ganhou seu 1º consumidor mínimo — criar/listar — na aba Comentários de Tarefa, Sprint 15; sem edição/exclusão/menções, sem tela própria) |
| 16 | Notifications e SSE | ❌ Não implementado (rota `/notificacoes` existe como stub de navegação, sino da Topbar só linka para lá) |
| 17 | Search | ✅ Implementado e testado (Sprint 10) — Command Palette (`Ctrl+K`/`⌘K`, montado globalmente em `(app)/layout.tsx`), `/busca` (busca avançada, resultados expandidos), campo da Topbar agora abre o palette em vez de navegar com `?q=` |
| 18 | AI | ✅ Implementado e testado (Sprint 11) — `AiSummaryPanel` (aba "IA" em Processos/Documentos/Clientes), `AiChat` (Copilot-style, escopo Processo/Documento/Global), `AiInsightsCard` no Dashboard, `/assistente` (chat global) |
| 19 | Testes completos | ⚠️ Parcial — 216 testes reais (203 já existentes + 13 novos de Task Engine nesta rodada — Sprint 15/Prompt 14) |
| 20 | Docker e CI | ⚠️ Parcial — inalterado nesta rodada, ver [20-docker-ci.md](20-docker-ci.md) |
| 21 | Revisão de acessibilidade/segurança/performance | ⚠️ Parcial — inalterado nesta rodada além do que a Etapa 7 já cobre (foco visível, `aria-current`/`aria-label` na navegação, `Sheet` com foco preso via Radix Dialog) |
| 22 | Navegação contextual (Sidebar reorganizada, Breadcrumbs, Painel "Relacionados", Ações rápidas) | ✅ Implementado e testado (Sprint 12/Prompt 11) — ver [§0.5.9](#059-sprint-12--reorganização-da-navegação-prompt-11) |
| 23 | Permission Engine (Perfis/Permissões, Simulador, Painel IA, Field Security de Cliente) | ✅ Implementado e testado (Sprint 13/Prompt 12) — ver [§0.5.10](#0510-sprint-13--permission-engine-prompt-12) e `docs/backend-implementation/21-permission-engine.md` |
| 24 | Configuration Engine (Geral, Campos Extras, Campos Obrigatórios, Conjuntos de Valores, Categorias de Tarefas, Grupos de Colaboradores, Modelos de Tarefa, Feriados, Financeiro, IA) | ✅ Implementado e testado (Sprint 14/Prompt 13) — ver [§0.5.11](#0511-sprint-14--configuration-engine-prompt-13) e `docs/backend-implementation/22-configuration-engine.md` |
| 25 | Task Engine (Minhas Tarefas, Equipe, Kanban, Calendário, Checklist, Dependências, Recorrência, Vínculos, Timeline, Comentários, IA, Dashboard) | ✅ Implementado e testado (Sprint 15/Prompt 14) — ver [§0.5.12](#0512-sprint-15--task-engine-prompt-14), `docs/task-engine.md` e `docs/backend-implementation/23-task-engine.md` |
| 26 | UX Polish (Scroll Experience, Microinterações, Transições) | ✅ Implementado e testado (Sprint 16/Prompt 14.5) — sem entidade/rota/regra de negócio nova, só `apps/web/**` — ver [§0.5.13](#0513-sprint-16--ux-polish-prompt-145) e [`ux-polish.md`](ux-polish.md) |

## 0.2 Por que o escopo parou aqui

O Prompt 6C pede a conclusão de todas as etapas restantes do frontend
numa única rodada — feito de forma honesta (com verificação real), isso
continua sendo o equivalente de semanas de um time de frontend. Mesma
decisão de escopo já registrada para o Prompt 6B (§0.2 original) e para o
backend (`docs/backend-implementation/19-decisions.md §19.2`): priorizar
profundidade e verificação real sobre amplitude.

**Primeira rodada do 6C** entregou as Etapas 6 e 7 (Office Context + App
Shell) — as duas que desbloqueiam literalmente todo o resto (nenhum
módulo de domínio faz sentido sem um escritório ativo e uma navegação
real para chegar até ele) — mais a correção de um bug de contrato real
(§0.3). Para que a Sidebar não tivesse links mortos, as rotas ainda sem
módulo (`/processos`, `/prazos`, `/documentos`, `/clientes`, `/busca`,
`/notificacoes`, `/perfil`, `/admin/usuarios`) receberam uma página stub
real (`components/feedback/coming-soon.tsx`).

**Segunda rodada do 6C** entregou o bloco Etapas 8 (Team/Memberships), 9
(Dashboard) e 10 (Users/Profile) — nessa ordem, cada uma substituindo seu
stub por conteúdo real onde o backend permite, e por estado de
indisponibilidade controlada onde não permite (nunca por funcionalidade
simulada).

**Prompt 7** (esta rodada) entregou Etapas 11 (Clients) e 12 (Legal
Cases) — os dois módulos de conteúdo mais importantes do produto, ambos
com backend real implementado na mesma rodada (`apps/api/src/modules/
clients/`, `apps/api/src/modules/legal-cases/`). Timeline, Documentos,
Comentários e IA continuam como aba placeholder elegante dentro das
telas de detalhe (`components/feedback/placeholder-tab-content.tsx`),
conforme instrução explícita de não avançar sobre esses módulos nesta
rodada — os pontos de integração (rotas, tabs, tipos) já estão
preparados para quando existirem.

**Sprint 08** entregou Etapa 13 (Deadlines + Timeline) — os
dois módulos que passam a ser "o centro operacional do sistema". Backend
implementado na mesma rodada (`apps/api/src/modules/timeline/` novo +
extensão de `legal-cases/`). Documentos, Comentários e IA continuam
placeholder elegante (mesma instrução explícita de não avançar sobre
esses módulos nesta rodada).

**Sprint 09** entregou Etapa 14 (Documents + Folders) — o
módulo pensado para ser um diferencial do produto (experiência inspirada
em Google Drive/Notion). Backend novo na mesma rodada
(`apps/api/src/modules/documents/` + abstração de storage real em
`shared/infrastructure/storage/`). A aba "Documentos" de Clientes/
Processos, antes placeholder, agora mostra dados reais. Comentários e IA
continuam placeholder elegante (mesma instrução explícita de não avançar
sobre Comments/IA completa nesta rodada — só a arquitetura de
relacionamento já existe no schema/DTO).

**Sprint 10** entregou Etapa 17 (Search) — a Universal
Search, pensada para ser "o centro de navegação do sistema". Backend novo
na mesma rodada (`apps/api/src/modules/search/`, 9 grupos agregados,
nenhuma mudança de schema). `CommandPalette` (`Ctrl+K`/`⌘K`) substitui o
campo de busca inline da Topbar por um overlay estilo Raycast/Spotlight/
Linear, montado uma única vez em `(app)/layout.tsx`. `/busca` deixou de
ser stub e virou a tela de "busca avançada" (resultados expandidos, sem o
limite de 8 itens por grupo do palette). Comments/Notifications/AI
continuavam pendentes — a Universal Search já indexava Clientes/Processos/
Documentos/Prazos/Pastas/Timeline/Equipe/Tags reais; Comentários aparece
como grupo sempre `disponivel:false` (módulo não existe ainda), mesmo
padrão de "compartilhados" em Documents.

**Sprint 11** (esta rodada) entregou Etapa 18 (AI) — o Assistente Jurídico
Inteligente, presente "naturalmente" em vez de ser uma tela própria:
`AiSummaryPanel` (aba "IA", real, nas 3 telas de detalhe — Processo,
Documento, Cliente), `AiChat` (Copilot-style, sempre ciente do contexto
atual), `AiInsightsCard` no Dashboard e `/assistente` (chat com escopo
global, reaproveitando a Busca Global da Sprint 10 como fonte). Backend
novo na mesma rodada (`apps/api/src/modules/ai/` +
`shared/infrastructure/ai/`). Nenhuma biblioteca de UI nova — mesma
disciplina anti-dependência das Sprints 08–10.

## 0.3 Diferenciação exigida pelo Prompt 6B §2 / 6C §4 — o que é o quê

| Endpoint/módulo | Estado real |
|---|---|
| `POST /auth/register`, `/auth/login`, `/me`, `/auth/logout`, `/auth/password-recovery`, `/auth/password-reset`, `/auth/switch-office` | **Endpoint real existe no backend** (`apps/api/`), mas não foi validado contra ele nesta rodada (sem Postgres) — chamado apenas via mock (MSW) em teste. `/me` e `/auth/switch-office` ganharam handler MSW nesta rodada (antes só os 6 endpoints de auth tinham) |
| `POST /auth/refresh`, `GET /auth/sessions`, `DELETE /auth/sessions/:id`, `POST /me/password` | Endpoint real existe no backend; cliente HTTP já implementa o fluxo de refresh contra este contrato, mas **não integrado nem testado** nesta rodada |
| Verificação de e-mail, MFA, OAuth Google/Microsoft | **Contrato documentado sem implementação** no backend — UI não construída nesta rodada |
| Offices, Memberships (endpoints reais) | Endpoint real existe; troca de escritório (Etapa 6) é a única tela que os consome nesta rodada, só contra MSW |
| `GET/POST /clients`, `GET/PATCH/DELETE /clients/:id`, `/archive`, `/restore`, `/duplicate`, `/legal-cases` | **Real desde o Prompt 7** — backend implementado na mesma rodada; frontend chama o path real, MSW só em teste (Vitest) |
| `GET/POST /legal-cases`, `GET/PATCH/DELETE /legal-cases/:id`, `/archive`, `/restore`, `/team`, `/responsible`, `/parties` | **Real desde o Prompt 7** — mesma observação acima; `/related` e `/tags` (§9.5/§9.6) não implementados no backend, não consumidos no frontend |
| `GET /deadlines` (agregado), `/legal-cases/:id/deadlines/*` (CRUD + complete/reopen/duplicate/cancel), `GET/POST/PATCH/DELETE /legal-cases/:id/timeline`, `GET /timeline` (agregado) | **Real desde a Sprint 08** — backend implementado na mesma rodada; consumidos em `/prazos`, na aba "Prazos"/"Timeline" do processo e em 4 cards do Dashboard |
| `GET /documents` (agregado, 6 visões), `POST /documents/presign`+`/confirm`, `GET/PATCH/DELETE /documents/:id`, `/restore`, `/duplicate`, `/move`, `/favorite`, `/download`, `/preview`, `/versions*`, `GET /documents/dashboard-summary`, `GET/POST/PATCH/DELETE /folders*`, `GET/POST /tags` | **Real desde a Sprint 09** — backend implementado na mesma rodada; consumidos em `/documentos`, `/documentos/[id]`, na aba "Documentos" de Clientes/Processos e em 2 cards do Dashboard |
| `GET /search` (agregado, 9 grupos), `GET /search/suggestions` | **Real desde a Sprint 10** — backend implementado na mesma rodada; consumidos pelo `CommandPalette` e por `/busca` |
| `POST/GET /legal-cases/:id/ai-summaries`, `/documents/:id/ai-summaries`, `/clients/:id/ai-summaries`, `GET/POST /ai-summaries/:id*`, `POST /ai/chat`, `GET /ai/dashboard-insights`, `GET /office/ai-usage` | **Real desde a Sprint 11** — backend implementado na mesma rodada; consumidos por `AiSummaryPanel`/`AiChat`/`AiInsightsCard`/`/assistente` |
| Users, Comments, Tags (tela própria), Notifications, Audit completo | **Recurso pendente** — nem backend nem frontend implementados; rotas de navegação existem como stub sem lógica |

## 0.4 Métricas reais desta rodada (Prompt 6C)

| Métrica | Valor |
|---|---|
| Arquivos TypeScript/TSX de produção criados | 33 |
| Arquivos TypeScript/TSX de produção modificados | 7 (`auth.api.ts`, `mutations.ts` de auth, `index.ts` de auth, handler MSW de identity, `(app)/layout.tsx`, `(app)/page.tsx`, `eslint.config.mjs`) |
| Arquivos de teste novos | 4 (15 casos de teste novos) |
| `npx vitest run` | 6/6 suítes, **26/26 testes** — passou (11 do Prompt 6B + 15 novos) |
| `npx tsc --noEmit` | 0 erros |
| `npx eslint --max-warnings=0` | 0 erros |
| `npx next build` | Sucesso, 15 rotas prerenderizadas, `output: standalone` mantido |
| `next dev` + `curl` real | `/` sem cookie redireciona para `/login?next=%2F`; `/` com cookie `access_token` fake (sem backend) renderiza o App Shell real (Sidebar com "Dashboard", Topbar com campo de busca, `#main-content`) sem erro de aplicação |
| Chamada real contra `apps/api/` (Postgres) | 0 (sem Postgres neste ambiente) |
| Imagem Docker construída | 0 (sem Docker neste ambiente, inalterado) |

## 0.4.1 Métricas reais desta rodada (Prompt 7)

| Métrica | Valor |
|---|---|
| Arquivos TypeScript/TSX de produção criados | 22 (features/clients + features/legal-cases completos, `placeholder-tab-content.tsx`, `use-debounced-value.ts`, validadores CPF/CNPJ/CNJ do frontend) |
| Arquivos TypeScript/TSX de produção modificados | 6 (`page-header.tsx` ganhou `breadcrumbs`, `dashboard/api/{dashboard.api,queries}.ts` e `recent-cases-card.tsx` passaram a consumir Legal Cases real, `mocks/handlers/dashboard.ts` e `mocks/demo/handlers.ts` perderam o mock de "recent-cases", `mocks/handlers/identity.ts` ganhou permissões `client:*`/`case:*`) |
| Arquivos de teste novos | 3 (14 casos de teste novos) |
| `npx vitest run` (suíte completa) | 19/19 suítes, **80/80 testes** — passou |
| `npx tsc --noEmit` | 0 erros |
| `npx eslint --max-warnings=0` | 0 erros (após `--fix` de formatação) |
| `npx next build` | Sucesso, 19 rotas (`/clientes/[id]`, `/processos/[id]` novas), todas `ƒ Dynamic` (inalterado desde a correção de CSP) |
| Chamada real contra `apps/api/` (Postgres) | 0 (sem Postgres neste ambiente) — Clients/Legal Cases só verificados contra o backend real via os mesmos testes unitários do backend (`apps/api`) e via MSW no frontend |

## 0.4.2 Métricas reais desta rodada (Sprint 08)

| Métrica | Valor |
|---|---|
| Arquivos TypeScript/TSX de produção criados | 20 (features/deadlines completo incl. `calendar-view.tsx`, features/timeline completo incl. `timeline-meta.ts`/`timeline-item-card.tsx`, `lib/utils/date-range.ts`, 2 cards novos do Dashboard) |
| Arquivos TypeScript/TSX de produção modificados | 9 (`lib/api/client.ts` ganhou body em `delete()`, `dashboard/api/{dashboard.api,queries}.ts` passaram a consumir Deadlines/Timeline reais, `dashboard-page.tsx`, `deadlines-card.tsx`, `recent-activity-card.tsx`, `status-badge.tsx` ganhou status novos, `page-header` inalterado, `legal-case-detail-page.tsx` e `client-detail-page.tsx` para a aba Timeline/Prazos reais) |
| Arquivos de teste novos | 3 (8 casos de teste novos) |
| `npx vitest run` (suíte completa) | 21/21 suítes, **88/88 testes** — passou |
| `npx tsc --noEmit` | 0 erros |
| `npx eslint --max-warnings=0` | 0 erros (após `--fix` de formatação) |
| `npx next build` | Sucesso, 19 rotas (`/prazos` deixou de ser stub), todas `ƒ Dynamic` |
| Chamada real contra `apps/api/` (Postgres) | 0 (sem Postgres neste ambiente) — mesma limitação de todas as rodadas |

## 0.4.3 Métricas reais desta rodada (Sprint 09)

| Métrica | Valor |
|---|---|
| Arquivos TypeScript/TSX de produção criados | 28 (features/documents completo incl. `upload-dialog.tsx`/`document-preview.tsx`/`version-history.tsx`/`document-detail-page.tsx`, features/folders completo incl. `folder-tree.tsx`/`build-tree.ts`, 1 card novo do Dashboard) |
| Arquivos TypeScript/TSX de produção modificados | 8 (`legal-case-detail-page.tsx` e `client-detail-page.tsx` para a aba Documentos real, `dashboard-page.tsx`, `recent-documents-card.tsx` de mock para real, `dashboard/api/{dashboard.api,keys,queries}.ts` removeram o mock morto de "recent-documents") |
| Arquivos de teste novos | 4 (10 casos de teste novos) |
| `npx vitest run` (suíte completa) | 25/25 suítes, **101/101 testes** — passou |
| `npx tsc --noEmit` | 0 erros |
| `npx eslint --max-warnings=0` | 0 erros (após `--fix` de formatação) |
| `npx next build` | Sucesso, 20 rotas (`/documentos` e `/documentos/[id]` deixaram de ser stub), todas `ƒ Dynamic` |
| Chamada real contra `apps/api/` (Postgres) | 0 (sem Postgres neste ambiente) — mesma limitação de todas as rodadas |

## 0.4.4 Métricas reais desta rodada (Sprint 10)

| Métrica | Valor |
|---|---|
| Arquivos TypeScript/TSX de produção criados | 18 (features/search completo: `command-palette.tsx`, `search-advanced-page.tsx`, `search-result-row.tsx`, `search-preview-panel.tsx`, `search-empty-state.tsx`, domínio de recentes/histórico/prefixos/telemetria/ícones, `stores/command-palette.store.ts`, 1 card novo do Dashboard) |
| Arquivos TypeScript/TSX de produção modificados | 5 (`(app)/layout.tsx` monta `CommandPalette`, `components/layout/topbar.tsx` — campo de busca vira botão que abre o palette, `legal-case-detail-page.tsx` e `documents-page.tsx` ganharam deep-link via `?tab=`/`?pastaId=`/`?tagId=`, `dashboard-page.tsx`) |
| Arquivos de teste novos | 6 (26 casos de teste novos) |
| `npx vitest run` (suíte completa) | 32/32 suítes, **127/127 testes** — passou (101 já existentes + 26 novos) |
| `npx tsc --noEmit` | 0 erros |
| `npx eslint --max-warnings=0` | 0 erros (após `--fix` de formatação) |
| `npx next build` | Sucesso, 20 rotas (`/busca` deixou de ser stub), todas `ƒ Dynamic` |
| Chamada real contra `apps/api/` (Postgres) | 0 (sem Postgres neste ambiente) — mesma limitação de todas as rodadas |

## 0.4.5 Métricas reais desta rodada (Sprint 11)

| Métrica | Valor |
|---|---|
| Arquivos TypeScript/TSX de produção criados | 15 (features/ai completo: `ai.api.ts`/`keys.ts`/`queries.ts`/`mutations.ts`, `ai-summary-panel.tsx`, `ai-chat.tsx`, `ai-insights-card.tsx`, `source-list.tsx`, `typewriter-text.tsx`, `thinking-indicator.tsx`, `ai-disclaimer.tsx`, `/assistente/page.tsx`) |
| Arquivos TypeScript/TSX de produção modificados | 6 (`legal-case-detail-page.tsx` — aba IA real, `document-detail-page.tsx` e `client-detail-page.tsx` ganharam aba IA nova, `dashboard-page.tsx`, `config/navigation.ts` — item "Assistente IA", `test/setup.ts` — polyfill de `scrollTo`) |
| Arquivos de teste novos | 3 (12 casos de teste novos) |
| `npx vitest run` (suíte completa) | 33/33 suítes, **139/139 testes** — passou (127 já existentes + 12 novos) |
| `npx tsc --noEmit` | 0 erros |
| `npx eslint --max-warnings=0` | 0 erros (após `--fix` de formatação) |
| `npx next build` | Sucesso, 21 rotas (`/assistente` nova), todas `ƒ Dynamic` |
| Chamada real contra `apps/api/` (Postgres) | 0 (sem Postgres neste ambiente) — mesma limitação de todas as rodadas |

## 0.4.6 Métricas reais desta rodada (Sprint 16 — UX Polish)

| Métrica | Valor |
|---|---|
| Arquivos TypeScript/TSX de produção criados | 1 (`components/data-display/scroll-area.tsx`) |
| Arquivos TypeScript/TSX de produção modificados | 24 (10 primitivos `components/ui/*`, 3 `components/layout/*`, 15 telas/componentes de `features/*` — lista completa em `ux-polish.md §9`) |
| Arquivos CSS modificados | 1 (`styles/globals.css` — scrollbar minimalista + sistema de transições) |
| Arquivos de teste novos/modificados | 0 (nenhuma superfície de teste nova — polish visual não introduziu comportamento a testar; os 216 testes existentes continuam cobrindo o mesmo comportamento funcional) |
| `npx vitest run` (suíte completa) | 62/62 suítes, **216/216 testes** — passou, sem regressão |
| `npx tsc --noEmit` | 0 erros |
| `npx eslint "{src,e2e}/**/*.{ts,tsx}" --max-warnings=0` | 0 erros |
| `npx next build` | Sucesso, 56 rotas, todas `ƒ Dynamic` (mesmas rotas de antes — nenhuma nova) |
| `npx nest build` (backend, verificação de não regressão) | Sucesso, 0 erros — nenhum arquivo de `apps/api/` tocado nesta rodada |
| `npx jest` (backend, verificação de não regressão) | 90/90 suítes, **483/483 testes** — passou, sem regressão |

## 0.4.7 Métricas reais desta rodada (Sprint 17 — Clientes e Contatos)

| Métrica | Valor |
|---|---|
| Arquivos TypeScript/TSX de produção criados | 0 (módulo já existia — só reescrita/ampliação de arquivos existentes) |
| Arquivos TypeScript/TSX de produção modificados | 9 (`clients.api.ts`, `queries.ts`, `mutations.ts`, `keys.ts`, `schemas/client.schemas.ts`, `clients-page.tsx`, `client-form-dialog.tsx`, `client-detail-page.tsx`, `config/navigation.ts`) + 2 de infraestrutura (`app/layout.tsx` — `NuqsAdapter`, `test/render.tsx` — `NuqsTestingAdapter`) |
| Arquivos MSW modificados | 3 (`mocks/handlers/clients.ts`, `mocks/demo/handlers.ts`, `mocks/handlers/identity.ts`) |
| Dependência ativada pela 1ª vez de verdade | `nuqs` (já era dependência declarada, nunca usada — filtros de `/clientes` são o primeiro uso real de `useQueryStates` no app) |
| Arquivos de teste modificados | 2 (`clients-page.spec.tsx`, `client-detail-page.spec.tsx` — ajustes de escopo de query, nenhum teste removido) |
| `npx vitest run` (escopado — regra de execução desta Sprint) | `src/features/clients` + módulos diretamente impactados (`legal-cases`, `dashboard`, `layout`, `search`, `tasks`): 18/18 suítes, **74/74 testes** — passou |
| `npx tsc --noEmit` (completo) | 0 erros |
| `npx eslint "{src,e2e}/**/*.{ts,tsx}" --max-warnings=0` (completo) | 0 erros |
| `npx next build` | Não executado nesta rodada — regra de execução ("Next Build apenas se necessário"); nenhuma rota nova, nenhum `layout.tsx` de rota alterado além do root (`NuqsAdapter`, mudança aditiva de provider) |
| Suíte completa (`vitest run`, todos os módulos) | **Não executada nesta rodada** — última execução completa (62/62, Sprint 16/UX Polish) continua válida como baseline; nenhum primitivo compartilhado (`components/ui/*`) foi alterado nesta Sprint |

## 0.5 Bugs reais encontrados e corrigidos durante a verificação

### 0.5.1 Prompt 6B — `Button`/`asChild`/`Slot`

`Button` com `asChild` (usado em `<Button asChild><Link>...</Link></Button>`,
`not-found.tsx`) quebrava `next build` com `Slot failed to slot onto its
children` — causa: o componente injetava o ícone de loading como
segundo filho de `Slot` mesmo quando `asChild=true`, e `@radix-ui/react-slot`
exige exatamente um único elemento filho. Descoberto isolando a página
pela remoção temporária de `not-found.tsx` e comparando o build (falhava
com o arquivo presente, passava sem ele). Corrigido separando o branch
`asChild` do branch normal em `components/ui/button.tsx` — registrado em
[19-decisions.md §19.1](19-decisions.md).

### 0.5.2 Prompt 6C — `CurrentUserDTO` não correspondia ao `GET /me` real

Descoberto ao ler `apps/api/src/modules/identity/application/use-cases/get-current-user.use-case.ts`
antes de implementar o Office Context (que depende diretamente da forma
de `GET /me` para popular o escritório ativo). O tipo escrito no Prompt
6B (`{ usuarioId, nome, email, escritorioId, membroId, sessionId, roles,
permissions }`, plano) nunca foi validado contra o use case real, que
retorna `{ usuario: {...}, membro: { id, papel, permissions }, escritorio:
{ id, nome, slug } }` (aninhado). Se não corrigido agora, todo o Office
Context teria sido construído sobre um contrato inventado. Corrigido em
`features/auth/api/auth.api.ts`, no handler MSW de `/me`, e nos dois
consumidores existentes (`(app)/page.tsx`, `UserMenu`) — registrado em
[19-decisions.md §19.7](19-decisions.md).

### 0.5.3 Prompt 6C — `GET /me` não retorna a lista de escritórios do usuário

Descoberto no mesmo momento: `docs/frontend/07-office-context.md §7.1`
presume que `GET /me` retorna `escritorioAtivoId` **e** a lista de
escritórios do usuário — mas o use case real só retorna o escritório
ativo (`escritorio: {...}`, singular). Só `POST /auth/login` retorna
`escritorios[]`. Não há endpoint de backend para listar os escritórios de
um usuário fora do momento do login — lacuna real do backend, não do
frontend. Resolução registrada em [19-decisions.md §19.8](19-decisions.md):
a lista completa só é conhecida durante a sessão em que o login aconteceu
nesta aba; um reload sem novo login degrada corretamente para o caso "um
único escritório" (§7.6), em vez de inventar dados.

### 0.5.4 Prompt 7 — achados de teste (MSW e asserções)

1. **Fixture MSW de Legal Cases não normalizava `numeroCnj`** antes de
   comparar/gravar (o formulário envia a máscara `0000000-00.0000.0.00.0000`,
   o backend real normaliza para 20 dígitos antes de comparar) — o teste de
   `DUPLICATE_CNJ` passava silenciosamente pelo caminho de sucesso em vez
   de rejeitar. Corrigido normalizando no handler MSW (`mocks/handlers/legal-cases.ts`),
   mesmo comportamento do backend real (`normalizeCnj`).
2. **`PageHeader` com `breadcrumbs` repete o título** — o último item do
   breadcrumb usa o mesmo texto do `<h1>`, então `screen.findByText(titulo)`
   falha por match ambíguo (mais de um elemento); corrigido usando
   `getByRole('heading', { name })` nos testes de detalhe.
3. **`renderWithProviders` não monta `<Toaster/>`** — mensagens de
   `toast.error()`/`toast.success()` nunca aparecem no DOM em teste (só em
   app real). Testes que dependiam de ler o texto do toast foram reescritos
   para verificar o efeito observável (diálogo fecha, linha permanece na
   tabela, erro de campo do formulário) em vez do texto do toast — mesma
   lacuna que os testes de Team já contornavam sem documentar.
4. **`useRouter` de `next/navigation` exige mock explícito** (`vi.mock`) em
   qualquer componente de teste que o chame — já era um padrão conhecido
   (`login-form.spec.tsx`), reaplicado a `legal-case-detail-page.spec.tsx`.

### 0.5.5 Sprint 08 — achados de teste e de contrato

1. **`dashboardApi.listCriticalDeadlines` chamava `/v1/deadlines`** com
   `/v1` duplicado (`NEXT_PUBLIC_API_URL` já inclui `/v1`) — nunca
   detectado porque o MSW usava o mesmo path (também errado) nos dois
   lados. Corrigido para `/deadlines`, consistente com o resto do cliente
   HTTP; documentado também no backend (§20-context-next-step.md).
2. **`apiClient.delete()` não aceitava corpo** — o backend real de
   `DELETE /legal-cases/:id/deadlines/:prazoId` aceita `motivoCancelamento`
   no corpo (prazo `FATAL` exige justificativa), mas o cliente HTTP
   removia `body` explicitamente da assinatura de `delete()`. Estendido
   para aceitar um segundo parâmetro opcional — único outro call site
   (`client.spec.ts`) continua passando, mudança aditiva.
3. **Dashboard com dois cards mostrando o mesmo prazo/evento mock**
   ("Contestação" em Agenda do Dia e Prazos Críticos; "Ação de cobrança…"
   em Meus Processos e Atividade Recente) quebrou `findByText` (esperava
   exatamente um elemento) — corrigido usando `findAllByText` nesses
   testes, mesma classe de achado do Prompt 7 com `PageHeader`+breadcrumb.

### 0.5.6 Sprint 09 — achados de teste e de UX

1. **`RecentDocumentsCard` era mock desde o Prompt 6C e nunca foi
   atualizado** — `useRecentDocuments`/`dashboardApi.listRecentDocuments`/
   `/dashboard-mock/recent-documents` removidos (código morto) e
   substituídos por `useDocumentsDashboardSummary()` real
   (`GET /documents/dashboard-summary`).
2. **`<input type="file">` sem `aria-label` não é localizável por teste
   nem por leitor de tela** — `screen.getByLabelText(...)` falhava porque
   o input do `UploadDialog` não tinha nome acessível (só um `<label>`
   textual ao redor, sem associação formal). Corrigido adicionando
   `aria-label="Selecionar arquivos para enviar"` diretamente no input —
   achado de acessibilidade real, não só de teste.
3. **`FolderTreeItem` expande pastas raiz por padrão** — um teste inicial
   presumia que toda pasta nasce recolhida (paridade errada com Google
   Drive, que expande a raiz); ajustado para refletir o comportamento
   real e desejado (raiz sempre visível, profundidade evita fricção de
   clique extra para o caso mais comum).
4. **Upload de ponta a ponta testável sem stubs no componente** — o MSW
   intercepta também o PUT para a URL "assinada" (`/storage/mock/upload/:id`),
   então o teste de upload exercita o fluxo real completo (presign → PUT
   → hash SHA-256 via `crypto.subtle` → confirm) em vez de mockar
   `uploadFileToStorage` diretamente — mais fiel ao comportamento em
   produção.

### 0.5.7 Sprint 10 — achados de teste

1. **`legal-case-detail-page.tsx` e `documents-page.tsx` ganharam
   `useSearchParams()` (deep-link `?tab=`/`?pastaId=`/`?tagId=` para
   resultados de busca) e isso quebrou os testes já existentes desses dois
   componentes** — `legal-case-detail-page.spec.tsx` mockava `next/
   navigation` só com `useRouter`, e `documents-page.spec.tsx` não mockava
   o módulo (usava o real, que devolve `null` sem um `AppRouterContext`,
   causando `Cannot read properties of null`). Corrigido adicionando
   `useSearchParams: () => new URLSearchParams()` aos mocks — achado real
   de regressão, pego pela suíte completa antes de fechar a rodada, não só
   pelos testes novos de Search.
2. **Ambiguidade de texto entre grupos no `CommandPalette`** — o item
   selecionado por padrão (primeiro da lista) aparece duas vezes no DOM
   (uma vez na linha de resultado, outra no preview lateral), e a fixture
   de teste tinha um documento cujo `subtitulo` reaproveitava o `titulo`
   de um processo (relação real: "Procuração — Silva.pdf" pertence à
   "Ação Trabalhista — Reclamante Silva"). `findByText` simples falhava
   com "Found multiple elements". Corrigido escopando as asserções com
   `within(document.getElementById('palette-listbox'))` — o mesmo cuidado
   já registrado para `PageHeader`+breadcrumb (Prompt 7) e Dashboard
   (Sprint 08), aplicado de novo aqui.
3. **Nenhuma nova dependência de UI** — Command Palette construído sobre o
   `Dialog` (Radix) já existente, sem `cmdk` (biblioteca cogitada em
   `docs/frontend/21-search.md`, nunca instalada) — mesma disciplina
   anti-dependência das Sprints 08/09 (sem lib de calendário/árvore/
   markdown/progress bar).

### 0.5.8 Sprint 11 — achados de teste

1. **`useSummaryFeedback`/`useCancelSummary` invalidavam uma chave de
   query (`aiKeys.summary`) que `AiSummaryPanel` nunca usa** — o painel lê
   a LISTA (`useSummaries`), não o item singular; dar 👍/👎 não atualizava a
   tela até um refetch por outro motivo. Achado pelo teste de feedback
   (`ai-summary-panel.spec.tsx`), não por inspeção manual — corrigido
   trocando para `invalidateQueries({ queryKey: aiKeys.all(officeId) })`
   (mais amplo, mas correto; a alternativa exigiria threadear
   `escopoTipo`/`escopoId` por toda a árvore de componentes só para uma
   invalidação mais cirúrgica).
2. **jsdom não implementa `Element.scrollTo`** — usado por `AiChat` para
   rolar até a última mensagem; quebrava todo teste do componente com
   `TypeError: scrollTo is not a function`. Corrigido com o mesmo padrão
   de polyfill já usado para `scrollIntoView`/Pointer Events em
   `test/setup.ts`.
3. **SSE real no backend, mas não consumido por `EventSource` no
   frontend** — decisão deliberada, não um bug: `EventSource` não existe
   em jsdom e não é interceptável por MSW neste ambiente de teste, mesma
   limitação que já impediu Notifications/SSE de ser implementado no
   frontend (docs/frontend/20-notifications-sse.md, contrato existe, nunca
   consumido). `useSummary`/`useSummaries` fazem *poll* via
   `refetchInterval` do TanStack Query enquanto o status é
   `GERANDO`/`PENDENTE` — do ponto de vista do usuário, o resultado final
   é o mesmo (a tela atualiza sozinha), com um efeito de "texto sendo
   digitado" (`TypewriterText`) sobre o `conteudo` já completo para
   preservar a sensação de streaming pedida pelo Sprint 11.

### 0.5.9 Sprint 12 — Reorganização da Navegação (Prompt 11)

1. **Sidebar virou grupos temáticos** (`config/navigation.ts`: `NavGroup[]`
   em vez de uma lista plana) — Dashboard/Busca/Assistente IA/Prazos/
   Notificações sem cabeçalho (utilitário), depois PESSOAS, JURÍDICO,
   GESTÃO DO TEMPO, FINANCEIRO, OUTROS, RELATÓRIOS, CONFIGURAÇÕES.
   `SidebarContent` filtra grupo inteiro (não só item) quando nenhum item
   sobrevive à checagem de permissão — evita cabeçalho órfão (ex.:
   CONFIGURAÇÕES some por completo para quem não tem `office:update`, não
   fica só com o link ausente).
2. **23 rotas novas, todas via `ModulePlaceholderPage`** (Contratos,
   Garantias, Movimentações extra/judiciais, Pedidos, Processos
   extrajudiciais, Publicações, Configurações de captura, Registros de
   trabalho, Serviços, Tarefas, 5× Financeiro, Anexos, Auditoria,
   Exportações, Modelos de documentos, 2× Relatórios, Configurações) —
   mesmo princípio de `coming-soon.tsx` desde o Prompt 6C (nunca simular
   dado), agora combinado com a trilha de breadcrumb do grupo
   (`Breadcrumbs` extraído de `PageHeader`). Nenhum módulo de negócio novo
   foi implementado, como pedido explicitamente pela Sprint — só a árvore
   de navegação preparada para os próximos.
3. **"Pastas" reaproveita `/documentos`** (não é uma rota nova) — a árvore
   de pastas já vive na tela de Documentos desde a Sprint 09; a Sidebar só
   foi renomeada/reposicionada para bater com a nova taxonomia, mantendo a
   mesma permissão (`document:read:all`/`document:read:assigned`) que o
   antigo item "Documentos" já tinha (regressão evitada: eu tinha
   inicialmente esquecido essa checagem ao renomear, pego relendo o
   `navigation.ts` antes de escrever o teste do grupo JURÍDICO).
4. **Painel "Relacionados"** (`RelatedPanel`, `components/data-display/`)
   — adicionado em Cliente/Processo/Documento (não em Pasta: não existe
   página de detalhe de Pasta, só a árvore dentro de Documentos). Item sem
   `href` (módulo ainda não existe, ex.: Contratos de um Cliente) aparece
   esmaecido, nunca escondido.
5. **`useTabDeepLink`** (`hooks/`) — o `?tab=` que já existia em
   Processo (Sprint 10, só lido uma vez via `Tabs defaultValue`) virou um
   hook com `useEffect` observando `searchParams`, porque o painel
   "Relacionados" agora linka para abas da própria página
   (`/clientes/:id?tab=processos` estando já em `/clientes/:id`) — um
   `Link` para a mesma rota não remonta o componente, então `defaultValue`
   sozinho nunca reagiria. Estendido também a Cliente e Documento
   (antes só Processo tinha deep-link de aba).
6. **"Ações rápidas"** (`QuickActionsCard`) — Novo Processo (Cliente, já
   com `clienteId` travado) e Novo Documento/Novo Prazo (Processo,
   `processoId` pré-preenchido). Deliberadamente um Card com botões, não
   um `DropdownMenu` — aninhar `Dialog` dentro de `DropdownMenuItem` tem
   armadilhas conhecidas de foco no Radix; cada botão é o próprio
   `DialogTrigger` do formulário já existente (`LegalCaseFormDialog`,
   `UploadDialog`, `DeadlineFormDialog`), gated pela permissão real de
   criação (`case:create`/`document:create`), nunca um formulário
   duplicado.
7. **Filtros — `FilterBar` ganhou `activeCount`/`onClear`** (retrocompatível,
   props opcionais) — badge "N filtros ativos" + botão "Limpar filtros"
   aplicado em Clientes e Prazos como implementação de referência.
   Padronizar todas as listagens (persistência na URL inclusive) fica como
   pendência explícita — a maioria dos módulos que ganhariam filtro
   completo (Contratos, Serviços, ...) ainda não tem backend.
8. **Bug real de arquitetura pego pelo próprio ESLint**: a primeira versão
   de `SidebarContent` importava `useCurrentUser` direto de
   `@/features/auth` para ler permissões por grupo — violava
   `docs/frontend/01-arquitetura.md §1.4` (`components/` não pode importar
   `features/`), com regra já configurada no ESLint
   (`no-restricted-imports`) que barrou o build. Corrigido expondo
   `useCurrentPermissions()` em `hooks/use-permission.ts` (hooks/ pode
   importar features/, mesmo padrão que `useAnyPermission` já usava).
9. **Bug real de teste (condição de corrida)**: o primeiro teste de
   `SidebarContent` esperava por `findByRole('link', {name:'Dashboard'})`
   (item sem permissão, sempre visível, aparece no primeiro render) e só
   depois checava `getByText('PESSOAS')` — como PESSOAS depende de
   `client:read`/`member:read` (só chegam depois que `GET /me` resolve),
   a asserção rodava antes da permissão carregar e falhava
   intermitentemente. Corrigido trocando a primeira asserção para
   `findByText('PESSOAS')` (espera a real).
10. **21 testes novos** (139 → 160): `breadcrumbs` (3), `sidebar-content`
    (4), `related-panel` (3), `use-tab-deep-link` (3), `filter-bar` (3),
    `module-placeholder-page` (1), `client-detail-page` (2, novo arquivo —
    não existia spec antes), `document-detail-page` (1, novo arquivo), +1
    em `clients-page.spec.tsx` ("Limpar filtros").

### 0.5.10 Sprint 13 — Permission Engine (Prompt 12)

Detalhe completo do motor (backend) em
`docs/backend-implementation/21-permission-engine.md`. Do lado do
frontend, esta rodada **não criou nenhum hook/provider de autorização
novo** — `usePermission`/`useAnyPermission`/`useCurrentPermissions` (já
existiam desde o Prompt 11) continuam sendo a única forma de checar
permissão, agora só com mais chaves reais para consumir:

1. **`features/permissions/` (novo)** — tela administrativa completa em
   `/configuracoes` (rota já existia como `ModulePlaceholderPage` desde o
   Prompt 11, substituída pela tela real): aba "Perfis e Permissões"
   (`role:manage`) com lista de perfis + matriz de permissões por
   categoria (`PermissionMatrix`, desabilita — nunca esconde — uma chave
   que quem está editando não possui, mesmo "teto de privilégio" do
   backend) + criação de perfil customizado (`CreateRoleDialog`); aba
   "IA" (`AiUsageTab`, consome `GET /office/ai-usage` — a query
   `useAiUsage` já existia desde a Sprint 11 mas nunca tinha UI própria);
   aba "Simulador" (`simulation:use`).
2. **Simulador** — `stores/simulation.store.ts` (Zustand, sem `persist`
   de propósito) guarda o membro sendo simulado; `lib/api/client.ts`
   anexa `X-Simulate-Membro-Id` a toda requisição enquanto ativo (2
   linhas, reaproveitando o único cliente HTTP central já existente,
   nenhum interceptor/axios novo); `SimulationBanner`
   (`components/layout/`) fica montado dentro de `AppShell`, visível em
   toda a aplicação enquanto uma simulação está ativa. Trocar de/sair de
   simulação limpa todo o cache do TanStack Query (`queryClient.clear()`)
   — mais seguro do que invalidar seletivamente e arriscar uma tela
   mostrar dados da identidade anterior.
3. **`DashboardPage`** — `PORTFOLIO_METRICS_ROLES = ['OWNER','ADMIN','SOCIO']`
   (lista fixa de nomes de papel) virou `usePermission('report:metrics:read')`
   — exatamente o padrão que o Prompt 12 pede eliminar ("nunca usar
   permissões fixas"), corrigido no único lugar do frontend onde esse
   anti-padrão existia.
4. **Field Level Security de Cliente — zero código novo no frontend.** O
   backend agora redige CPF/CNPJ/endereço quando falta
   `client:read:sensitive` (retornando `null` em vez do valor), mas como
   esses campos já eram tipados `string | null` e já renderizavam via
   `value ?? '—'` nos componentes existentes (`ClientDetailPage`,
   `ClientsPage`), a redação do backend já aparece corretamente sem
   nenhuma mudança de componente — um efeito colateral positivo de nunca
   ter inventado um valor "sempre presente" para esses campos.
5. **MSW** — `mocks/handlers/permissions.ts` (novo, catálogo + ciclo de
   vida de papel) + `mocks/demo/handlers.ts` (mesmo conjunto, modo
   `dev:mock`); `mocks/handlers/team.ts` ganhou mutators exportados
   (`addRole`/`updateRoleFields`/`removeRole`) para as duas fontes de
   handler nunca terem duas cópias divergentes de `roles`.

**Achado real de teste (condição de corrida, mesma classe do bug já
corrigido em `SidebarContent` no Prompt 11):** `PermissionsAdminPage`
calculava `defaultValue` da `Tabs` a partir de `usePermission('role:manage')`
— como essa permissão só existe depois que `GET /me` resolve, o Radix
`Tabs` (que só lê `defaultValue` uma vez, no primeiro render) travava
sempre na aba "IA", mesmo para quem tinha `role:manage`. Corrigido
esperando `useCurrentUser()` carregar (skeleton) antes de montar as
`Tabs`, em vez de computar o valor inicial a partir de uma permissão
ainda não resolvida.

**Testes:** 178 reais (165 já existentes + 13 novos: `permission-matrix`
(4), `permissions-admin-page` (6, integração completa: seleção de perfil,
matriz desabilitada em perfil de sistema, criar perfil customizado,
salvar alterações, `ROLE_IN_USE`, aba IA), `simulator-tab` (2),
`simulation-banner` (2), `ai-usage-tab` (1), mais 2 em `client.spec.ts`
(header de simulação) e 1 novo em `dashboard-page.spec.tsx`
(`report:metrics:read`) — total líquido reconciliado em 178).

### 0.5.11 Sprint 14 — Configuration Engine (Prompt 13)

Detalhe completo do motor (backend) em
`docs/backend-implementation/22-configuration-engine.md`. Do lado do
frontend:

1. **`features/configuration/` (novo)** — 11 telas sob `/configuracoes/*`,
   uma rota por item do menu (não abas de uma página só, para bater com a
   estrutura de menu pedida pelo Prompt 13): `/configuracoes` (Dashboard
   das Configurações + Geral, combinados), `campos-extras`,
   `campos-obrigatorios`, `conjuntos-valores`, `categorias-tarefas`,
   `grupos-colaboradores`, `modelos-tarefa`, `feriados`, `financeiro`,
   `ia`, `permissoes`. Todas gated por `configuration:read` (visualizar) e
   `configuration:manage` (criar/editar/excluir) via o mesmo Permission
   Engine da Sprint 13 anterior — nenhuma autorização própria.
2. **`ConfigurationRouteGuard` (novo, `components/`)** — extrai o
   bloco `useAnyPermission` + toast + redirect que `(app)/configuracoes/
   page.tsx` já tinha desde o Prompt 12, reaproveitado pelas 10 novas
   rotas em vez de repetido 10 vezes.
3. **"Geral" (`/configuracoes`) virou o Dashboard das Configurações** —
   `ConfigurationDashboardPage` (Campos Extras/Categorias/Conjuntos/
   Modelos/Grupos/Usuários/Providers IA/Consumo IA/Últimas Alterações,
   tudo via `DashboardCard`/`Card`/`EmptyState`/`ErrorState` já
   existentes, nenhum componente novo) + `GeneralSettingsPage` (fuso
   horário/idioma/formato de data/moeda/dia de início da semana), lado a
   lado na mesma rota.
4. **"Perfis e Permissões"/"Simulador" migraram para `/configuracoes/
   permissoes`** — `PermissionsAdminPage` (Prompt 12) perdeu a aba "IA"
   (movida para `/configuracoes/ia`, junto da parametrização nova de IA)
   mas está inalterada internamente fora isso; quem não tem nenhuma das
   duas permissões vê um `EmptyState` em vez de uma `Tabs` vazia.
5. **`AiSettingsPage` (`/configuracoes/ia`)** — reaproveita `AiUsageTab`
   (Sprint 11/Prompt 12, componente inalterado) e adiciona a
   parametrização nova (provider padrão, modelo, cota mensal
   personalizada, exigir revisão humana), gated por `ai:manage`.
6. **`FinancialSettingsPage` (`/configuracoes/financeiro`)** — só chega
   até aqui quem tem `financeiro:read` (permissão catálogo-apenas desde o
   Prompt 12, ganha aqui seu primeiro consumidor real no frontend); editar
   exige `configuration:manage` — sem essa permissão os campos ficam
   somente leitura e o botão Salvar fica **ausente** (nunca desabilitado),
   reafirmando a regra literal do Prompt 13.
7. **6 telas de catálogo (Campos Extras, Conjuntos de Valores, Categorias
   de Tarefas, Grupos de Colaboradores, Modelos de Tarefa, Feriados)** —
   cada uma com sua própria tabela + diálogo de criação/edição (`useState`
   local, mesmo padrão leve de `CreateRoleDialog` do Prompt 12, não
   `react-hook-form`+zod — reservado a formulários de domínio maiores).
   Conjuntos de Valores e Grupos de Colaboradores usam layout lista+detalhe
   (mesmo padrão de `RolePermissionsPanel`).
8. **MSW** — `mocks/handlers/configuration.ts` (novo, fixtures) +
   bloco `configurationDemoHandlers` em `mocks/demo/handlers.ts` (modo
   `dev:mock`) — estado em memória independente, nunca compartilhado
   entre os dois, mesmo padrão de `permissions.ts`/`team.ts`.
9. **`config/navigation.ts`** — grupo CONFIGURAÇÕES passou de 1 item
   (`Configurações`, `office:update`) para 11 (`Geral` e mais 10),
   `Financeiro` gated especificamente por `financeiro:read` (mais
   restritivo que `configuration:read` dos demais itens do grupo).

**Exclusões conscientes** (mesmo padrão de escopo pragmático de todas as
rodadas): Campos Extras/Obrigatórios administráveis mas não conectados a
nenhum formulário real de Cliente/Processo; Modelos de Tarefa/Feriados
sem tela de negócio que os consuma ainda (módulos Tarefas e o cálculo de
dias úteis de Prazos não existem) — ver
`docs/backend-implementation/22-configuration-engine.md §22.6`.

**Testes:** 203 reais (178 já existentes + 25 novos: `extra-fields-page`
(3), `task-categories-page` (3), `holidays-page` (2), `value-sets-page`
(3), `collaborator-groups-page` (2), `task-templates-page` (2),
`required-fields-page` (1), `general-settings-page` (1),
`financial-settings-page` (2), `ai-settings-page` (2),
`configuration-dashboard-page` (1), `configuration-route-guard` (2), mais
1 em `sidebar-content.spec.tsx` novo — grupo CONFIGURAÇÕES renomeado/
expandido — e `permissions-admin-page.spec.tsx` teve o teste da aba IA
substituído por um teste confirmando sua ausência, sem mudar a contagem).

| Métrica | Valor |
|---|---|
| Arquivos TypeScript/TSX de produção criados | 40 (`features/configuration/` completo — 4 arquivos de api, 12 componentes, 1 índice — + 10 rotas novas sob `(app)/configuracoes/*` + `mocks/handlers/configuration.ts`) |
| Arquivos TypeScript/TSX de produção modificados | 9 (`(app)/configuracoes/page.tsx` reescrita, `config/navigation.ts`, `features/permissions/components/permissions-admin-page.tsx`, `mocks/handlers/identity.ts`, `mocks/demo/handlers.ts`, `mocks/server.ts`, `test/setup.ts`) |
| Arquivos de teste novos/modificados | 14 (25 casos de teste novos) |
| `npx vitest run` (suíte completa) | 58/58 suítes, **203/203 testes** — passou |
| `npx tsc --noEmit` | 0 erros |
| `npx eslint --max-warnings=0` | 0 erros |
| `npx next build` | Sucesso, 51 rotas (10 novas sob `/configuracoes/*`), todas `ƒ Dynamic` |
| Chamada real contra `apps/api/` (Postgres) | 0 (sem Postgres neste ambiente) — mesma limitação de todas as rodadas |

### 0.5.12 Sprint 15 — Task Engine (Prompt 14)

Detalhe completo (backend + frontend, diagramas/fluxos) em
`docs/task-engine.md`; changelog do backend em
`docs/backend-implementation/23-task-engine.md`. Do lado do frontend:

1. **`config/navigation.ts`** — o item plano "Tarefas" (grupo GESTÃO DO
   TEMPO) virou o grupo próprio "TAREFAS": Minhas Tarefas, Equipe, Kanban,
   Calendário, Templates (`/configuracoes/modelos-tarefa`, reaproveitado,
   nunca duplicado), Categorias (`/configuracoes/categorias-tarefas`,
   idem), Relatórios (placeholder).
2. **`features/tasks/` (novo)** — api layer completa (`tasks.api.ts` +
   `keys`/`queries`/`mutations`, mesmo padrão de `features/deadlines/`),
   `TaskFormDialog` (criação e edição no mesmo componente; checklist
   inicial e recorrência só aparecem no modo criação porque `PATCH
   /tasks/:id` não aceita esses campos; `fixedStatusId`/
   `fixedResponsavelId`/`fixedVinculo` permitem reaproveitá-lo do Kanban
   — coluna já pré-selecionada — e das Ações Rápidas de Cliente/Processo
   — vínculo já pré-selecionado), `TaskListPage` (compartilhada por
   Minhas Tarefas/Equipe via prop `scope`, filtros por status/categoria/
   prioridade/responsável/situação/favoritas), `TaskKanbanPage` (colunas
   vêm de `GET /tasks/config`, nunca fixas; drag-and-drop nativo HTML5),
   `TaskCalendarPage`, `TaskDetailPage` (7 abas: Detalhes, Checklist,
   Dependências, Vínculos, Timeline, Comentários, IA) e
   `CreateTaskFromTemplateDialog`.
3. **Achado de arquitetura — `CalendarView` genericizado.** O calendário
   de `features/deadlines/` (Sprint 08) era 100% específico de `Prazo`.
   Extraído para `components/data-display/calendar-view.tsx` como
   `CalendarView<T extends CalendarItem>` com accessor props (`getDate`/
   `isDone`/`isUrgent`/`renderDetail`/`getSubtitle`/`renderRowExtra`);
   `features/deadlines/components/calendar-view.tsx` virou uma casca fina
   sobre o componente genérico, sem mudar nenhum import em
   `deadlines-page.tsx` nem o comportamento visual.
4. **`FavoriteButton` também genericizado** — extraído de
   `features/documents/` (já era 100% agnóstico de domínio) para
   `components/data-display/favorite-button.tsx`, reaproveitado por
   Documentos e Tarefas.
5. **Generalizações de cross-cutting features** — `features/timeline/`
   ganhou a categoria `'tarefa'` e os 3 tipos de evento novos em
   `TIMELINE_TYPE_META` (`Record` exaustivo — esquecer uma chave quebra o
   build); `features/ai/` ganhou `tarefaId`/`'TAREFA'` em `AiSourceDTO`/
   `source-list.tsx` (as 5 opções de resumo de Tarefa já existiam em
   `AiSummaryPanel` desde antes desta rodada); `features/search/` ganhou
   `'tasks'` em `SearchResultType`/`SEARCH_GROUP_ORDER`/`prefix-scope.ts`
   (`t:`)/`command-palette.tsx`. `TaskTimelineTab` (novo, só leitura) não
   reaproveita `TimelineItemCard` porque ele é hardwired a mutations/URLs
   de Processo (fixar/excluir anotação manual — Tarefa não tem essa rota).
6. **Backend ganhou um endpoint que não existia nesta mesma rodada**:
   `GET /tasks/:id/timeline` (`ListTaskTimelineUseCase`, mais simples que
   o equivalente de Processo — Tarefa não tem projeção de `Prazo` para
   mesclar) — sem ele a aba Timeline de Tarefa não teria o que consumir.
7. **Dashboard (Home)** — `TaskSummaryCard` (Minhas/Equipe/Atrasadas/
   Hoje/Próximas/Concluídas + barra de produtividade, um card só, mesma
   economia de espaço de `WorkloadCard`) e `ContinueWorkingCard`
   ("Continuar trabalhando" — minhas pendentes por vencimento mais
   próximo, mesmo padrão de `RecentCasesCard`).
8. **Ações Rápidas** — "Nova tarefa" em `ClientDetailPage`/
   `LegalCaseDetailPage` via `TaskFormDialog` com `fixedVinculo`; painel
   "Relacionados" de ambas ganhou um item "Tarefas" apontando para
   `/tarefas/minhas?clienteId=`/`?processoId=` (deep-link de filtro, sem
   aba "Tarefas" dedicada dentro de Cliente/Processo).
9. **MSW** — `mocks/handlers/tasks.ts` (novo, registrado em `server.ts`/
   `test/setup.ts`) + bloco `tasksDemoHandlers` em `mocks/demo/handlers.ts`;
   `mocks/handlers/identity.ts`/`mocks/demo/handlers.ts` ganharam as 7
   permissões `task:*` **e `comment:create`** (nunca exercitada pelo
   frontend antes — Comments não tinha nenhuma tela real até a aba
   Comentários de Tarefa) no usuário OWNER padrão.

**Exclusões conscientes** (mesmo padrão de escopo pragmático de todas as
rodadas): Relatórios de Tarefas é placeholder; aba Vínculos aceita colar o
ID do recurso diretamente (sem busca/autocomplete) para os 9 tipos; sem
edição/exclusão/menções de comentário — ver
`docs/backend-implementation/23-task-engine.md §23.9`.

**Testes:** 216 reais (203 já existentes + 13 novos: `task-list-page` (5),
`task-kanban-page` (1), `task-calendar-page` (1), `task-detail-page` (6)).

| Métrica | Valor |
|---|---|
| Arquivos TypeScript/TSX de produção criados | 29 (`features/tasks/` completo — 17 arquivos — + 7 rotas novas sob `(app)/tarefas/*` + 2 componentes compartilhados genericizados (`calendar-view.tsx`, `favorite-button.tsx`) + 2 cards de Dashboard + `mocks/handlers/tasks.ts`) |
| Arquivos TypeScript/TSX de produção modificados | 19 (`config/navigation.ts`, `dashboard-page.tsx`, `features/deadlines/components/calendar-view.tsx` — virou casca fina —, `features/timeline/{api/timeline.api.ts,domain/timeline-meta.ts}`, `features/ai/{api/ai.api.ts,components/source-list.tsx}`, `features/search/{api/search.api.ts,domain/group-icons.tsx,domain/prefix-scope.ts,components/{search-preview-panel.tsx,command-palette.tsx}}`, `features/clients/components/client-detail-page.tsx`, `features/legal-cases/components/legal-case-detail-page.tsx`, `features/configuration/components/task-templates-page.tsx` — comentário desatualizado corrigido —, `mocks/{server.ts,handlers/identity.ts,demo/handlers.ts}`, `test/setup.ts`) |
| Arquivos de teste novos/modificados | 4 (13 casos de teste novos) |
| `npx vitest run` (suíte completa) | 62/62 suítes, **216/216 testes** — passou |
| `npx tsc --noEmit` | 0 erros |
| `npx eslint "src/**/*.{ts,tsx}"` | 0 erros |
| `npx next build` | Sucesso, 7 rotas novas sob `/tarefas/*`, todas `ƒ Dynamic` |
| Chamada real contra `apps/api/` (Postgres) | 0 (sem Postgres neste ambiente) — mesma limitação de todas as rodadas |

### 0.5.13 Sprint 16 — UX Polish (Prompt 14.5)

**Escopo:** exclusivamente `apps/web/**` — nenhuma entidade, rota,
permissão ou contrato de API novo; nenhuma regra de negócio alterada.
Objetivo único: scrollbars minimalistas (nunca a barra tradicional do SO),
transições padronizadas (150–250ms) e microinterações (hover/pressed/
focus/loading) em todo o app — ver documento dedicado
[`ux-polish.md`](ux-polish.md) para o mapeamento completo (FASE 0),
decisões e a lista de arquivos.

**Achado principal (não é bug de execução, é dívida silenciosa
encontrada na FASE 0):** `features/folders/components/folder-tree-
item.tsx` usava classes de `tailwindcss-animate` (`animate-in fade-in
slide-in-from-top-1 duration-150`) — mas essa lib **nunca foi dependência
do projeto** (confirmado em `package.json` e por busca em todo
`src/`: nenhum outro arquivo usa esse vocabulário). Sem o plugin, o
Tailwind não gera nenhum utilitário para esses nomes — a árvore de pastas
expandia/recolhia sem nenhuma animação desde que foi escrita, um efeito
visual "morto" que nunca funcionou. Corrigido generalizando um pequeno
sistema de transições próprio em `styles/globals.css` (classes `.transition-
overlay`/`.transition-dialog`/`.transition-sheet-{left,right}`/
`.transition-popover`/`.transition-dropdown`/`.transition-collapse`/
`.transition-fade-in`, todas orientadas por `data-state` do Radix, que já
adia o desmonte do elemento até a animação de saída terminar via
`@radix-ui/react-presence` — o mesmo mecanismo que o plugin usaria),
reaplicado em `Dialog`/`Sheet`/`DropdownMenu`/`Select`/`Tooltip`/`Tabs`/
`FolderTreeItem` de uma vez só.

**Duplicação encontrada e generalizada (FASE 0):** `TimelineItemCard`
(Processo) e o card recém-criado de `TaskTimelineTab` (Tarefa, Sprint 15)
reimplementavam manualmente o visual do primitivo `Card`
(`rounded-lg border border-border bg-card p-3` com sombra/hover
escritos à mão). Ambos migrados para renderizar `<Card>` diretamente —
qualquer ajuste futuro de hover/sombra/borda do Card se propaga
automaticamente para os dois, sem precisar tocá-los de novo.

**Componente novo:** `ScrollArea` (`components/data-display/
scroll-area.tsx`) — generalizado uma única vez para os dois lugares que
o prompt pede com comportamento dedicado ("aparece durante o gesto, some
ao parar"): Sidebar (vertical) e o board do Kanban (horizontal, com
wheel-vertical-vira-horizontal e arrastar o fundo para rolar, sem
interferir no Drag and Drop nativo dos cartões). Todo outro lugar com
scroll (tabelas, diálogos, listas, árvore) usa só a classe CSS
`.scrollbar-fade` (revela no hover) — sem pagar o custo de um componente
com listeners onde o comportamento extra não é necessário.

**Verificação de não regressão no backend:** `npx nest build` e `npx
jest` executados mesmo sem nenhum arquivo de `apps/api/` ter sido tocado
(exigido pelo prompt) — resultado no §0.4.6.

### 0.5.14 Sprint 17 — Clientes e Contatos

**Escopo:** exclusivamente `features/clients/` + as poucas mudanças de
infraestrutura que uma feature nova de filtros-na-URL exige em qualquer
app (`app/layout.tsx` ganhou `<NuqsAdapter>`, `test/render.tsx` ganhou
`<NuqsTestingAdapter>`) + rótulo da Sidebar. Nenhum primitivo de
`components/ui/*` foi alterado — ver documento dedicado
[`24-clients-contacts.md`](../backend-implementation/24-clients-contacts.md)
(backend) para o desenho completo do módulo; esta seção cobre só as
decisões e achados do lado do frontend.

**`nuqs` — primeiro uso real.** A dependência estava declarada desde
sempre (`package.json`) mas nenhum arquivo a importava (confirmado por
busca em todo `src/` na FASE 0). Os filtros de `/clientes` são o primeiro
consumidor: `useQueryStates` sincroniza busca/tipo/categoria/ordenação
(filtros "rápidos", aplicados ao digitar/selecionar — mesmo debounce que
já existia) e um segundo grupo de 16 filtros avançados (nome/telefone/
celular/e-mail/CPF/CNPJ/nome da mãe/nome do pai/profissão/dia-mês-ano de
nascimento/data e período de cadastro/última alteração), estes últimos
com estado "rascunho" num `Sheet` (drawer), só escritos na URL quando o
usuário clica "Consultar" — evita uma requisição por tecla digitada em
16 campos.

**Achado de teste (não óbvio, custou tempo de investigação):**
`NuqsTestingAdapter` tem a prop `hasMemory` com **default `false`** — sem
ela, "os parâmetros de busca ficam congelados no valor inicial"
(documentação do próprio pacote), ou seja, `setQuick(...)` parecia não
fazer nada nos testes (o valor lido de volta nunca mudava), quebrando os
2 testes que dependiam de filtrar/limpar a busca. Corrigido com
`<NuqsTestingAdapter hasMemory>` em `test/render.tsx` — sem isso, **todo**
teste futuro que use `useQueryState(s)` teria o mesmo problema.

**Duplicação encontrada e eliminada (FASE 0):** `client-detail-page.tsx`
tinha seu próprio `InfoRow` local, quase idêntico ao `PropertyRow`
compartilhado (`components/data-display/property-row.tsx`, extraído no
Prompt 14/Task Engine) — uma decisão documentada explicitamente *na época*
como "visualmente distinto, mantido separado de propósito". Nesta
reescrita completa do módulo (pedida para servir de "referência de
qualidade para os próximos módulos"), a distinção deixou de valer a pena:
`InfoRow` foi removido, tudo migrado para `PropertyRow`. `StatusBadge`
(status de ciclo de vida) deliberadamente **não** foi reaproveitado para
"categoria" (Cliente/Contato/Cliente+Contato) — são dimensões diferentes
do dado (uma é lifecycle, outra é uma classificação) — um pequeno
`CategoryBadge` local em `clients-page.tsx` cobre isso sem forçar um
primitivo compartilhado a carregar dois vocabulários.

**Componentes/hooks reaproveitados sem alteração:** `FavoriteButton`
(Prompt 14, já era 100% agnóstico de domínio), `DataTable`, `FilterBar`,
`Card`/`CardHeader`/`CardContent`, `Tabs`, `Sheet` (drawer de filtros
avançados — primeiro uso fora de navegação mobile), `useTabDeepLink`,
`useDebouncedValue`, `AiSummaryPanel` (sem tocar em `features/ai/`),
`useTasks({ clienteId })` (já suportava o filtro desde o Task Engine —
consumido diretamente de `features/tasks/api/queries`, sem modificar
nenhum arquivo de `features/tasks/`), `useExtraFields('CLIENTE')`
(Configuration Engine — primeiro consumidor real do valor, não só do
metadado).

### 0.5.15 Correção — Edição completa em Clientes e Contatos

FASE 0 (matriz schema→DTOs→Zod→formulário→view) confirmou que
`client-form-dialog.tsx` já era o único formulário compartilhado por Novo
Cliente/Novo Contato/Editar, e que o backend (`UpdateClientUseCase`) já
persistia 100% dos campos editáveis — ver
[`24-clients-contacts.md §24.10`](../backend-implementation/24-clients-contacts.md)
para a causa raiz completa (estava só nos mocks: `GET /clients/:id`
sobrescrevia endereço/nomeSocial/razaoSocial/observações com valores
fixos, ignorando o que `PATCH` gravava). Do lado do frontend:

- `mocks/handlers/clients.ts` (teste) e `mocks/demo/handlers.ts` (modo
  demo, o ambiente real deste projeto sem Postgres) corrigidos para
  persistir e devolver esses campos de verdade.
- `client-form-dialog.tsx`: campo **Responsável** adicionado (`useMembers`
  de `features/team`, mesmo padrão de `legal-case-form-dialog.tsx`) —
  existia no schema/DTO desde o Sprint 17, mas nunca teve um controle de
  UI. Campo **Tipo** passou a ficar bloqueado durante a edição
  (`disabled={isEditing}`) — produto nunca definiu um fluxo de migração
  PF↔PJ; bloquear evita dado órfão do tipo anterior sobrevivendo em
  silêncio no banco.
- `client-form-dialog.spec.tsx` (novo) — primeira suíte de teste deste
  componente; cobre carregamento de valores completos ao editar,
  persistência via PATCH, bloqueio do Tipo, e que Novo/Editar reutilizam a
  mesma estrutura de abas e o mesmo padrão de `DialogContent`
  (`max-h-[85vh]`/`overflow-y-auto`, ver Prompt de responsividade dos
  Dialogs).

## 0.6 Índice

| # | Arquivo |
|---|---|
| 01 | [Bootstrap](01-bootstrap.md) |
| 02 | [Design System](02-design-system.md) |
| 03 | [HTTP e OpenAPI](03-http-openapi.md) |
| 04 | [Autenticação](04-auth.md) |
| 05 | [Office Context](05-office-context.md) |
| 06 | [Shell e Navegação](06-shell-navigation.md) |
| 07–10 | Team, Dashboard, Users *(ver 00-status.md, sem doc dedicado ainda)* |
| 11–12 | Clients, Legal Cases *(implementados no Prompt 7 — ver `features/clients`/`features/legal-cases`, sem doc dedicado ainda)* |
| 13 | Deadlines, Timeline *(implementados na Sprint 08 — ver `features/deadlines`/`features/timeline`, sem doc dedicado ainda)* |
| 14 | Documents, Folders *(implementados na Sprint 09 — ver `features/documents`/`features/folders`, sem doc dedicado ainda)* |
| 17 | Search *(implementado na Sprint 10 — ver `features/search`, sem doc dedicado ainda)* |
| 18 | AI *(implementado na Sprint 11 — ver `features/ai`, sem doc dedicado ainda)* |
| 15–16 | Comments/Tags, Notifications/SSE *(pendentes)* |
| 18 | [Testes](18-tests.md) |
| 19 | [Decisões e Riscos](19-decisions.md) |
| 20 | [Docker e CI](20-docker-ci.md) |
| 21 | [Contexto para a próxima rodada](21-context-next-step.md) |
| — | Permission Engine *(Sprint 13 — ver §0.5.10 acima, sem doc dedicado no frontend)* |
| — | Configuration Engine *(Sprint 14 — ver §0.5.11 acima, sem doc dedicado no frontend)* |
| — | Task Engine *(Sprint 15 — ver §0.5.12 acima e [`docs/task-engine.md`](../task-engine.md), documento dedicado cobrindo backend + frontend)* |
| — | UX Polish *(Sprint 16 — ver §0.5.13 acima e [`ux-polish.md`](ux-polish.md))* |
| — | Clientes e Contatos *(Sprint 17 — ver §0.5.14 acima e [`docs/backend-implementation/24-clients-contacts.md`](../backend-implementation/24-clients-contacts.md))* |

---

**Próximo:** [01-bootstrap.md](01-bootstrap.md)
