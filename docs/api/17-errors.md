# 17 — Tratamento de Erros

> Reafirma [../05-arquitetura-backend.md §5.11](../05-arquitetura-backend.md)
> — RFC 9457 (Problem Details) em toda resposta de erro, sem exceção.

## 17.1 Estrutura única

```json
{
  "type": "https://docs.quilombodev.com.br/errors/duplicate-cnj",
  "title": "Número de processo já cadastrado",
  "status": 409,
  "detail": "Já existe um processo com este número neste escritório.",
  "instance": "/v1/legal-cases",
  "code": "DUPLICATE_CNJ",
  "correlationId": "8f3e...",
  "fieldErrors": [],
  "meta": { "processoExistenteId": "..." }
}
```

| Campo | Obrigatório | Descrição |
|---|---|---|
| `type` | Sim | URI estável do tipo de erro (documentação pública, não precisa resolver) |
| `title` | Sim | Resumo curto, estável por `code` |
| `status` | Sim | Código HTTP, espelha o status da resposta |
| `detail` | Sim | Mensagem específica desta ocorrência — a mesma exibida ao usuário (reafirma tom de [../ux/14-ux-writing.md](../ux/14-ux-writing.md)) |
| `instance` | Sim | Path do endpoint que originou o erro |
| `code` | Sim | Identificador estável em `UPPER_SNAKE_CASE`, para o frontend decidir comportamento sem parsear texto |
| `correlationId` | Sim | Reafirma [01-convencoes.md §1.10](01-convencoes.md) — exibido em texto pequeno na UI |
| `fieldErrors` | Quando aplicável | Array de `{ "field": "numeroCnj", "code": "INVALID_CHECK_DIGIT", "message": "..." }` — validação de formulário |
| `meta` | Quando aplicável | Dado adicional específico do erro (ex.: ID de recurso conflitante) |

## 17.2 Catálogo de status HTTP

| Status | Uso | Exemplo de `code` |
|---|---|---|
| `400 Bad Request` | Requisição malformada (JSON inválido, tipo errado) | `MALFORMED_REQUEST` |
| `401 Unauthorized` | Sem token, token inválido/expirado | `UNAUTHENTICATED`, `TOKEN_EXPIRED` |
| `403 Forbidden` | Ação não permitida pelo papel (existência do recurso não é segredo) | `FORBIDDEN` |
| `404 Not Found` | Recurso não existe, fora do tenant, ou sem acesso por segredo de justiça/confidencialidade (indistinguível de "não existe") | `NOT_FOUND` |
| `409 Conflict` | Conflito de estado (duplicidade, versão desatualizada, dependência impede exclusão) | `DUPLICATE_CNJ`, `STALE_VERSION`, `HAS_ACTIVE_LEGAL_CASES` |
| `422 Unprocessable Entity` | Validação semântica (dígito verificador inválido, arquivo grande demais, cota excedida) | `INVALID_CHECK_DIGIT`, `FILE_TOO_LARGE` |
| `423 Locked` | Recurso bloqueado por segurança (documento infectado) | `FILE_INFECTED` |
| `429 Too Many Requests` | Rate limit excedido | `RATE_LIMITED` |
| `500 Internal Server Error` | Falha não esperada — nunca expõe stack trace ou detalhe técnico ao cliente | `INTERNAL_ERROR` |
| `503 Service Unavailable` | Dependência externa indisponível (provedor de IA, storage) | `AI_PROVIDER_UNAVAILABLE`, `STORAGE_UNAVAILABLE` |

## 17.3 Regras gerais

- Mensagens de autenticação (`401` em login) são **genéricas** — nunca
  revelam se o e-mail existe (reafirma
  [../02-autenticacao.md §2.3](02-autenticacao.md) e
  [../09-seguranca-lgpd.md §9.2](../09-seguranca-lgpd.md)).
- `500` nunca inclui mensagem de exceção interna, nome de classe ou stack
  trace no corpo — apenas `correlationId` para correlação em log de
  observabilidade (reafirma [../05-arquitetura-backend.md §5.12](../05-arquitetura-backend.md)).
- Todo erro de validação de formulário retorna `422` com `fieldErrors`
  populado, mapeável diretamente ao React Hook Form do frontend
  ([../04-arquitetura-frontend.md §4.5](../04-arquitetura-frontend.md)).
- Erros SSE (streaming de IA/notificações) seguem o mesmo `code` catalogado
  aqui, emitidos como evento `error` em vez de status HTTP (a conexão SSE já
  está em `200`).

---

**Anterior:** [16-audit.md](16-audit.md) · **Próximo:** [18-dtos.md](18-dtos.md)
