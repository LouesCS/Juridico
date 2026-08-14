# 04 — Arquitetura Frontend

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript 5 (strict) · Tailwind CSS 4 ·
shadcn/ui + Radix · TanStack Query 5 · Zustand · React Hook Form + Zod · Vitest +
Testing Library + Playwright.

---

## 4.1 Princípios arquiteturais

1. **Server-first.** Renderizar no servidor por padrão; `"use client"` é exceção
   justificada (interatividade, estado local, browser API). Menos JS no cliente =
   mais rápido no notebook do escritório.
2. **Feature-first, não type-first.** Organizar por domínio (`features/processos`),
   não por tipo de artefato (`components/`, `hooks/` globais). Módulo que muda
   junto mora junto.
3. **Fronteiras explícitas.** Uma feature só expõe o que está no seu `index.ts`.
   Import entre features passa pela API pública, nunca por caminho interno.
4. **Estado no lugar certo.** Servidor ≠ cliente ≠ URL ≠ formulário. Confundir
   isso é a principal causa de complexidade acidental em React.
5. **Acessibilidade por construção.** Radix como base primitiva garante ARIA,
   foco e teclado sem reimplementação.
6. **Tipos derivados do contrato.** Os tipos de API são gerados do OpenAPI do
   backend — não escritos à mão e nunca duplicados.

---

## 4.2 Estrutura de pastas

```
apps/web/
├── src/
│   ├── app/                          # Roteamento — apenas composição
│   │   ├── (auth)/                   # Route group público
│   │   │   ├── login/page.tsx
│   │   │   ├── cadastro/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (onboarding)/
│   │   ├── (app)/                    # Route group autenticado
│   │   │   ├── layout.tsx            # AppShell: sidebar, topbar, providers
│   │   │   ├── page.tsx              # Dashboard
│   │   │   ├── processos/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── error.tsx
│   │   │   │   ├── novo/page.tsx
│   │   │   │   └── [id]/
│   │   │   │       ├── layout.tsx    # Header do processo + abas
│   │   │   │       ├── page.tsx
│   │   │   │       ├── timeline/page.tsx
│   │   │   │       └── ...
│   │   │   ├── documentos/
│   │   │   ├── clientes/
│   │   │   ├── busca/
│   │   │   ├── perfil/
│   │   │   └── admin/
│   │   ├── api/                      # BFF: apenas rotas que precisam de segredo
│   │   │   ├── auth/[...]/route.ts
│   │   │   └── upload/presign/route.ts
│   │   ├── layout.tsx                # Root: fontes, tema, providers globais
│   │   ├── not-found.tsx
│   │   └── global-error.tsx
│   │
│   ├── features/                     # ⭐ Coração da aplicação
│   │   ├── auth/
│   │   │   ├── api/                  # Chamadas + hooks de query/mutation
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── schemas/              # Zod
│   │   │   ├── types/
│   │   │   └── index.ts              # ⭐ API pública da feature
│   │   ├── dashboard/
│   │   ├── processos/
│   │   │   ├── api/
│   │   │   │   ├── processos.api.ts
│   │   │   │   ├── queries.ts        # useProcessos, useProcesso
│   │   │   │   └── mutations.ts      # useCriarProcesso, ...
│   │   │   ├── components/
│   │   │   │   ├── processo-card.tsx
│   │   │   │   ├── processo-form/
│   │   │   │   ├── processo-timeline/
│   │   │   │   ├── processo-filtros.tsx
│   │   │   │   └── processo-tabela.tsx
│   │   │   ├── hooks/
│   │   │   │   └── use-filtros-processo.ts   # sincronizado com a URL
│   │   │   ├── schemas/processo.schema.ts
│   │   │   ├── utils/cnj.ts          # validação de número CNJ
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── documentos/
│   │   ├── busca/
│   │   ├── ia/
│   │   ├── notificacoes/
│   │   ├── clientes/
│   │   ├── perfil/
│   │   └── admin/
│   │
│   ├── components/                   # Compartilhado entre ≥2 features
│   │   ├── ui/                       # shadcn/ui — primitivos, não editar sem motivo
│   │   ├── layout/                   # AppShell, Sidebar, Topbar, PageHeader
│   │   ├── data-display/             # DataTable, EmptyState, StatCard, Timeline
│   │   ├── feedback/                 # Skeletons, ErrorState, Toaster, ConfirmDialog
│   │   └── forms/                    # FormField, FileDropzone, DateRangePicker
│   │
│   ├── lib/                          # Infraestrutura sem regra de negócio
│   │   ├── api/
│   │   │   ├── client.ts             # fetch tipado, interceptors, refresh
│   │   │   ├── errors.ts             # normalização de erro da API
│   │   │   └── generated/            # ⭐ tipos gerados do OpenAPI
│   │   ├── auth/                     # sessão, guardas, helpers de token
│   │   ├── query/                    # QueryClient, defaults, chaves
│   │   ├── utils/                    # cn(), formatadores, datas
│   │   └── validators/               # CPF, CNPJ, OAB, CNJ
│   │
│   ├── stores/                       # Zustand — estado global de UI
│   │   ├── ui.store.ts               # sidebar, tema, densidade
│   │   ├── command-palette.store.ts
│   │   └── tenant.store.ts           # escritório ativo
│   │
│   ├── config/
│   │   ├── site.ts
│   │   ├── navigation.ts             # menu derivado de permissões
│   │   └── env.ts                    # validação de env com Zod (falha no boot)
│   │
│   ├── hooks/                        # Hooks genéricos
│   │   ├── use-debounce.ts
│   │   ├── use-media-query.ts
│   │   ├── use-hotkey.ts
│   │   └── use-permissao.ts
│   │
│   ├── types/
│   │   ├── api.d.ts
│   │   └── global.d.ts
│   │
│   ├── styles/globals.css            # tokens do design system
│   └── middleware.ts                 # proteção de rota, tenant, headers
│
├── e2e/                              # Playwright
├── public/
└── (configs)
```

### Regras de fronteira (ESLint `import/no-restricted-paths`)

```
app/         → pode importar features, components, lib, config
features/A   → pode importar components, lib, config, hooks
features/A   → PODE importar features/B SOMENTE via features/B (index.ts)
components/  → NÃO pode importar features
lib/         → NÃO pode importar features nem components
```

Essas regras são o que impede o projeto de virar uma bola de lama em seis meses.
Devem ser aplicadas por lint, não por combinado verbal.

---

## 4.3 Estratégia de estado — quatro categorias

| Categoria | Ferramenta | Exemplos | Regra |
|---|---|---|---|
| **Estado de servidor** | TanStack Query | processos, documentos, notificações | Nunca copiar para outro store |
| **Estado de URL** | `nuqs` / searchParams | filtros, paginação, aba ativa, busca | Se é compartilhável, vive na URL |
| **Estado global de UI** | Zustand | sidebar aberta, tema, palette aberta | Só o que é genuinamente global |
| **Estado local** | `useState`/`useReducer` | hover, dropdown, etapa do wizard | Padrão — subir só quando necessário |

**Antipadrão banido:** espelhar resposta de API em Zustand ou Context. Dado de
servidor tem cache, invalidação, revalidação e estado de erro — TanStack Query
resolve tudo isso; um store manual reintroduz cada um desses problemas à mão.

### Configuração do TanStack Query

```
staleTime padrão:     30s
gcTime:               5 min
retry:                2 (nunca em 4xx)
refetchOnWindowFocus: true (importante — o advogado deixa aba aberta o dia todo)
```

### Chaves de query — hierárquicas e centralizadas

```
queryKeys.processos.all              → ['processos']
queryKeys.processos.lista(filtros)   → ['processos','lista',filtros]
queryKeys.processos.detalhe(id)      → ['processos','detalhe',id]
queryKeys.processos.timeline(id)     → ['processos','detalhe',id,'timeline']
```

Hierarquia permite invalidação por prefixo: invalidar `['processos']` invalida
tudo abaixo. Chaves espalhadas em strings soltas causam bugs de cache invisíveis.

---

## 4.4 Camada de dados

**Fluxo padrão de leitura (Server Component):** o RSC busca no backend com o
token de sessão (cookie httpOnly), e passa dado já serializado para o cliente via
hidratação do Query Client. Isso dá primeiro paint rápido e mantém a interação
posterior no cliente.

**Fluxo de escrita:** Server Action ou mutation do TanStack Query → invalidação
das chaves afetadas → optimistic update onde a latência é perceptível (comentários,
marcar notificação como lida, favoritar).

**Cliente HTTP (`lib/api/client.ts`)** — responsabilidades:
- Injeção do access token e do header de tenant.
- Refresh transparente em 401, com **fila de requisições** (uma única renovação
  concorrente; as demais aguardam).
- Normalização de erro para um tipo único `ApiError { code, message, fieldErrors, correlationId }`.
- Propagação do `X-Correlation-Id` para rastreabilidade ponta a ponta.
- Timeout e cancelamento via `AbortController`.

---

## 4.5 Formulários

React Hook Form + Zod, com `zodResolver`. O **mesmo schema Zod** valida o
formulário e tipa o payload — fonte única de verdade.

- Validação `onBlur` no primeiro preenchimento, `onChange` depois de errar uma vez
  (evita gritar com o usuário enquanto ele ainda digita).
- Erros de validação vindos do backend são mapeados campo a campo via `fieldErrors`.
- Wizards (cadastro de processo) usam um schema por etapa + um schema composto no
  submit final.
- Autosave de rascunho com debounce de 2s em formulários longos.
- Máscaras: CNJ, CPF/CNPJ, OAB, telefone, moeda — em `lib/validators`.

---

## 4.6 Catálogo de componentes reutilizáveis

### Camada 1 — Primitivos (shadcn/ui sobre Radix)
`Button` `Input` `Textarea` `Select` `Checkbox` `RadioGroup` `Switch` `Slider`
`Dialog` `Sheet` `Popover` `Tooltip` `DropdownMenu` `ContextMenu` `Tabs`
`Accordion` `Avatar` `Badge` `Card` `Separator` `ScrollArea` `Progress`
`Skeleton` `Toast` `Command` `Calendar` `Table`

Regra: não modificar primitivo para atender uma tela. Compor por cima.

### Camada 2 — Compostos de domínio (construídos por nós)

| Componente | Responsabilidade | Variações |
|---|---|---|
| `PageHeader` | Título, breadcrumb, ações primárias | com/sem tabs |
| `DataTable` | Tabela com ordenação, seleção, paginação, colunas configuráveis, virtualização | densa/confortável |
| `FilterBar` | Filtros ativos como chips, sincronizados com a URL | — |
| `EmptyState` | Ilustração, título, descrição, CTA | primeiro-uso / sem-resultado / erro / sem-permissão |
| `StatCard` | Métrica com tendência e ícone | neutro/positivo/atenção/crítico |
| `Timeline` | Eventos cronológicos agrupados por dia | compacta/expandida |
| `TimelineItem` | Item polimórfico por tipo de evento | andamento/documento/comentário/ia/sistema |
| `FileDropzone` | Upload múltiplo com progresso e erro por arquivo | — |
| `FileCard` | Documento com ícone por tipo, tamanho, versão, ações | grid/lista |
| `FilePreview` | Visualizador PDF/imagem/Office com paginação | modal/inline |
| `CommandPalette` | Busca global ⌘K | — |
| `SearchResultItem` | Resultado com destaque de trecho e tipo | por tipo de entidade |
| `UserAvatar` | Avatar com fallback de iniciais e presença | xs–xl |
| `UserPicker` | Seleção de usuário com busca | single/multi |
| `ClientPicker` | Seleção de cliente com criação inline | — |
| `StatusBadge` | Status de processo/documento/prazo | por domínio |
| `DeadlineBadge` | Prazo com semáforo de urgência | — |
| `AIPanel` | Painel de saída de IA com streaming, fonte, feedback | processo/documento |
| `AIBadge` | Selo "Gerado por IA" | — |
| `CommentThread` | Comentários com @menção, edição e resposta | — |
| `NotificationItem` | Notificação com ícone, tempo relativo, lido/não lido | — |
| `ConfirmDialog` | Confirmação de ação destrutiva com digitação do nome | normal/perigosa |
| `PermissionGate` | Renderiza filhos apenas com a permissão exigida | — |
| `Money` `DateTime` `RelativeTime` `CnjNumber` | Formatação consistente | — |

### Camada 3 — Layout
`AppShell` `Sidebar` (colapsável, memorizada) `Topbar` (busca, notificações, usuário,
seletor de escritório) `MobileNav` `PageContainer` `SplitView` (lista + detalhe).

---

## 4.7 Renderização e performance

| Técnica | Onde |
|---|---|
| Server Components | Toda leitura que não precisa de interatividade |
| Streaming + Suspense | Blocos do Dashboard, timeline longa |
| `loading.tsx` por rota | Skeleton com a forma do conteúdo |
| Virtualização (TanStack Virtual) | Listas >100 itens (processos, documentos, timeline) |
| Paginação por cursor | Todas as listas — nunca offset em tabela grande |
| Prefetch em hover | Links de processo e documento |
| `next/image` | Avatares, thumbnails |
| `next/font` | Fontes locais, sem FOUT |
| Code splitting | Preview de PDF, editor, gráficos — sempre dinâmico |
| Debounce | Busca (200ms), autosave (2s) |

**Orçamento de performance (falha o CI se estourar):**
LCP < 2,0s · INP < 200ms · CLS < 0,1 · JS inicial < 180 kB gzip.

---

## 4.8 Autorização no frontend

`PermissionGate` e `usePermissao()` controlam **visibilidade**, nunca segurança.
A autorização real é sempre do backend. O frontend esconde o botão; o backend
recusa a requisição. Ambos são obrigatórios: o primeiro é UX, o segundo é segurança.

A navegação lateral é derivada de `config/navigation.ts` filtrada pelas permissões
efetivas do usuário — nada de `if (role === 'ADMIN')` espalhado por componente.

---

## 4.9 Tratamento de erro

Três níveis: `error.tsx` por rota (recuperável, com "Tentar novamente") ·
`global-error.tsx` (falha catastrófica) · Error Boundary por widget no Dashboard
(um bloco quebrado não derruba a tela).

Toda mensagem de erro exibe o `correlationId` em texto pequeno — é o que torna o
suporte viável.

---

## 4.10 Testes

| Nível | Ferramenta | Alvo |
|---|---|---|
| Unitário | Vitest | utils, validators, schemas, hooks puros |
| Componente | Testing Library | componentes compostos, estados, acessibilidade |
| Integração | Vitest + MSW | fluxos de feature com API mockada |
| E2E | Playwright | 8 jornadas críticas (login, cadastro de processo, upload, busca, resumo IA, permissão, notificação, perfil) |
| Visual | Chromatic/Playwright snapshots | design system |
| Acessibilidade | axe-core no CI | zero violação crítica |

Meta de cobertura: 70% global, **90% em `lib/validators` e `features/*/schemas`**
(validação errada em software jurídico é dado errado em processo real).

---

**Anterior:** [03-fluxos-e-telas.md](03-fluxos-e-telas.md) · **Próximo:** [05-arquitetura-backend.md](05-arquitetura-backend.md)
