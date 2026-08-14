# 05 — Dashboard

> Reafirma e detalha [../03-fluxos-e-telas.md §3.3](../03-fluxos-e-telas.md) e
> [../08-especificacao-modulos.md §8.1](../08-especificacao-modulos.md).

## 5.1 Objetivo

Responder, sem clique adicional: **"o que exige minha atenção hoje?"** — é a
tela mais visitada do produto; qualquer ruído aqui tem custo diário multiplicado
pelo número de usuários.

## 5.2 Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Olá, Camila 👋              [+ Novo Processo] [+ Novo Cliente]│
├───────────────────────────────┬────────────────────────────────┤
│  PRAZOS CRÍTICOS               │  ATIVIDADE RECENTE             │
│  🔴 Contestação — Caso Silva   │  Documento adicionado em...    │
│  🟡 Audiência — Caso Souza     │  Andamento em...               │
│  ⚪ Reunião — Caso Pereira      │  Comentário de...              │
│  [ver todos →]                 │  [ver tudo →]                  │
├───────────────────────────────┼────────────────────────────────┤
│  MEUS PROCESSOS                │  MÉTRICAS (Sócio/Owner)         │
│  [card] [card] [card] [card]   │  Ativos: 42  Em risco: 3        │
│  [ver todos →]                 │  [gráfico simples]              │
└───────────────────────────────┴────────────────────────────────┘
```

Grid de 2 colunas em desktop (≥1280px), 1 coluna empilhada em telas menores
(reafirma [17-responsividade.md](17-responsividade.md)). Cada bloco é um
`Card` independente com seu próprio estado de carregamento/erro/vazio — nunca
um bloco lento trava os demais.

## 5.3 Widgets, KPIs e Cards

| Widget | Conteúdo | Visível para |
|---|---|---|
| Prazos Críticos | Até 8 itens, ordenados por urgência, semáforo de cor | Todos (escopo varia — ver §5.9) |
| Meus Processos | Cards com título, cliente, status, próximo prazo | Todos |
| Atividade Recente | Feed cronológico curto (últimos 10 eventos) | Todos, filtrado por permissão |
| Métricas de Carteira | Processos ativos, novos no mês, encerrados, valor total | Owner, Admin, Sócio |
| Documentos Recentes | Últimos 5 documentos tocados pelo usuário | Todos |
| Notificações Não Lidas | Contagem + 3 mais recentes | Todos |
| Atalhos Rápidos | Botões "Novo Processo", "Novo Cliente", "Convidar Equipe" | Conforme permissão de criação |

**KPIs do bloco de Métricas** (cards pequenos, um número grande + label +
tendência): Processos Ativos · Prazos em Risco (≤3 dias) · Processos Parados
(>60 dias sem evento) · Novos Clientes no Mês.

## 5.4 Busca

O campo de busca **não vive no Dashboard como widget** — vive na Topbar,
presente em toda tela. O Dashboard não duplica a busca global; isso evitaria
a pergunta "qual busca eu uso?". Reafirma princípio "busca sempre disponível"
([01-design-principles.md](01-design-principles.md)).

## 5.5 Agenda (Prazos Críticos)

Ordenado por `dataVencimento` ascendente. Semáforo: 🔴 ≤2 dias · 🟡 ≤7 dias ·
⚪ >7 dias. Cada item mostra: título do prazo, processo relacionado (link),
data absoluta + relativa ("12/08 · em 3 dias"), responsável (avatar pequeno,
útil para Owner/Sócio que veem prazos de toda a equipe). Clique abre a aba
Prazos do processo direto.

## 5.6 Notificações no Dashboard

Apenas contagem + 3 mais recentes, com link "ver todas" que abre o drawer de
notificações (§4.4 em [04-navigation.md](04-navigation.md)) — o Dashboard não
tenta ser a central de notificações, apenas um resumo.

## 5.7 IA no Dashboard

Não há geração de resumo diretamente no Dashboard (IA é contextual ao
processo, reafirma filosofia "processo é o contexto principal"). O único
toque de IA aqui é, quando existir, um badge discreto "3 resumos atualizados
esta semana" linkando para os processos correspondentes — nunca um botão de
"gerar resumo" solto sem contexto de qual processo.

## 5.8 Atalhos e Filtros

Atalhos: `G` `D` já está na tela (no-op); `N` abre menu rápido "Novo
Processo/Cliente". O Dashboard não tem filtro próprio — os blocos "Meus
Processos" e "Atividade Recente" têm toggle simples "Meus / Da equipe"
(visível para quem tem escopo além de `ASSIGNED`).

## 5.9 Composição por papel (reafirma [../08-especificacao-modulos.md §8.1](../08-especificacao-modulos.md))

| Bloco | Owner/Sócio | Advogado | Estagiário | Assistente | Admin |
|---|:--:|:--:|:--:|:--:|:--:|
| Prazos Críticos | Do escritório | Meus | Atribuídos | Do escritório | Do escritório |
| Meus Processos | Carteira + favoritos | Meus ativos | Atribuídos | Recentes | — (não tem "meus processos") |
| Atividade Recente | Escritório | Meus processos | Meus processos | Escritório | Escritório |
| Métricas | ✓ | Pessoais (simplificado) | — | — | Foco em usuários/segurança, não jurídico |
| Atalho "+ Novo Processo" | ✓ | ✓ | — | ✓ | — |

Para Admin, o Dashboard troca o bloco de Métricas jurídicas por um bloco
"Últimos acessos administrativos" + "Convites pendentes" — o Admin não
trabalha em processos, então métricas de carteira não são relevantes para ele.

## 5.10 Estados

| Estado | Comportamento |
|---|---|
| Carregando | Skeleton por bloco, com a forma real do conteúdo (linhas de card, não retângulo genérico) |
| Erro (bloco específico) | O bloco mostra "Não foi possível carregar" + botão "Tentar novamente", demais blocos seguem normais |
| Vazio (primeiro uso) | 3 cartões de ação substituem os blocos de dados, conforme jornada 3.4 |
| Vazio (uso normal, sem prazos/atividade) | Mensagem curta e não alarmante: "Nenhum prazo nos próximos dias" — nunca ícone de alerta para ausência de risco |
| Sem permissão para um bloco | Bloco simplesmente não renderiza (não aparece como cadeado) |

## 5.11 Responsividade

Desktop: grid 2 colunas. Tablet: 1 coluna, ordem Prazos → Meus Processos →
Atividade → Métricas. Mobile: mesma ordem, cards de processo em lista vertical
compacta em vez de grid.

## 5.12 Critérios de sucesso da tela

- Carrega visualmente completo (todos os blocos, mesmo que com skeleton) em
  <1s.
- Usuário identifica o prazo mais urgente sem rolar a página em telas ≥13".
- Nenhum bloco depende de outro para renderizar (falha isolada).
- Nenhuma ação secundária compete visualmente com "Novo Processo"/"Novo
  Cliente".

---

**Anterior:** [04-navigation.md](04-navigation.md) · **Próximo:** [06-processos.md](06-processos.md)
