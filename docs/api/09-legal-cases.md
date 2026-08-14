# 09 — Legal Cases (Endpoints)

> Entidade central. `Processo` (DDD completo), `ParteProcesso`,
> `ProcessoMembro`, `ProcessoRelacionado`, `Prazo`, `Tag` em
> [../database/04-entidades-clientes-processos.md](../database/04-entidades-clientes-processos.md).
> Tela em [../ux/06-processos.md](../ux/06-processos.md).

## 9.1 CRUD principal

| Método | Rota | Objetivo | Permissão |
|---|---|---|---|
| `GET` | `/v1/legal-cases` | Listar/filtrar processos | `case:read:{escopo}` |
| `POST` | `/v1/legal-cases` | Criar processo | `case:create` |
| `GET` | `/v1/legal-cases/:id` | Detalhe | `case:read:{escopo}` + segredo de justiça |
| `PATCH` | `/v1/legal-cases/:id` | Atualizar | `case:update` |
| `DELETE` | `/v1/legal-cases/:id` | Soft delete | `case:delete` |
| `POST` | `/v1/legal-cases/:id/archive` | Arquivar | `case:update` |
| `POST` | `/v1/legal-cases/:id/restore` | Restaurar da lixeira | `case:delete` |

### `GET /v1/legal-cases`

**Query:** `status`, `responsavelId`, `clienteId`, `area`, `tribunal`,
`prioridade`, `tags` (múltiplo), `dataVencimento[gte|lte]` (via join
implícito com próximo prazo), `meusApenas=true`, `q` (busca local),
`sort` (`-atualizadoEm` padrão, `dataVencimento`, `titulo`), cursor/limit.
**Resposta 200:** array de `ProcessoResumoDTO`.
**Regra de autorização:** o filtro de escopo (`ASSIGNED`/`TEAM`/`ALL`) e o
filtro de segredo de justiça são aplicados **na query do banco**, nunca
pós-processados — reafirma
[../database/01-estrategia-multitenancy.md §1.6](../database/01-estrategia-multitenancy.md)
e [../ux/09-busca-global.md §9.6](../ux/09-busca-global.md).

### `POST /v1/legal-cases`

**Body:** `CriarProcessoDTO` — apenas `titulo` e `clienteId` obrigatórios;
`numeroCnj` opcional (reafirma
[../ux/03-user-journeys.md §3.6](../ux/03-user-journeys.md)).
**Resposta 201:** `ProcessoDetalheDTO`.
**Erros:** `422` (CNJ com dígito verificador inválido) · `409`
(`code: DUPLICATE_CNJ`, corpo inclui `{"processoExistenteId": "..."}` —
reafirma [../03-fluxos-e-telas.md §3.4.1](../03-fluxos-e-telas.md)).
**Idempotência:** obrigatória.

### `PATCH /v1/legal-cases/:id`

**Body:** parcial de `CriarProcessoDTO` + `status`, `prioridade`,
`segredoJustica`. **Header obrigatório:** `If-Match: <versao>` — reafirma
versionamento otimista de
[../database/02-convencoes-dados.md §2.7](../database/02-convencoes-dados.md).
**Erros:** `409` (`code: STALE_VERSION`) se `If-Match` não confere com a
`versao` atual — reafirma
[../database/12-eventos-fluxos-regras.md §12.5](../database/12-eventos-fluxos-regras.md),
cenário "duas pessoas editando o mesmo processo".

### `DELETE /v1/legal-cases/:id`

Soft delete, sem cascata sobre documentos/comentários/timeline — reafirma
[../database/12-eventos-fluxos-regras.md §12.3.12](../database/12-eventos-fluxos-regras.md).

## 9.2 Equipe (`ProcessoMembro`)

| Método | Rota | Objetivo | Permissão |
|---|---|---|---|
| `GET` | `/v1/legal-cases/:id/team` | Listar equipe | `case:read:{escopo}` |
| `POST` | `/v1/legal-cases/:id/team` | Adicionar membro | `case:team:manage` |
| `PATCH` | `/v1/legal-cases/:id/responsible` | Trocar responsável principal | `case:update` |
| `DELETE` | `/v1/legal-cases/:id/team/:membroId` | Remover da equipe | `case:team:manage` |

`PATCH .../responsible` **exige** que o novo responsável já seja membro da
equipe (ou adiciona automaticamente) — mantém `ProcessoMembro.responsavelPrincipal`
em sincronia com `Processo.responsavelPrincipalId` na mesma transação,
reafirma [../database/04-entidades-clientes-processos.md §4.4](../database/04-entidades-clientes-processos.md).

## 9.3 Participantes (`ParteProcesso`)

| Método | Rota | Objetivo | Permissão |
|---|---|---|---|
| `GET` | `/v1/legal-cases/:id/parties` | Listar partes | `case:read:{escopo}` |
| `POST` | `/v1/legal-cases/:id/parties` | Adicionar parte | `case:update` |
| `PATCH` | `/v1/legal-cases/:id/parties/:parteId` | Atualizar parte | `case:update` |
| `DELETE` | `/v1/legal-cases/:id/parties/:parteId` | Remover (soft) | `case:update` |

**Body de criação:** `{ "tipo": "TESTEMUNHA", "natureza": "PESSOA_FISICA",
"nome": "...", "documento": null, "clienteId": null }` — apenas `tipo`,
`natureza`, `nome` obrigatórios (reafirma
[../database/04-entidades-clientes-processos.md §4.3](../database/04-entidades-clientes-processos.md),
participante sem cadastro completo de cliente).

## 9.4 Prazos (`Prazo`)

| Método | Rota | Objetivo | Permissão |
|---|---|---|---|
| `GET` | `/v1/legal-cases/:id/deadlines` | Listar prazos do processo | `case:read:{escopo}` |
| `POST` | `/v1/legal-cases/:id/deadlines` | Criar prazo | `case:update` |
| `PATCH` | `/v1/legal-cases/:id/deadlines/:prazoId` | Atualizar/concluir | `case:update` |
| `DELETE` | `/v1/legal-cases/:id/deadlines/:prazoId` | Cancelar (soft, com motivo) | `case:update` |
| `GET` | `/v1/deadlines` | Prazos do usuário/escritório (Dashboard) | `case:read:{escopo}` aplicado agregando todos os processos |

`GET /v1/deadlines` é o endpoint que sustenta o bloco "Prazos Críticos" do
Dashboard ([../ux/05-dashboard.md §5.5](../ux/05-dashboard.md)) — agrega
across processos sem exigir N chamadas por processo. **Query:**
`escopo=meus|equipe|todos`, `dataVencimento[lte]` (janela, padrão 30 dias),
`status`. **Erros (DELETE):** `422` (`code: JUSTIFICATION_REQUIRED`) se
`tipo = FATAL` e `motivoCancelamento` ausente no body — reafirma regra 23 de
[../database/12-eventos-fluxos-regras.md §12.4](../database/12-eventos-fluxos-regras.md).

## 9.5 Processos relacionados

| Método | Rota | Objetivo | Permissão |
|---|---|---|---|
| `GET` | `/v1/legal-cases/:id/related` | Listar relacionados | `case:read:{escopo}` |
| `POST` | `/v1/legal-cases/:id/related` | Relacionar a outro processo | `case:update` |
| `DELETE` | `/v1/legal-cases/:id/related/:relacaoId` | Desfazer relação | `case:update` |

**Body:** `{ "processoRelacionadoId": "...", "tipoRelacao": "RECURSO" }`.

## 9.6 Tags (compartilhado com Documents e Clients)

| Método | Rota | Objetivo | Permissão |
|---|---|---|---|
| `GET` | `/v1/tags` | Listar tags do escritório | Qualquer papel autenticado |
| `POST` | `/v1/tags` | Criar tag | `tag:manage` |
| `PATCH` | `/v1/tags/:id` | Atualizar (nome/cor) | `tag:manage` |
| `DELETE` | `/v1/tags/:id` | Soft delete | `tag:manage` |
| `POST` | `/v1/legal-cases/:id/tags` | Associar tag ao processo | `case:update` |
| `DELETE` | `/v1/legal-cases/:id/tags/:tagId` | Remover associação | `case:update` |

Endpoints equivalentes `/v1/documents/:id/tags` e `/v1/clients/:id/tags`
documentados por referência aqui — mesmo contrato, entidade-alvo diferente
(reafirma tabelas associativas de
[../database/05-entidades-documentos-colaboracao.md §5.6](../database/05-entidades-documentos-colaboracao.md)).

## 9.7 Timeline e Comentários deste processo

Sub-rotas `GET /v1/legal-cases/:id/timeline` e
`GET|POST /v1/legal-cases/:id/comments` — contrato completo em
[11-timeline.md](11-timeline.md) e [12-comments.md](12-comments.md)
respectivamente (evita duplicação; o recurso é o mesmo, apenas
filtrado por `processoId`).

---

**Anterior:** [08-clients.md](08-clients.md) · **Próximo:** [10-documents.md](10-documents.md)
