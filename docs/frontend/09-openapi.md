# 09 — OpenAPI e Tipos

## 9.1 Fonte única de verdade

O backend já gera o OpenAPI 3.1 a partir dos schemas Zod dos DTOs
(`docs/api/19-openapi.md §19.8` — "Zod como fonte única de verdade").
O frontend **consome esse documento gerado**, nunca reescreve os tipos à
mão: `openapi-typescript` converte o JSON/YAML publicado pelo backend
(`/api/v1/docs/openapi.json`, exposto pelo Swagger já configurado em
`apps/api/src/main.ts`) em `lib/api/generated/schema.d.ts` — só
interfaces TypeScript, **sem client** (decisão detalhada em §9.3).

```
apps/web/scripts/generate-api-types.ts
  → npx openapi-typescript http://localhost:3000/api/v1/docs/openapi.json \
      -o src/lib/api/generated/schema.d.ts
```

Rodado localmente (`npm run generate:types`) e em CI (ver
[30-ci.md §30.1](30-ci.md)) — o arquivo gerado é commitado (não gerado no
build de produção, para não depender do backend estar de pé para buildar
o frontend), e o CI falha se a regeneração produzir um diff não
commitado (drift entre contrato e tipos usados).

## 9.2 Tipos gerados vs. schemas Zod de formulário — dois papéis distintos

| | Tipos gerados (`lib/api/generated/`) | Schemas Zod (`features/*/schemas/`) |
|---|---|---|
| Papel | Tipar request/response da API | Validar entrada do usuário num formulário |
| Fonte | OpenAPI do backend | Escritos à mão, por tela |
| Runtime | Nenhum (só TypeScript, apagado no build) | Sim — roda no navegador (`zodResolver`) |
| Conteúdo | Forma exata do contrato (inclusive campos que a API aceita mas o formulário não expõe) | Regras de UX: mensagem em português, máscara, checksum de CNJ/CPF, campo condicional |
| Exemplo | `components['schemas']['LegalCaseDTO']` | `legalCaseFormSchema` (subconjunto do DTO + validação de dígito verificador de CNJ) |

Isso **não é duplicação** — são dois contratos com propósitos diferentes,
a mesma distinção já registrada explicitamente para o backend em
`docs/api/19-openapi.md §19.8` (Zod para validação de entrada, OpenAPI
gerado para documentação/contrato). O antipadrão banido é escrever uma
`interface LegalCase { ... }` manual em algum lugar do frontend que
duplica o que `lib/api/generated/` já expressa.

## 9.3 Por que não gerar um client completo (orval/openapi-fetch)

Avaliado e descartado: gerar hooks de query/mutation prontos a partir do
OpenAPI (ex. orval com output TanStack Query). Motivo: a convenção de
chaves de query já decidida (escopadas por `officeId`, ver
[10-tanstack-query.md §10.2](10-tanstack-query.md)) e as regras de
invalidação cross-feature (ex.: criar um Processo invalida a lista de
Clientes se o card de cliente mostra contagem de processos) são regra de
domínio que um gerador genérico não conhece — geraria hooks que a equipe
teria que sobrescrever de qualquer forma. Decisão: gerar **só tipos**,
escrever à mão as funções `features/*/api/*.ts` (finas, um par
request/response por endpoint) e os hooks de query/mutation por cima
delas. Reavaliar se o catálogo de endpoints crescer a um tamanho onde a
repetição mecânica pesar mais que o valor do controle fino — registrado
como risco monitorável em [31-decisions.md §31.5](31-decisions.md).

## 9.4 Sincronização com o backend e CI

- **Local:** `npm run generate:types` contra o backend rodando localmente
  (ou contra um `openapi.json` commitado em `apps/api/` como artefato do
  CI do backend, para não exigir o backend de pé para desenvolver
  frontend puro).
- **CI do frontend** (ver [30-ci.md §30.1](30-ci.md)): regenera os tipos e
  falha se houver diff — nenhum PR entra com tipos desatualizados em
  relação ao contrato.
- **Detecção de breaking change:** o backend já roda `oasdiff` no seu
  próprio pipeline (`docs/backend/11-testes.md §11.4`); o frontend
  consome a mesma saída via um job que compara o `openapi.json` da branch
  do backend contra o commitado no frontend — uma mudança incompatível
  sem atualização correspondente no frontend falha o CI cruzado (gate
  cross-repo, detalhado em [30-ci.md §30.4](30-ci.md)).

## 9.5 Validação de resposta em runtime — escopo deliberadamente limitado

**Não** validamos toda resposta HTTP contra um schema Zod em runtime
(nem em desenvolvimento) — o custo de manter um segundo conjunto de
schemas Zod *de resposta* (distintos dos schemas *de formulário* do §9.2)
duplicaria exatamente o que este documento diz para evitar. Em vez disso:

- **Contract testing continua sendo a responsabilidade do backend**
  (Dredd/schemathesis, `docs/backend/11-testes.md §11.4") — é lá que
  request/response são verificados contra o OpenAPI de forma exaustiva.
- **Exceção:** payloads de **SSE** (notificações, streaming de resumo de
  IA) recebem um schema Zod pequeno e validado em runtime mesmo em
  produção (`features/notifications/schemas/sse-event.schema.ts`,
  `features/ai/schemas/stream-event.schema.ts`) — SSE não passa pelo
  mesmo pipeline de tipo do resto da API (é `EventSource`, texto puro
  desserializado manualmente), então é o único ponto onde uma
  divergência de contrato não seria pega em tempo de compilação. Evento
  que falha a validação é descartado com log em
  [29-observability.md](29-observability.md), nunca quebra a UI.

## 9.6 Contratos por endpoint — onde vivem

Cada `features/<dominio>/api/<recurso>.api.ts` importa só os tipos que usa
de `lib/api/generated/schema.d.ts` (nunca o arquivo inteiro) — ex.:

```ts
import type { components } from '@/lib/api/generated/schema';
type LegalCaseDTO = components['schemas']['LegalCaseDTO'];
type CreateLegalCaseInput = components['schemas']['CreateLegalCaseRequest'];
```

---

**Anterior:** [08-http-client.md](08-http-client.md) · **Próximo:** [10-tanstack-query.md](10-tanstack-query.md)
