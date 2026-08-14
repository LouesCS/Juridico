# 12 — Comments (Endpoints)

> Entidade `Comentario` em
> [../database/05-entidades-documentos-colaboracao.md §5.5](../database/05-entidades-documentos-colaboracao.md).

| Método | Rota | Objetivo | Permissão |
|---|---|---|---|
| `GET` | `/v1/legal-cases/:id/comments` | Comentários do processo | `case:read:{escopo}` |
| `GET` | `/v1/documents/:id/comments` | Comentários do documento | `document:read:{escopo}` |
| `POST` | `/v1/legal-cases/:id/comments` | Criar comentário no processo | `comment:create` |
| `POST` | `/v1/documents/:id/comments` | Criar comentário no documento | `comment:create` |
| `PATCH` | `/v1/comments/:id` | Editar (só autor) | Autoria própria |
| `DELETE` | `/v1/comments/:id` | Excluir (soft) | Autoria própria ou `comment:delete` (papel com escopo) |

## 12.1 `POST /v1/legal-cases/:id/comments`

**Body:**
```json
{ "conteudo": "Já revisei, pode protocolar.", "comentarioPaiId": null,
  "mencoes": ["<membroId>"] }
```
**Resposta 201:** `ComentarioDTO`. **Regra:** exatamente um contexto de
origem por comentário (processo **ou** documento **ou** evento de timeline)
— reafirma `CHECK` de
[../database/05-entidades-documentos-colaboracao.md §5.5](../database/05-entidades-documentos-colaboracao.md);
este endpoint fixa o contexto pela própria URL, eliminando ambiguidade.
`comentarioPaiId` só aceita comentário de nível raiz (thread de 1 nível).
**Efeito colateral:** cada `membroId` em `mencoes` recebe `Notificacao`
(`tipo: comment.mention`). **Idempotência:** recomendado, não obrigatório
(ação de baixo risco de duplicação acidental via double-click — mitigado no
frontend, mas aceito como não crítico o suficiente para exigir o header).

## 12.2 `PATCH /v1/comments/:id`

**Body:** `{ "conteudo": "..." }`. **Erros:** `403` se o ator não é o autor
(edição é sempre restrita à própria autoria, independente de papel — reafirma
[../database/08-permissoes-seguranca.md](../database/08-permissoes-seguranca.md),
comentário não tem escopo de papel para edição). **Resposta:** marca
`editado = true`.

## 12.3 `DELETE /v1/comments/:id`

Soft delete. Permitido ao autor sempre, ou a papel com permissão
administrativa de moderação (`comment:delete`, tipicamente
`SOCIO`/`ADMIN`/`OWNER`).

## 12.4 Menções (preparação futura)

Endpoint de autocomplete de menção já documentado como parte de
`GET /v1/legal-cases/:id/team` (reafirma
[../database/05-entidades-documentos-colaboracao.md §5.5](../database/05-entidades-documentos-colaboracao.md) —
tabela `comentario_mencao` já reservada, endpoint de criação já aceita
`mencoes[]`; não há endpoint adicional a documentar além do que já existe.

---

**Anterior:** [11-timeline.md](11-timeline.md) · **Próximo:** [13-notifications.md](13-notifications.md)
