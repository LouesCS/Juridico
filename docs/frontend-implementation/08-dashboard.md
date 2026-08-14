# 08 — Dashboard

## Implementado e testado

`src/app/(app)/page.tsx` agora renderiza `features/dashboard`
(`DashboardPage`), substituindo o placeholder do Prompt 6B. Reafirma o
layout de `docs/ux/05-dashboard.md §5.2` (grid 2 colunas desktop, 1
coluna empilhada abaixo disso) e o princípio "uma falha num card nunca
trava os demais" (§5.2) — cada widget usa sua própria `useQuery`, isolada
das outras.

```text
src/features/dashboard/
  api/{dashboard.api.ts, keys.ts, queries.ts}
  components/
    dashboard-card.tsx          # wrapper: título + selo Real/Mock + loading/erro/vazio
    greeting-header.tsx         # real
    team-summary-card.tsx       # real
    deadlines-card.tsx          # mock (mas endpoint documentado, ver abaixo)
    recent-cases-card.tsx       # mock
    recent-documents-card.tsx   # mock
    recent-activity-card.tsx    # mock
    portfolio-metrics-card.tsx  # mock, só Owner/Admin/Sócio
    notifications-card.tsx      # mock
    dashboard-page.tsx
  index.ts
```

## Real vs. mock — sinalizado explicitamente na UI

Cada `DashboardCard` mostra um selo "Dados reais" ou "Mock" no cabeçalho
— nunca misturado sem identificação, exigência literal do Prompt 6C.

| Card | Fonte | Endpoint |
|---|---|---|
| Saudação + atalhos | **Real** | `GET /me` (`useCurrentUser`) |
| Equipe | **Real** | `GET /members` (reaproveita `useMembers` de `features/team`) — só aparece com `member:read` |
| Prazos Críticos | Mock | `GET /v1/deadlines` — **este path é documentado** em `docs/api/09-legal-cases.md §9.4` ("endpoint que sustenta o bloco Prazos Críticos do Dashboard"); o handler MSW segue o path real, só o backend ainda não o implementa |
| Meus Processos, Documentos Recentes, Atividade Recente, Métricas de Carteira, Notificações | Mock | `/dashboard-mock/*` — namespace deliberadamente fictício (não existe no backend nem em nenhum doc), para deixar claro que a forma exata do dado é ilustrativa até Legal Cases/Documents/Timeline/Notifications existirem de verdade |

Nenhum endpoint agregado novo foi inventado no backend — os cards mock
usam handlers MSW registrados tanto em teste (`mocks/server.ts`) quanto
em desenvolvimento (`mocks/browser.ts`, que ganhou conteúdo real pela
primeira vez nesta rodada).

## Isolamento de falha por card — verificado com teste real

`dashboard-page.spec.tsx` força `GET /v1/deadlines` a retornar 500 e
confirma que o card "Prazos Críticos" mostra `ErrorState` **enquanto os
demais cards continuam renderizando normalmente** (ex.: "Meus
Processos" segue de pé) — não é uma alegação, é o comportamento
observado no teste.

## Permissão e papel

- **Equipe**: some (não desabilita) sem `member:read`.
- **Métricas de Carteira**: some sem papel `OWNER`/`ADMIN`/`SOCIO`
  (`docs/ux/05-dashboard.md §5.3` — "Owner, Admin, Sócio").
- **Atalhos**: "Convidar equipe" só aparece com `member:invite`;
  "Processos"/"Clientes" sempre aparecem (rotas stub já existem, sem
  gate de permissão de leitura própria ainda porque os módulos reais
  não existem).

## Não implementado / simplificações desta rodada

- **Atalhos "+ Novo Processo"/"+ Novo Cliente"** (`docs/ux/05-dashboard.md
  §5.2`) — não existem rotas `/processos/novo`/`/clientes/novo` ainda
  (Legal Cases/Clients são as Etapas 11/12, não alcançadas); os atalhos
  desta rodada linkam para as listagens (`/processos`, `/clientes`), não
  para formulários de criação inexistentes.
- **KPIs com tendência** (seta de alta/baixa) — `PortfolioMetricsCard`
  mostra só os 4 números, sem comparação com período anterior.
- **Semáforo de urgência dos prazos** — implementado (🔴≤2 dias / 🟡≤7
  dias / ⚪ demais), mas só como cor de bolinha, sem o emoji literal do
  mockup em `docs/ux/05-dashboard.md`.

## Testes reais

8 testes novos (`dashboard-page.spec.tsx` + `keys.spec.ts`): renderização
completa (saudação, escritório ativo, cards real+mock), seção vazia,
erro parcial não bloqueia os demais cards, loading parcial (skeleton
visível antes do endpoint responder), ausência do card de Equipe sem
permissão, ausência do card de Métricas sem papel elegível, chaves de
query escopadas por `officeId`.

---

**Anterior:** [07-team.md](07-team.md) · **Próximo:** [09-users.md](09-users.md)
