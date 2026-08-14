# 08 — Cliente HTTP

## 8.1 Um único cliente, `fetch` nativo

`lib/api/client.ts` — wrapper fino sobre `fetch`, não uma biblioteca de
terceiro (axios/ky) — evita duplicar responsabilidade que o próprio
`fetch` + `AbortController` já cobrem, e mantém o bundle menor. Toda
feature chama a API através deste único módulo; nenhuma feature usa
`fetch` diretamente.

## 8.2 Configuração base

```ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL; // ex. https://api.quilombodev.com.br/api/v1
// credentials: 'include' em toda chamada — cookie httpOnly viaja
// automaticamente (mesmo site, ver 05-autenticacao.md §5.1); nenhum
// header Authorization é montado manualmente pelo frontend.
```

| Aspecto | Decisão |
|---|---|
| URL base | `NEXT_PUBLIC_API_URL`, validada em `config/env.ts` (Zod, falha o boot se ausente) |
| Credenciais | `credentials: 'include'` sempre |
| Header `X-Correlation-Id` | Gerado uma vez por operação de negócio (não por requisição HTTP individual) — reafirma `docs/api/01-convencoes.md §1.10`; propagado manualmente quando uma ação do usuário dispara múltiplas chamadas relacionadas |
| Header `Idempotency-Key` | Gerado (`crypto.randomUUID()`) e anexado automaticamente pelo cliente em todo `POST` que a camada de tipos gerados marca como side-effect significativo (criar processo, criar documento, solicitar IA, convidar membro) — reafirma `docs/api/01-convencoes.md §1.11` |
| Timeout | 30s por requisição via `AbortSignal.timeout(30_000)`, exceto upload/download (sem timeout, progresso é o sinal de vida) |
| Cancelamento | Todo hook do TanStack Query recebe o `signal` do próprio React Query e repassa ao `fetch` — navegação para fora da tela cancela a chamada em andamento |
| Retries | Delegado ao TanStack Query (ver [10-tanstack-query.md §10.1](10-tanstack-query.md)), **nunca** dentro do cliente HTTP em si — evita duplicar política de retry em duas camadas |
| Serialização de query params | `URLSearchParams` com convenção de filtro composto (`campo[gte]=`) idêntica ao backend, reafirma `docs/api/01-convencoes.md` |

## 8.3 Tratamento de status — mapeamento único

O cliente nunca decide *o que fazer* com um erro (isso é responsabilidade
de quem chama — um formulário mostra erro de campo, uma listagem mostra
`ErrorState`); ele só **normaliza** toda resposta não-2xx para um tipo
único `ApiError`, definido a partir do corpo RFC 9457 real do backend
(ver [23-errors.md §23.1](23-errors.md) para o tipo completo):

| Status | Tratamento no cliente | Quem decide a UI |
|---|---|---|
| `401 TOKEN_EXPIRED` | Refresh transparente (ver [05-autenticacao.md §5.6](05-autenticacao.md)) | — (invisível ao chamador, se o refresh funcionar) |
| `401` outro código | Propaga `ApiError` | Chamador (geralmente redireciona) |
| `403 FORBIDDEN` | Propaga `ApiError` | `PermissionGate` já deveria ter escondido a ação — se chegou aqui, mostra erro genérico |
| `404` | Propaga `ApiError` | `not-found.tsx` (nunca distingue causa, §6.4) |
| `409` | Propaga `ApiError` com `meta` | Formulário/tela mapeia `code` específico (`STALE_VERSION`, `DUPLICATE_CNJ`) para banner/campo |
| `422` | Propaga `ApiError` com `fieldErrors` | React Hook Form mapeia `fieldErrors` para `setError` por campo (ver [12-formularios.md §12.5](12-formularios.md)) |
| `429` | Propaga `ApiError`, expõe `Retry-After` no `meta` | Toast com tempo de espera |
| `5xx` | Propaga `ApiError` genérico, nunca expõe `detail` bruto do 500 (evita vazar detalhe interno mesmo que o backend já sanitize) | `ErrorState` genérico + `correlationId` |

## 8.4 Fila de refresh (detalhe de implementação, não decisão nova)

```ts
let refreshInFlight: Promise<void> | null = null;

async function ensureFreshSession() {
  refreshInFlight ??= fetch(`${BASE_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(() => undefined)
    .finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}
```

Garante uma única chamada de refresh mesmo quando várias queries falham
com `401` simultaneamente (ex.: Dashboard disparando 6 queries em
paralelo no primeiro load com um token que acabou de expirar).

## 8.5 Upload e download

- **Upload:** o cliente HTTP central **não** transporta o binário (ele vai
  direto do browser para a URL assinada de storage via `PUT`, fora da API
  NestJS) — só as duas chamadas de metadado (`presign`, `confirm`), ver
  [18-documents-folders.md §18.2](18-documents-folders.md).
  Progresso do `PUT` direto usa `XMLHttpRequest` (não `fetch`, que ainda
  não expõe progresso de upload de forma confiável em todos os browsers-alvo)
  isolado em `lib/api/upload.ts`, não no cliente principal.
- **Download:** `GET /documents/:id/download` retorna uma URL assinada de
  curta duração (não o binário) — o cliente navega para essa URL
  diretamente (`window.location` ou `<a download>`), nunca faz `fetch` +
  `Blob` manual (evitaria duplicar o binário na memória do browser sem
  necessidade).
- **Blobs:** único caso de `Blob` client-side é preview inline quando o
  tipo de arquivo exige processamento local (nenhum identificado nesta
  etapa — preview de PDF/imagem/Office já é servido pronto pelo backend
  via URL assinada).

## 8.6 Segurança

Nenhum dado sensível (token, `mfaChallengeToken`, `fieldErrors` completo)
é logado pelo cliente — ver [25-security.md §25.7](25-security.md) e
[29-observability.md §29.4](29-observability.md).

---

**Anterior:** [07-office-context.md](07-office-context.md) · **Próximo:** [09-openapi.md](09-openapi.md)
