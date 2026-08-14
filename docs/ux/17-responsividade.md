# 17 — Responsividade

> Breakpoints reafirmam [../07-design-system.md §7.4](../07-design-system.md):
> `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`.

## 17.1 Princípio geral

Responsividade não é "encolher a mesma tela" — é reorganizar por prioridade de
tarefa. Em telas menores, elementos secundários colapsam primeiro; a ação
primária e o conteúdo principal são os últimos a ceder espaço.

## 17.2 Desktop (≥1280px)

- Sidebar expandida (260px) sempre visível.
- Tela do Processo: header + tabs horizontais + painel lateral de contexto
  visível simultaneamente.
- Dashboard: grid de 2 colunas.
- Command Palette: overlay centralizado de 640px.

## 17.3 Notebook (1024–1279px)

- Sidebar reduz para 220px, rótulos mantidos.
- Painel lateral da Tela do Processo passa a ser opcional/colapsável (ícone
  para abrir sob demanda) em vez de sempre visível — libera espaço para o
  conteúdo principal.
- Dashboard mantém grid de 2 colunas, mas com gutter reduzido.

## 17.4 Tablet (768–1023px)

- Sidebar colapsa para ícones (64px) por padrão; expande em overlay temporário
  ao tocar.
- Tela do Processo: painel lateral fecha por padrão; tabs horizontais ganham
  scroll lateral se não couberem todas.
- Dashboard: 1 coluna, blocos empilhados na ordem Prazos → Meus Processos →
  Atividade → Métricas.
- Tabelas (`Data Grid`) reduzem colunas visíveis automaticamente (prioridade:
  título > status > responsável > data — colunas menos críticas somem,
  acessíveis via "Colunas" se necessário).
- Modais mantêm largura fixa quando cabem; modais grandes (`lg`) ocupam 90%
  da largura da tela.

## 17.5 Mobile (<768px)

- Sidebar vira `Sheet` (menu deslizante), acessível por ícone de hambúrguer na
  Topbar — nunca visível por padrão.
- Bottom navigation com 4 itens fixos (Dashboard, Processos, Documentos,
  Busca) substitui a Sidebar como navegação primária — mais rápido de
  alcançar com o polegar do que abrir um menu lateral.
- Breadcrumb colapsa para "‹ Voltar" + título da tela anterior (reafirma
  [04-navigation.md §4.8](04-navigation.md)).
- Tela do Processo: tabs horizontais viram `Select` suspenso; painel lateral
  de contexto não existe nesta largura — metadados/equipe viram uma aba
  própria ("Detalhes").
- Tabelas viram listas de cards empilhados (reafirma
  [08-clientes.md §8.7](08-clientes.md), [07-documentos.md](07-documentos.md)).
- Command Palette abre em tela cheia (não overlay flutuante) — reafirma
  [09-busca-global.md §9.11](09-busca-global.md).
- Formulários em coluna única, sempre; nenhum formulário de 2 colunas abaixo
  de `md`.
- Ação primária de cada tela vira um botão fixo no rodapé (thumb zone) quando
  a tela tem scroll longo (ex.: formulário de novo processo), para não exigir
  rolar até o topo/fim para agir.

## 17.6 Tabela de adaptação por tela

| Tela | Desktop | Tablet | Mobile |
|---|---|---|---|
| Dashboard | Grid 2 col. | 1 col. | 1 col., cards compactos |
| Processo | Header+tabs+painel lateral | Header+tabs, painel sob demanda | Header colapsado + `Select` de abas |
| Documentos | Grid/lista + árvore de pastas lateral | Árvore colapsável | Lista simples, pastas em drawer |
| Clientes | Tabela densa | Tabela com menos colunas | Lista de cards |
| Busca Global | Overlay 640px | Overlay 90% largura | Tela cheia |
| Perfil | Navegação lateral + conteúdo | Idem | Abas horizontais com scroll |
| Notificações | Drawer 380px | Drawer 100% largura | Tela cheia |

## 17.7 O que nunca muda entre breakpoints

Atalho `⌘K`/`Ctrl+K` (mobile usa ícone de lupa como gatilho equivalente, mas o
comportamento de busca é o mesmo) · hierarquia de uma ação primária por tela ·
paleta e tokens semânticos · seleção de idioma/tema no Perfil.

---

**Anterior:** [16-wireframes.md](16-wireframes.md) · **Próximo:** [18-checklists.md](18-checklists.md)
