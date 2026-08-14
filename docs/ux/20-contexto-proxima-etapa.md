# 20 — Contexto Oficial para o Prompt 4

# CONTEXTO OFICIAL PARA O PROMPT 4

**Escopo desta etapa.** Especificação completa de UX/UI do Quilombo Dev em
`docs/ux/` (21 arquivos), sem código, sem alteração de arquitetura, banco de
dados, entidades ou permissões. Elabora, em nível de experiência, o que já era
oficial em `docs/00` a `docs/10` e `docs/database/`.

**Filosofia.** Workspace, não ERP. Seis princípios obrigatórios guiam toda
tela: trabalhar em vez de preencher sistema · busca como centro da experiência
· processo como contexto principal · IA como copiloto (nunca oráculo) ·
interface que desaparece · usuário sempre ciente da próxima ação. Doze design
principles operacionalizam isso (simplicidade acima de completude, uma ação
primária por tela, feedback imediato, poucos cliques, busca sempre disponível,
evitar tabelas gigantes, interface limpa, zero telas confusas, consistência
visual, acessibilidade por padrão, progressive disclosure, reversibilidade).

**Personas.** Seis papéis ativos — Owner, Administrador, Sócio, Advogado,
Assistente, Estagiário — mapeados às personas originais (Ricardo, Marcos,
Camila, Sandra, Lucas), com Owner tratado como um segundo chapéu de Ricardo,
não uma sétima pessoa. Advogado (Camila) e Sócio (Ricardo) recebem a maior
prioridade de performance e atalho de teclado; Owner e Administrador recebem
maior prioridade de clareza, por baixa frequência de uso.

**Navegação.** Sidebar persistente + Topbar com busca global sempre acessível
(`⌘K`) + notificações + avatar. Mapa completo de modais, drawers, popovers e
diálogos de confirmação catalogado, com padrão de breadcrumb e 100% de
navegação por teclado mapeada.

**Telas especificadas em profundidade.** Dashboard (composição por papel,
widgets, KPIs) · Tela do Processo (header persistente, resumo de IA com
streaming/fontes/selo obrigatório, timeline, abas de documentos/prazos/
partes/comentários/histórico) · Documentos (upload, drag-and-drop, pastas
hierárquicas, versionamento, preview inline) · Clientes (cadastro mínimo,
lista, perfil com abas) · Busca Global (a funcionalidade mais importante —
ranking, prefixos de escopo, ranking por correspondência exata de número,
percepção de velocidade) · Perfil (dados, preferências, sessões, segurança,
LGPD) · Notificações (agrupamento por criticidade, prioridade de segurança
não desativável).

**Design System (complemento).** Grid de 12/12/8/4 colunas por breakpoint,
5 níveis de elevação com sombra especificada por tema, motion de transição de
tela detalhado, ilustrações de linha simples (nunca estoque genérico),
catálogo de estados de feedback consolidado. Nenhum token, cor, tipografia ou
espaçamento já oficial em `docs/07-design-system.md` foi alterado — violeta
(`ai`) permanece exclusivo de conteúdo de IA em toda tela nova documentada.

**Componentes.** ~35 componentes catalogados (Button, Input, Textarea,
Select, Checkbox, Switch, Modal, Drawer, Toast, Popover, Dropdown, Tooltip,
Accordion, Tabs, Avatar, Badge, Tag, Card, Table, Data Grid, Timeline,
Sidebar, Navbar, Search, Command Palette, Breadcrumb, Pagination, Notification
Card, Process Card, Client Card, Document Card, Comment, Upload, AI Summary
Card, ConfirmDialog, EmptyState, Skeleton), cada um com objetivo, quando
(não) usar, estados, variantes e requisito de acessibilidade.

**UX Writing.** Tom direto, humano, sério sem ser frio — nunca jargão técnico
ou humor forçado em mensagem de erro. Toda mensagem de erro tem ação sugerida.
Toda ação destrutiva tem confirmação proporcional ao risco (normal vs.
perigosa, com digitação do nome para irreversível). Toda saída de IA carrega o
selo fixo "Gerado por IA — confira antes de usar" e cita fonte clicável.

**Acessibilidade.** WCAG 2.1 AA como piso. Contraste mínimo 4.5:1/3:1, ARIA
mapeado por componente, 100% navegável por teclado sem armadilha de foco,
nenhuma informação só por cor, alvo mínimo 44×44px mobile/36×36px desktop,
`axe-core` no CI como gate de merge.

**Responsividade.** Sidebar → ícones (tablet) → Sheet + bottom navigation de 4
itens (mobile). Tela do Processo perde o painel lateral fixo e as tabs viram
`Select` em mobile. Tabelas viram listas de cards abaixo de `md`. Command
Palette em tela cheia em mobile.

**Conflito identificado e resolvido nesta etapa.** Ausência de persona
"Owner" separada no documento original — resolvido como nota de reconciliação
(Owner = segundo chapéu do Sócio-titular), sem criar persona nova nem alterar
personas oficiais. Nenhum outro conflito de arquitetura, banco ou permissão foi
encontrado — esta etapa é estritamente aditiva.

**Pendências explícitas para a Especificação de API (Prompt 4):**
1. Definir o contrato de streaming (SSE) para geração de resumo por IA —
   formato de evento, como o frontend recebe token a token, como sinaliza
   conclusão e fontes.
2. Definir o contrato de streaming/tempo-real para notificações e badge de
   contagem não lida (SSE ou WebSocket, conforme já indicado como preferência
   em `docs/05-arquitetura-backend.md §5.11`).
3. Definir o payload de resposta da busca global — agrupamento por tipo,
   snippet de destaque, cursor de paginação — compatível com a experiência de
   `docs/ux/09-busca-global.md`.
4. Confirmar que os tempos de resposta assumidos nesta etapa (primeiro token
   de IA <2s, busca p95 <400ms) são meta de contrato de API, não apenas meta
   de produto.
5. Endpoints para os fluxos de UI que esta etapa assume mas não especifica em
   nível de contrato: trocar escritório ativo, marcar notificação como lida em
   lote, mover documento entre pastas, reordenar pastas.

**O que a Especificação de API deve tratar como imutável vindo desta etapa:**
todas as telas, estados, componentes, textos e critérios de acessibilidade
documentados em `docs/ux/00` a `docs/ux/18` — a API é construída para servir
esta experiência, não o contrário.

---

**Anterior:** [19-decisoes.md](19-decisoes.md) · **Início:** [00-resumo.md](00-resumo.md)
