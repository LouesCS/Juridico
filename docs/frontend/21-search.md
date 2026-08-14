# 21 — Busca Global

Reafirma `docs/ux/09-busca-global.md` ("a funcionalidade mais importante
do produto") e `docs/api/15-search.md`. Backend: módulo **Search não
implementado** — as colunas `tsvector`/trigram já existem no banco via
migration manual (`docs/backend-implementation/19-decisions.md §19.11`),
mas nenhum endpoint as consome ainda (ver
[31-decisions.md §31.1](31-decisions.md)).

## 21.1 Estrutura

```
features/search/
├── api/{keys,queries}.ts    → useSearch(query, scope), useSearchSuggestions(), useRecentItems()
├── components/{command-palette,search-result-item}.tsx
├── hooks/use-search-shortcut.ts   # registra Ctrl+K / ⌘K globalmente
└── index.ts
```

`CommandPalette` é montado uma vez em `(app)/layout.tsx` (estado de
aberto/fechado em `command-palette.store.ts`, ver
[11-estado-global.md §11.4](11-estado-global.md)) — nunca remontado por
rota, para preservar o histórico de termos durante a navegação.

## 21.2 Debounce, cache e ranking

- Debounce de 200ms antes de disparar `GET /v1/search?q=...` (reafirma
  `docs/api/15-search.md`/`docs/ux/09-busca-global.md §9.13`).
- `useSearch` usa `staleTime` curto (5s) e `keepPreviousData` (TanStack
  Query `placeholderData: keepPreviousData`) — resultado anterior
  permanece visível, esmaecido, enquanto o novo termo carrega (reafirma
  "buscando... resultados anteriores permanecem visíveis, nunca limpa
  para um spinner").
- **Nenhum re-ranking client-side.** A ordem que a API devolve já reflete
  a lógica de ranking do backend (match exato de número > início de
  string > boost de recência) — o frontend só agrupa por tipo para
  renderização, nunca reordena.
- Payload agrupado por tipo (Processos/Documentos/Clientes/Tags/
  Comentários) — resolvido pelo próprio contrato de API (pendência já
  fechada na etapa de API, `docs/api/22-decisoes.md`), o frontend só
  itera os grupos na ordem que a resposta já traz.

## 21.3 Prefixos e atalhos

`p:`/`d:`/`c:` (escopo por tipo), `>` (ações) interpretados client-side
antes de montar a query string (`scope` param) — não são sintaxe enviada
literalmente ao backend. `Tab` cicla escopo, `↑`/`↓` navega resultado,
`Enter` abre, `Esc` fecha — implementado com `cmdk` (biblioteca por trás
do primitivo `Command` do shadcn/ui, já `role="combobox"`+`listbox` por
padrão).

## 21.4 Recentes, favoritos, histórico — onde vivem

| | Fonte | Persistência |
|---|---|---|
| Recentes (últimos 5 itens abertos, qualquer tipo) | Client-side, registrado a cada navegação bem-sucedida para um item buscável | `localStorage` (não sensível — só IDs + título já visível na sessão) |
| Favoritos | Reservado — sem endpoint contratado ainda; UI prevista, sem dado real (ver [31-decisions.md §31.8](31-decisions.md)) | — |
| Histórico de termos digitados (últimos 10) | Client-side puro | `localStorage`, texto do termo apenas — nunca resultado da busca |

Nenhum dos três é escopado por `officeId` explicitamente no
`localStorage` porque já são efetivamente invalidados pela troca de
contexto — "recentes"/"histórico" de um escritório anterior sendo
mostrados após trocar de escritório é um problema de UX menor (mostrar um
atalho para algo que dará 404 ao clicar, tratado pelo fluxo padrão de
[06-autorizacao.md §6.4](06-autorizacao.md)), não um vazamento de dado
sensível — decisão registrada, não uma omissão.

## 21.5 Respeito a permissões

A busca **nunca** aplica um segundo filtro de permissão no cliente — o
`docs/api/03-autorizacao.md §3.6`/`docs/ux/09-busca-global.md §9.13` já
garantem que o filtro de permissão acontece na própria query do backend.
Um resultado que aparece na busca é, por definição, um resultado que o
usuário pode abrir — clicar nunca deveria produzir um 404 de autorização
(diferente de navegação direta por URL, onde isso é possível e tratado
normalmente).

## 21.6 Estados

Vazio → Recentes + Sugestões. Sem resultado → mensagem + dica de
ortografia + link para `/busca` (avançada). Erro → "Busca temporariamente
indisponível", `Esc` continua funcionando. **Sem skeleton** — indicador
discreto no rodapé do palette, nunca um esqueleto de lista (reafirma
`docs/ux/09-busca-global.md §9.13`).

---

**Anterior:** [20-notifications-sse.md](20-notifications-sse.md) · **Próximo:** [22-ai.md](22-ai.md)
