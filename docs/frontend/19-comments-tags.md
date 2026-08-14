# 19 — Comentários e Tags

Reafirma `docs/ux/06-processos.md §6.7` (comentários), `docs/ux/07-documentos.md`
(tags/comentários em documento) e `docs/api/12-comments.md`. Backend:
módulo **Comments/Tags não implementado** (ver
[31-decisions.md §31.1](31-decisions.md)).

## 19.1 Comentários

```
features/comments/
├── api/{keys,queries,mutations}.ts   → useComments(parentType, parentId), useCreateComment, useUpdateComment, useDeleteComment
├── components/{comment-thread,comment-item,comment-composer}.tsx
└── index.ts
```

`parentType` é `'legal-case' | 'document'` — mesma feature serve os dois
contextos (`docs/api/12-comments.md` já expõe endpoints paralelos
`/legal-cases/:id/comments` e `/documents/:id/comments`), evitando
duplicar `CommentThread` por contexto.

- Edição restrita ao autor (`autorId === currentUser.id`) — comparação de
  dado, não uma nova permissão (reafirma
  [06-autorizacao.md §6.6](06-autorizacao.md)).
- `@menção`: autocomplete de membros da equipe do processo (popover, não
  modal — reafirma `docs/ux/04-navigation.md §4.5`), preparado no schema
  de envio (campo de menções estruturado) mesmo a notificação de menção
  em si dependendo do módulo Notifications existir de ponta a ponta.
- Campo de comentário sempre visível no rodapé da aba (não um botão "+
  Comentário" que abre um formulário separado) — reafirma
  `docs/ux/06-processos.md §6.7`.

## 19.2 Tags

```
features/tags/
├── api/{keys,queries,mutations}.ts   → useTags(), useCreateTag, useUpdateTag, useDeleteTag
├── components/tag-picker.tsx          → reexportado via components/forms/ (usado por legal-cases, documents, clients)
└── index.ts
```

`TagPicker` é o único componente desta feature usado fora dela — mora
fisicamente em `components/forms/tag-picker.tsx` por já ser consumido por
três features diferentes (reafirma
[02-estrutura-pastas.md §2.4](02-estrutura-pastas.md): componente
compartilhado por ≥2 features sobe para `components/`), mas a lógica de
dados (`useTags`, criação inline) continua vindo de
`features/tags/api/`. Prevenção de duplicidade por nome é responsabilidade
do backend (`docs/api/09-legal-cases.md §9` — tags do escritório) — o
`TagPicker` só mostra o erro `409` retornado, se ocorrer.

---

**Anterior:** [18-documents-folders.md](18-documents-folders.md) · **Próximo:** [20-notifications-sse.md](20-notifications-sse.md)
