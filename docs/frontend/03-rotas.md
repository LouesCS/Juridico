# 03 — Árvore Oficial de Rotas

Reafirma a árvore de telas já oficial em
[`../03-fluxos-e-telas.md §3.10`](../03-fluxos-e-telas.md) — esta seção
não redefine rotas, apenas detalha layout/dado/permissão/estado por rota
para orientar a implementação. Uma adição pontual (não uma redefinição):
`/prazos` como visão agregada, respaldada pelo endpoint real `GET
/v1/deadlines` já contratado em `docs/api/09-legal-cases.md` — o
Dashboard precisa de um destino para "ver todos os prazos" que a árvore
original não nomeava explicitamente.

## 3.1 Públicas (`(public)`)

| Rota | Objetivo | Dados | Ações |
|---|---|---|---|
| `/login` | Autenticar | — | `POST /auth/login`, link recuperar senha, OAuth |
| `/registro` | Criar usuário + primeiro escritório | — | `POST /auth/register` |
| `/esqueci-senha` | Solicitar reset | — | `POST /auth/password-recovery` (sempre 202, nunca revela se e-mail existe) |
| `/redefinir-senha/[token]` | Definir nova senha | valida token no submit | `POST /auth/password-reset` |
| `/verificar-email/[token]` | Confirmar e-mail | valida token no load | endpoint pendente no backend — ver [31-decisions.md §31.1](31-decisions.md) |
| `/convite/[token]` | Aceitar convite | detalhe do convite via token | `POST /invitations/:token/accept` |
| `/auth/callback/[provedor]` | Retorno OAuth | troca code por sessão | Route Handler — ver [04-app-router.md §4.5](04-app-router.md) |

Layout: `(public)/layout.tsx` — sem Sidebar/Topbar, card centralizado.
Todas: sem estado vazio (são formulários); erro = inline no formulário
(nunca redirect para `error.tsx` — usuário não pode perder o que digitou).

## 3.2 Onboarding (`(onboarding)`)

| Rota | Objetivo | Permissão |
|---|---|---|
| `/onboarding/escritorio` | Completar dados do escritório recém-criado | usuário autenticado, `OWNER` do escritório em `TRIAL` |
| `/onboarding/equipe` | Convidar primeiros membros (opcional, "pular" disponível) | idem |
| `/onboarding/tour` | Tour guiado do produto (opcional) | idem |

Layout próprio, sem Sidebar completa (barra de progresso do onboarding no
lugar). Redirecionamento: usuário com escritório fora de `TRIAL` que tente
acessar `/onboarding/*` é redirecionado para `/` pelo middleware.

## 3.3 Autenticadas (`(app)`)

### Dashboard

| | |
|---|---|
| Rota | `/` |
| Layout | `(app)/layout.tsx` (AppShell) |
| Dados | `GET /me` (já resolvido pelo layout) + queries por bloco (prazos, processos, atividade, métricas, documentos, notificações) |
| Permissões | Blocos individuais somem (não desabilitam) por permissão — ver [14-dashboard.md](14-dashboard.md) |
| Loading | Skeleton por bloco, independente |
| Empty | Por bloco — 3 cards de ação no primeiro uso |
| Erro | Por bloco — "Tentar novamente", nunca a tela inteira |
| Ações | `+ Novo Processo`, `+ Novo Cliente` |

### Processos

| Rota | Objetivo | Permissão | Ações principais |
|---|---|---|---|
| `/processos` | Lista + filtros | `case:read:{escopo}` | `+ Novo Processo`, filtros, busca local |
| `/processos/novo` | Cadastro | `case:create` | Wizard multi-etapa |
| `/processos/[id]` (layout) | Header + abas persistentes | `case:read:{escopo}` — **404 se segredo de justiça e sem acesso** | `Resumir com IA`, `+ Documento`, `+ Prazo`, `⋮ Mais ações` |
| `/processos/[id]` (Visão Geral) | Resumo por IA + metadados + próximos prazos | idem | — |
| `/processos/[id]/timeline` | Linha do tempo | idem | filtro por tipo |
| `/processos/[id]/documentos` | Documentos do processo | `document:read:{escopo}` | `+ Documento` |
| `/processos/[id]/prazos` | Prazos do processo | idem | `+ Prazo`, concluir/reabrir/cancelar |
| `/processos/[id]/partes` | Partes do processo | idem | `+ Parte` |
| `/processos/[id]/comentarios` | Comentários | `comment:create` para escrever | campo sempre visível no rodapé |
| `/processos/[id]/historico` | Auditoria do processo | `audit:read` (ausente → aba não aparece) | somente leitura |
| `/processos/[id]/editar` | Edição de metadados | `case:update`, requer `If-Match` (versão) | conflito `409` mapeado para banner "atualizado por outra pessoa" |

Recurso sem acesso (segredo de justiça, fora do tenant, inexistente): as
três situações renderizam o **mesmo** `not-found.tsx` — nunca revelar qual
delas ocorreu (reafirma [06-autorizacao.md §6.4](06-autorizacao.md)).

### Prazos (agregado)

| | |
|---|---|
| Rota | `/prazos` |
| Objetivo | Todos os prazos do usuário/equipe, cross-processo (fonte do "ver todos" do Dashboard) |
| Dados | `GET /v1/deadlines` |
| Permissão | `case:read:{escopo}` (herdado do processo de cada prazo) |
| Ações | Filtro por responsável/prioridade/vencimento, concluir/reabrir inline |

### Documentos

| Rota | Objetivo | Permissão |
|---|---|---|
| `/documentos` | Biblioteca geral + pastas + filtros | `document:read:{escopo}` |
| `/documentos/[id]` | Preview + metadados | idem — `404` se `CONFIDENCIAL` sem acesso |
| `/documentos/[id]/versoes` | Histórico de versões | idem |

### Clientes

| Rota | Objetivo | Permissão |
|---|---|---|
| `/clientes` | Lista + filtros | `client:read` |
| `/clientes/novo` | Cadastro (modal na maioria dos fluxos, também página própria para cadastro completo) | `client:create` |
| `/clientes/[id]` | Perfil com abas Visão Geral/Processos/Documentos/Contato/Histórico | `client:read` |

### Busca, Notificações, Perfil

| Rota | Objetivo |
|---|---|
| `/busca` | Resultado completo de busca avançada (a busca do dia a dia é o Command Palette ⌘K, sempre overlay) |
| `/notificacoes` | Histórico completo, paginado por cursor |
| `/perfil`, `/perfil/preferencias`, `/perfil/seguranca`, `/perfil/privacidade` | Dados pessoais, preferências, sessões/MFA, LGPD |

### Admin (`OWNER`/`ADMIN`/`SOCIO` conforme rota)

| Rota | Objetivo | Permissão |
|---|---|---|
| `/admin/escritorio` | Dados do escritório | `office:update` |
| `/admin/usuarios` | Membros, convites, desativação | `member:read`, `member:invite`, `member:remove` |
| `/admin/perfis` | Papéis e permissões | `member:update-role` (leitura: `member:read`) |
| `/admin/auditoria` | Log de auditoria + exportação | `audit:read` |
| `/admin/integracoes` | SSO, provedores OAuth | `office:update` |
| `/admin/faturamento` | Plano e cotas | `office:read` (billing ainda não contratado — ver [31-decisions.md](31-decisions.md)) |

Item "Admin" **ausente** da Sidebar (não desabilitado) para quem não tem
nenhuma das permissões acima — reafirma `docs/ux/04-navigation.md §4.1`.

## 3.4 Overlays globais (não são rotas, mas navegáveis)

Command Palette (⌘K), Painel de Notificações (drawer), Menu de Usuário,
Seletor de Escritório — todos client-side, sem URL própria (deep link para
notificação específica usa `?notificationId=` como query param consumido
pelo drawer, não uma rota nova).

---

**Anterior:** [02-estrutura-pastas.md](02-estrutura-pastas.md) · **Próximo:** [04-app-router.md](04-app-router.md)
