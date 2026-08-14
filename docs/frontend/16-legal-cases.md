# 16 — Processos (Legal Cases)

Reafirma `docs/ux/06-processos.md` (tela mais profunda do produto) e
`docs/api/09-legal-cases.md`. Backend: módulo **Legal Cases não
implementado** — é o próximo módulo prioritário no backend
(`docs/backend-implementation/20-context-next-step.md`), então esta é a
feature mais provável de ganhar integração real primeiro entre as nove
ainda mockadas (ver [31-decisions.md §31.1](31-decisions.md)).

## 16.1 Estrutura

```
features/legal-cases/
├── api/{keys,queries,mutations}.ts
├── components/
│   ├── legal-case-card.tsx
│   ├── legal-case-header.tsx        # persistente entre abas — layout.tsx da rota o usa
│   ├── legal-case-form/             # wizard de criação, schema por etapa
│   ├── legal-case-team.tsx
│   ├── legal-case-parties.tsx
│   ├── legal-case-filters.tsx       # sincronizado com a URL via nuqs
│   └── legal-case-table.tsx         # DataTable
├── schemas/legal-case.schema.ts     # inclui validação de dígito verificador de CNJ
├── utils/cnj.ts
└── index.ts
```

## 16.2 Queries e mutations

`useLegalCases(filters)` (infinite, cursor) · `useLegalCase(id)` (detalhe
— header + Visão Geral) · `useLegalCaseTeam(id)` · `useLegalCaseParties(id)`
· `useCreateLegalCase` · `useUpdateLegalCase` (envia `If-Match: <versao>`,
ver §16.4) · `useArchiveLegalCase` · `useRestoreLegalCase` ·
`useAddTeamMember`/`useRemoveTeamMember` · `useAddParty`/`useUpdateParty`/
`useRemoveParty` · `useAddRelatedCase`/`useRemoveRelatedCase`.

Timeline, Prazos, Documentos e Comentários do processo têm hooks
**próprios** em suas respectivas features ([17](17-deadlines-timeline.md),
[18](18-documents-folders.md), [19](19-comments-tags.md)) parametrizados
por `caseId` — `features/legal-cases` não reimplementa essas
responsabilidades, só as referencia pela API pública de cada feature
(reafirma a regra de fronteira de
[01-arquitetura.md §1.4](01-arquitetura.md)).

## 16.3 Segredo de justiça — tratamento ponta a ponta

`GET /v1/legal-cases/:id` retorna `404` (nunca `403`) quando o processo
está em segredo de justiça e o usuário não tem acesso
(`docs/api/03-autorizacao.md §3.4`). O `layout.tsx` de
`/processos/[id]` é o único ponto que busca o processo antes de renderizar
qualquer aba — se essa chamada falha com `404`, **nenhuma aba é montada**
(nem o esqueleto), evitando que a estrutura de abas por si só sugira "isto
existe, só está bloqueado" (reafirma
[06-autorizacao.md §6.4](06-autorizacao.md) e
`docs/ux/06-processos.md`: "página inteira 404, nunca uma versão
'acinzentada'"). O padlock visual de segredo de justiça só aparece **para
quem já tem acesso** (indicador informativo de que o processo é sensível),
nunca como pista para quem não tem.

## 16.4 Versionamento otimista e conflito `409`

Edição de processo envia `If-Match: <versao>` (campo `versao` já presente
no DTO carregado). Resposta `409 STALE_VERSION`: banner "Este processo foi
atualizado por outra pessoa. Recarregue para ver a versão mais recente."
(texto exato de `docs/ux/14-ux-writing.md`) — o formulário **não** tenta
mesclar automaticamente; o usuário decide descartar sua edição e recarregar
ou copiar manualmente o que digitou antes de recarregar. Nenhuma tentativa
de resolução automática de conflito nesta fase.

## 16.5 Equipe, participantes, responsável

`ProcessoMembro` (equipe) e `ParteProcesso` (partes/polo) são conceitos
distintos, refletidos em componentes distintos (`legal-case-team.tsx` vs.
`legal-case-parties.tsx`) — equipe é "quem no escritório trabalha nisto",
partes é "quem no processo judicial real" (autor/réu/testemunha/etc.).
Trocar o responsável principal (`PATCH .../responsible`) é uma ação
distinta de adicionar/remover da equipe.

## 16.6 Número CNJ e processo extrajudicial

`CnjNumber` (componente de exibição, catálogo em
[13-design-system.md](13-design-system.md)) formata e usa fonte
monoespaçada sempre. Processo extrajudicial (`tipo=EXTRAJUDICIAL`) esconde
os campos específicos de tribunal/vara/comarca no formulário
(`docs/ux` já define isso como campo condicional) — mesmo schema Zod,
`.superRefine` condicionando obrigatoriedade ao `tipo` selecionado.

## 16.7 Filtros sincronizados com a URL

`legal-case-filters.tsx` usa `nuqs` — todo filtro (status, responsável,
área, prioridade, tags) é compartilhável via URL e sobrevive a
refresh/voltar do navegador, sem estado duplicado em Zustand ou
`useState` (reafirma [11-estado-global.md §11.1](11-estado-global.md)).

---

**Anterior:** [15-clients.md](15-clients.md) · **Próximo:** [17-deadlines-timeline.md](17-deadlines-timeline.md)
