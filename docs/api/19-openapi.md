# 19 — Estrutura OpenAPI 3.1

> Não é o YAML completo (fora do escopo desta etapa) — documenta como a
> especificação OpenAPI é organizada e gerada, para que o Backend produza o
> artefato real de forma consistente com todo o resto deste documento.

## 19.1 Geração — automática, não escrita à mão

Reafirma [../05-arquitetura-backend.md §5.11](../05-arquitetura-backend.md):
o OpenAPI 3.1 é **gerado automaticamente** a partir dos decorators do NestJS
(`@nestjs/swagger`) e dos schemas Zod dos DTOs (via adaptador
`zod-to-openapi`) — nunca mantido manualmente em paralelo ao código. Este
documento (`docs/api/`) é a especificação **prévia** que orienta a
implementação; o YAML/JSON gerado é o artefato **posterior**, que deve
corresponder a ele. Divergência entre os dois em revisão de PR é tratada como
bug de implementação, não como "a spec está desatualizada".

## 19.2 Estrutura do documento OpenAPI

```yaml
openapi: 3.1.0
info:
  title: Quilombo Dev API
  version: 1.0.0
  description: API oficial do Workspace Jurídico Inteligente
servers:
  - url: https://api.quilombodev.com.br/api/v1
    description: Produção
  - url: https://api.staging.quilombodev.com.br/api/v1
    description: Homologação
tags:
  - name: Identity
  - name: Offices
  - name: Memberships
  - name: Users
  - name: Clients
  - name: LegalCases
  - name: Documents
  - name: Timeline
  - name: Comments
  - name: Notifications
  - name: AI
  - name: Search
  - name: Audit
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas: { /* gerado dos DTOs — ver 18-dtos.md */ }
  responses:
    ProblemDetails: { /* schema único de erro — ver 17-errors.md */ }
paths: { /* um path item por endpoint documentado em 04-16 */ }
```

`tags` espelha 1:1 os módulos de domínio de
[../database/00-resumo-modelagem.md §0.4](../database/00-resumo-modelagem.md)
— cada arquivo `04` a `16` desta pasta corresponde a exatamente uma tag.

## 19.3 Convenção de `operationId`

`{método}{Recurso}[Ação]`, camelCase — ex.: `createLegalCase`,
`listLegalCases`, `getLegalCase`, `updateLegalCase`, `archiveLegalCase`. É a
partir do `operationId` que o gerador de tipos do frontend
([../04-arquitetura-frontend.md §4.2](../04-arquitetura-frontend.md), `lib/api/generated/`)
nomeia os hooks do TanStack Query (`useCreateLegalCase`, etc.) — nome
consistente aqui evita hook gerado com nome confuso no frontend.

## 19.4 Schemas reutilizáveis

Todo DTO de [18-dtos.md](18-dtos.md) vira um `components/schemas/<Nome>` —
gerado uma única vez e referenciado (`$ref`) por todo endpoint que o usa,
nunca duplicado inline. `ProblemDetails` é `$ref` em **toda** resposta de
erro de **todo** endpoint, sem exceção (reafirma
[17-errors.md](17-errors.md)).

## 19.5 Extensões SSE

OpenAPI 3.1 não tem suporte nativo de primeira classe a Server-Sent Events —
endpoints de streaming (`/v1/ai-summaries/:id/stream`,
`/v1/notifications/stream`) são documentados com `content-type:
text/event-stream` e uma extensão customizada `x-sse-events` listando os
tipos de evento possíveis (`token`, `source`, `done`, `error` para IA;
`notification.created`, `notification.read`, `heartbeat` para notificações) —
formato ilustrativo, não normativo do OpenAPI, mas suficiente para gerar
documentação legível e para o time de frontend saber o que esperar.

## 19.6 Versionamento do documento OpenAPI

Um arquivo por versão major da API (`openapi-v1.yaml`), publicado em
`docs/api/generated/` (fora desta pasta de especificação prévia) a partir do
pipeline de CI a cada deploy — nunca editado manualmente.

## 19.7 Uso pelo Frontend

`openapi-typescript` (ou equivalente) gera os tipos TypeScript consumidos por
`lib/api/generated/` — fonte única de tipos entre os dois lados, reafirma
[../04-arquitetura-frontend.md §4.2](../04-arquitetura-frontend.md). O
frontend nunca declara um tipo de resposta de API à mão.

## 19.8 Relação entre Zod, DTOs do NestJS e `@nestjs/swagger` (pendência resolvida)

> Fecha a pendência de geração/manutenção do OpenAPI registrada em
> [22-decisoes.md §22.5](22-decisoes.md).

**Fonte única da verdade: o schema Zod.** Cada DTO catalogado em
[18-dtos.md](18-dtos.md) nasce como um schema Zod (`z.object({...})`) na
camada de aplicação — o mesmo schema usado para:

1. **Validação em runtime** — pipe `ZodValidationPipe` na borda do NestJS
   (reafirma [../05-arquitetura-backend.md §5.2](../05-arquitetura-backend.md)).
2. **Tipo TypeScript** — `z.infer<typeof Schema>`, usado como tipo do DTO em
   toda a camada de aplicação/domínio — nunca uma `class` do NestJS mantida
   em paralelo ao schema.
3. **Documento OpenAPI** — convertido para JSON Schema via adaptador
   (`@anatine/zod-nestjs` ou equivalente: `zod-to-openapi`), que gera o
   decorator `@ApiProperty`/`@ApiSchema` equivalente automaticamente a partir
   do schema, sem anotação manual duplicada.

```
schema Zod (única definição)
        │
        ├──> ZodValidationPipe          (validação em runtime)
        ├──> z.infer<typeof X>          (tipo TypeScript do DTO)
        └──> zod-to-openapi             (schema OpenAPI, consumido por @nestjs/swagger)
```

**O que isso impede estruturalmente:** não existe caminho de código onde o
schema de validação, o tipo TypeScript e a documentação OpenAPI divergem
entre si — os três são **derivados da mesma declaração**, não escritos três
vezes. `@nestjs/swagger` continua responsável por montar o documento
(`SwaggerModule.createDocument`), agregando os `tags`/`paths`/`operationId`
descritos em [19.2-19.3](19-openapi.md); o que muda é que os `schemas`
individuais vêm do Zod, não de classes anotadas manualmente com decorators
`@ApiProperty` linha a linha.

**Regra explícita:** é proibido declarar uma `class` de DTO do NestJS
anotada manualmente com `@ApiProperty` quando já existe schema Zod
equivalente — isso reintroduziria exatamente a duplicação (schema + classe)
que esta decisão elimina. Um DTO só é uma `class` quando precisa de método
(raríssimo em DTO) — nesse caso, a classe é gerada a partir do schema Zod via
`createZodDto()`, nunca escrita solta.

## 19.9 Impedir divergência entre documentação e implementação — validação no CI

Três gates automatizados, todos bloqueantes de merge:

| Gate | O que verifica | Como |
|---|---|---|
| **Geração bem-sucedida** | O documento OpenAPI é gerado sem erro a partir do código atual | Etapa de build chama `SwaggerModule.createDocument` e falha o pipeline se lançar exceção (schema Zod inválido, `operationId` duplicado) |
| **Diff de contrato** | O OpenAPI gerado nesta branch não removeu/alterou incompativelmente um campo ou endpoint documentado nesta pasta (`docs/api/`) sem uma entrada correspondente em [22-decisoes.md](22-decisoes.md) | Ferramenta de diff semântico de OpenAPI (`oasdiff` ou equivalente) compara o artefato gerado contra o artefato da última versão publicada; breaking change sem anotação de versão nova falha o build |
| **Contract testing** | O comportamento real da API (não apenas o schema declarado) corresponde ao contrato | Ver [../backend/11-testes.md](../backend/11-testes.md) — estratégia detalhada na documentação de backend, pois depende da suíte de testes de integração |

**Fonte única da verdade — reafirmada:** entre "o que está escrito em
`docs/api/04` a `docs/api/16`" e "o que o OpenAPI gerado descreve", o
segundo é o artefato **executável e verificado por máquina**; o primeiro é a
especificação de **intenção**, escrita antes da implementação existir. Em
caso de divergência descoberta depois de implementado, a correção é sempre
no código (para voltar a corresponder ao contrato desta pasta) — a menos que
a própria mudança de contrato seja deliberada, caso em que esta pasta é
atualizada **primeiro**, em um PR revisado separadamente do código, e só
então a implementação segue.

---

**Anterior:** [18-dtos.md](18-dtos.md) · **Próximo:** [20-performance.md](20-performance.md)
