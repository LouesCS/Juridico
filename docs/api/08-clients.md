# 08 — Clients (Endpoints)

> Entidade `Cliente` em
> [../database/04-entidades-clientes-processos.md §4.1](../database/04-entidades-clientes-processos.md).
> Telas em [../ux/08-clientes.md](../ux/08-clientes.md).

| Método | Rota | Objetivo | Permissão |
|---|---|---|---|
| `GET` | `/v1/clients` | Listar clientes | `client:read` |
| `POST` | `/v1/clients` | Criar cliente | `client:create` |
| `GET` | `/v1/clients/:id` | Detalhe | `client:read` |
| `PATCH` | `/v1/clients/:id` | Atualizar | `client:update` |
| `DELETE` | `/v1/clients/:id` | Soft delete | `client:delete` |
| `GET` | `/v1/clients/:id/legal-cases` | Processos deste cliente | `client:read` + `case:read:{escopo}` aplicado por item |
| `GET` | `/v1/clients/:id/documents` | Documentos vinculados diretamente ao cliente | `client:read` + `document:read` |
| `GET` | `/v1/clients/:id/audit` | Trilha de auditoria do cliente | `audit:read` |

## 8.1 `GET /v1/clients`

**Query:** `q` (busca local por nome/documento), `tipo`, `status`,
`responsavelId`, `sort` (`nome`, `-criadoEm`), cursor/limit.
**Resposta 200:** array de `ClienteResumoDTO` (ver [18-dtos.md](18-dtos.md)).

## 8.2 `POST /v1/clients`

**Body:** `CriarClienteDTO` — único campo obrigatório: `nome` + `tipo`
(reafirma [../ux/08-clientes.md §8.1](../ux/08-clientes.md), princípio de
cadastro mínimo). **Resposta 201.** **Regras:** se `documento` (CPF/CNPJ)
informado e já existir no escritório, resposta ainda é `201`, mas inclui
`avisos: [{ "codigo": "DUPLICATE_DOCUMENT", "clienteExistenteId": "..." }]` —
**nunca bloqueia** a criação (reafirma
[../database/04-entidades-clientes-processos.md §4.1](../database/04-entidades-clientes-processos.md)).
**Idempotência:** `Idempotency-Key` obrigatório.

## 8.3 `GET /v1/clients/:id`

**Resposta 200:** `ClienteDetalheDTO`, inclui contadores (`processosAtivos`,
`documentosCount`) para popular as abas sem chamada adicional (reafirma
princípio de poucos cliques/evitar N+1, [20-performance.md](20-performance.md)).

## 8.4 `PATCH /v1/clients/:id`

**Body (parcial):** qualquer campo de `CriarClienteDTO`. Mesma regra de aviso
não bloqueante de duplicidade de documento no update.

## 8.5 `DELETE /v1/clients/:id`

**Erros:** `409` (`code: HAS_ACTIVE_LEGAL_CASES`) se existir `Processo` não
excluído referenciando o cliente — reafirma `RESTRICT` físico de
[../database/07-relacionamentos-diagrama-er.md §7.3](../database/07-relacionamentos-diagrama-er.md).

## 8.6 `GET /v1/clients/:id/legal-cases`

**Resposta 200:** lista de processos onde `clienteId = :id` **ou** onde o
cliente aparece como `ParteProcesso` — cada item já filtrado pelo escopo de
`case:read` do usuário (processo sob segredo de justiça sem acesso não
aparece, sem gerar erro — apenas ausente da lista).

---

**Anterior:** [07-users.md](07-users.md) · **Próximo:** [09-legal-cases.md](09-legal-cases.md)
