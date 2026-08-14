# 23 — Tratamento de Erros

## 23.1 Tipo único `ApiError`

Todo erro de API é normalizado pelo cliente HTTP (§8.3) para um único
formato, espelhando o corpo real do backend (RFC 9457 + `timestamp`,
reafirma `docs/backend-implementation/19-decisions.md §19.1`):

```ts
interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;                 // 'FORBIDDEN', 'STALE_VERSION', ...
  correlationId: string;
  timestamp: string;
  fieldErrors?: { field: string; code: string; message: string }[];
  meta?: Record<string, unknown>;
}
```

Nenhuma feature define seu próprio formato de erro — todas consomem este
tipo, importado de `lib/api/errors.ts`.

## 23.2 Três níveis de tratamento (reafirma `docs/04 §4.9`)

| Nível | Mecanismo | Quando |
|---|---|---|
| Campo de formulário | `fieldErrors` → `form.setError` | `422` |
| Widget/bloco isolado | `ErrorBoundary` próprio + "Tentar novamente" | Bloco de Dashboard, aba de detalhe |
| Rota inteira | `error.tsx` (`reset()` disponível) | Falha ao carregar o dado principal da rota |
| Aplicação inteira | `global-error.tsx` | Falha no próprio root layout — não deveria acontecer em operação normal |
| Notificação transiente | `Toast` | Sucesso de mutation, erro de mutation que não é de campo (ex.: `429`) |

## 23.3 Mapeamento status → tratamento (consolida §8.3, aplicado por camada)

| Status/`code` | Nível | Mensagem |
|---|---|---|
| `401 UNAUTHENTICATED`/`TOKEN_EXPIRED` (após refresh falhar) | Redirecionamento global | "Sua sessão expirou. Entre novamente para continuar." |
| `401 SESSION_REVOKED` | Redirecionamento global | idem |
| `403 FORBIDDEN` | Toast ou banner de bloco | Mensagem genérica — se aparece, é porque `PermissionGate` já deveria ter escondido a ação (sinal de bug a investigar, não um fluxo esperado) |
| `404` (qualquer causa — inexistente, outro tenant, sigilo) | `not-found.tsx`/`error.tsx` da rota | "Não encontramos o que você procurava. [Voltar ao Dashboard]" — **sempre o mesmo texto**, reafirma [06-autorizacao.md §6.4](06-autorizacao.md) |
| `409 STALE_VERSION` | Banner inline no formulário | "Este processo foi atualizado por outra pessoa. Recarregue para ver a versão mais recente." |
| `409` outros (`DUPLICATE_CNJ`, `ALREADY_ACCEPTED`, ...) | Banner inline ou toast, por tela | Texto específico por `code`, catálogo em `docs/ux/14-ux-writing.md` |
| `422` | Campo de formulário | `fieldErrors` mapeado |
| `429 RATE_LIMITED` | Toast | "Muitas tentativas. Aguarde um momento e tente novamente." + respeita `Retry-After` (desabilita reenvio até o tempo passar) |
| `5xx` | `error.tsx`/`ErrorBoundary` | "Não foi possível completar a ação. Verifique sua conexão e tente novamente." + `correlationId` — nunca `detail` bruto do backend |
| `503 AI_PROVIDER_UNAVAILABLE`/`STORAGE_UNAVAILABLE` | Card de erro local (IA/upload) | Mensagem específica de domínio, ver [22-ai.md §22.3](22-ai.md)/[18-documents-folders.md](18-documents-folders.md) |
| Rede/timeout (sem resposta HTTP) | `ErrorBoundary`/toast | "Não foi possível completar a ação. Verifique sua conexão e tente novamente." |
| Offline (`navigator.onLine=false`) | Banner persistente no topo do AppShell | "Você está offline. Algumas ações podem não funcionar." — detectado via evento `online`/`offline`, não polling |

## 23.4 `correlationId` sempre visível, nunca protagonista

Toda superfície de erro (toast, banner, `error.tsx`) mostra o
`correlationId` em texto pequeno/secundário — nunca como parte da
mensagem principal (reafirma `docs/ux/14-ux-writing.md`: "correlation ID
sempre disponível mas pequeno e secundário"). É o que torna suporte
viável sem expor detalhe técnico ao usuário final.

## 23.5 O que nunca aparece na UI

Stack trace, nome de exceção interna, `detail` de erro `500` bruto, SQL,
nome de tabela/coluna — o backend já não expõe isso
(`common/filters/all-exceptions.filter.ts`), e o frontend não teria como
reconstruir mesmo se quisesse; esta seção existe para deixar explícito
que nenhuma camada do frontend tenta "enriquecer" um erro genérico com
detalhe técnico para fins de debug em produção (isso é
[29-observability.md](29-observability.md), não a UI).

---

**Anterior:** [22-ai.md](22-ai.md) · **Próximo:** [24-accessibility.md](24-accessibility.md)
