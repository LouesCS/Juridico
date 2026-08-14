# 14 — Dashboard

Reafirma integralmente `docs/ux/05-dashboard.md` — este documento só cobre
a arquitetura de dados/componentes, não redefine o comportamento de tela.

## 14.1 Status de backend

Nenhum endpoint agregado de dashboard existe hoje (nenhum módulo de
conteúdo está implementado — ver
[31-decisions.md §31.1](31-decisions.md)). Cada bloco é montado a partir
do endpoint do módulo correspondente quando este existir; até lá, todos
os blocos consomem MSW (ver [28-mocks.md](28-mocks.md)).

## 14.2 Composição — um Card independente por bloco, nunca uma query única

```
features/dashboard/
├── components/
│   ├── critical-deadlines-block.tsx     → GET /v1/deadlines?dataVencimento[lte]=+7d
│   ├── my-cases-block.tsx               → GET /v1/legal-cases?responsavelId=me
│   ├── recent-activity-block.tsx        → GET /v1/legal-cases/:id/timeline agregada (ou endpoint próprio, a confirmar com o backend — ver 31-decisions.md)
│   ├── portfolio-metrics-block.tsx      → agregados — endpoint ainda não contratado, ver 31-decisions.md §31.6
│   ├── recent-documents-block.tsx       → GET /v1/documents?sort=-criadoEm&limit=5
│   ├── unread-notifications-block.tsx   → GET /v1/notifications/unread-count + GET /v1/notifications?limit=3
│   └── quick-actions-block.tsx          → sem dado remoto
└── index.ts
```

Cada bloco é seu próprio `<Suspense>` boundary com `ErrorBoundary` — um
bloco falhando nunca derruba os outros (reafirma
`docs/ux/05-dashboard.md`: "Loading = skeleton por bloco... Error = por
bloco, outros blocos não afetados"). Nenhum dos blocos compartilha uma
query "dashboard geral" — isso violaria a independência de estado exigida
pela própria especificação de UX.

## 14.3 Composição por papel

`docs/ux/05-dashboard.md §5.9` já define variação por papel (Admin sem
"Meus Processos", Estagiário só com escopo "Atribuídos", métricas de
carteira só para Owner/Admin/Sócio). Implementado como composição
condicional dos blocos em `dashboard-page.tsx` usando `PermissionGate`
(ver [06-autorizacao.md §6.3](06-autorizacao.md)) — nunca `if (role ===
'ADMIN')` espalhado dentro de cada bloco.

## 14.4 Performance

Meta "visualmente completo em <1s" (`docs/ux/05-dashboard.md`) é o
orçamento de performance mais apertado do produto — usa streaming SSR
(cada bloco resolve via `Suspense` no servidor, reafirma
[26-performance.md §26.1](26-performance.md)) em vez de esperar todas as
seis queries resolverem antes do primeiro paint.

---

**Anterior:** [13-design-system.md](13-design-system.md) · **Próximo:** [15-clients.md](15-clients.md)
