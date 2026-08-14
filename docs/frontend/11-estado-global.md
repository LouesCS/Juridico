# 11 — Estado Global (Zustand)

## 11.1 Regra geral (reafirma `docs/04-arquitetura-frontend.md §4.3`)

Quatro categorias de estado, cada uma com uma ferramenta única — misturar
categoria é o antipadrão mais caro em aplicações React desta escala:

| Categoria | Ferramenta | Nunca confundir com |
|---|---|---|
| Estado de servidor | TanStack Query | Zustand/Context — dado de API tem cache, invalidação e erro próprios |
| Estado de URL | `nuqs` (searchParams) | `useState` — se é compartilhável/voltável, vive na URL |
| Estado global de UI | Zustand | TanStack Query — nunca espelha resposta de API |
| Estado local | `useState`/`useReducer` | Zustand — padrão default, só sobe se genuinamente compartilhado entre componentes distantes |

## 11.2 O que entra em Zustand nesta arquitetura

| Store | Conteúdo | Persistido? |
|---|---|---|
| `ui.store.ts` | Sidebar expandida/colapsada, densidade (Confortável/Compacto) | `localStorage` — preferência puramente visual, não sensível |
| `command-palette.store.ts` | Command Palette aberto/fechado, escopo ativo (`Todos`/`Processos`/...), histórico de termos buscados (últimos 10, texto puro do que foi digitado) | `localStorage` para histórico de termos; estado de aberto/fechado nunca persistido |
| `office.store.ts` | Espelho do escritório ativo (§7.1) | **Não** persistido — sempre reidratado de `GET /me` |

## 11.3 O que não entra — nunca

- **Qualquer dado que já pertence ao TanStack Query** (lista de processos,
  detalhe de cliente, notificações, resultado de busca) — replicar isso em
  Zustand reintroduz problema de cache/invalidação que o TanStack Query já
  resolve, exatamente o antipadrão banido em `docs/04 §4.3`.
- **Dado jurídico sensível em `localStorage`** — rascunho de formulário
  longo (ex.: cadastro de processo) usa autosave contra o backend (ver
  [12-formularios.md §12.7](12-formularios.md)), nunca
  `localStorage`/`sessionStorage`, mesmo criptografado — reafirma
  [25-security.md §25.5](25-security.md).
- **Token de qualquer tipo** — nunca existe em nenhum store, em nenhuma
  circunstância (reafirma [05-autenticacao.md §5.1](05-autenticacao.md)).
- **Permissões/roles do usuário** — vivem em `useCurrentUser()` (TanStack
  Query, hidratado de `GET /me`), não em um store separado; duplicar
  criaria duas fontes de verdade que podem divergir após uma troca de
  escritório.

## 11.4 Estado de comando/modais globais

Modais **globais** de fato (Command Palette, Painel de Notificações) usam
Zustand para o booleano de visibilidade (`isOpen`), porque são acionados de
qualquer ponto da árvore (atalho de teclado global, ícone da Topbar) sem
uma relação de pai-filho natural com quem os abre. Modais **locais** a uma
feature (confirmação de exclusão, formulário de edição) usam estado local
do componente que os contém — não sobem para Zustand só porque são um
modal.

---

**Anterior:** [10-tanstack-query.md](10-tanstack-query.md) · **Próximo:** [12-formularios.md](12-formularios.md)
