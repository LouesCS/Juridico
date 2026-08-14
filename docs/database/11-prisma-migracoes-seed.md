# 11 — Prisma ORM, Migrações e Seed

> Convenções e estratégia — **não é o `schema.prisma` final**, nem migrations
> executáveis (fora de escopo desta etapa, conforme restrição do prompt).
> Trechos de Prisma abaixo são ilustrativos de decisão, não schema completo.

---

## 11.1 Convenções para modelos Prisma

- Um arquivo por módulo de domínio, usando o recurso `prismaSchemaFolder`
  (multi-file schema): `prisma/schema/identity.prisma`,
  `offices.prisma`, `memberships.prisma`, `clients.prisma`, `legal-cases.prisma`,
  `documents.prisma`, `timeline.prisma`, `comments.prisma`, `tags.prisma`,
  `ai-summaries.prisma`, `notifications.prisma`, `audit.prisma` — espelha
  exatamente os módulos de [00-resumo-modelagem.md §0.4](00-resumo-modelagem.md).
- Mapeamento de nomes conforme [02-convencoes-dados.md §2.1](02-convencoes-dados.md)
  (`@map`/`@@map` sistemáticos).
- `datasource` único (`postgresql`), `generator client` único — não há um
  Prisma Client por módulo; a separação é de arquivo-fonte, não de client em
  runtime (mantém o monólito modular coerente com uma única conexão/pool).

## 11.2 Relações no Prisma

- Toda relação tenant-scoped inclui a FK composta descrita em
  [02-convencoes-dados.md §2.4.1](02-convencoes-dados.md) — no Prisma isso é
  modelado com `@@unique([id, escritorioId])` no lado referenciado e
  `@relation(fields: [clienteId, escritorioId], references: [id, escritorioId])`
  no lado referenciador.
- Relações opcionais (`Documento.processoId`) usam `String?` + `@relation(...,
  onDelete: SetNull)`.
- Nenhuma relação `onDelete: Cascade` é aplicada a uma tabela de domínio com
  soft delete próprio sem revisão explícita — `Cascade` é reservado a tabelas
  satélite puras (versões, partes, tabelas associativas), conforme matriz de
  [07-relacionamentos-diagrama-er.md §7.3](07-relacionamentos-diagrama-er.md).

## 11.3 Enums

Enums Prisma para os conjuntos definidos em
[02-convencoes-dados.md §2.9](02-convencoes-dados.md), mapeados 1:1 para enum
nativo do Postgres:
```prisma
enum StatusProcesso {
  ATIVO
  SUSPENSO
  ARQUIVADO
  ENCERRADO

  @@map("status_processo_enum")
}
```
Adicionar valor exige `prisma migrate dev` gerando `ALTER TYPE ... ADD VALUE`
— aceito conforme trade-off já registrado.

## 11.4 Middleware / Client Extensions

Prisma `$extends` (Client Extensions) substitui o antigo `$use` (middleware,
depreciado) para três responsabilidades transversais, todas descritas em
detalhe em outros documentos desta pasta:

| Extensão | Responsabilidade | Referência |
|---|---|---|
| `withTenantContext` | Injeta `escritorioId` automaticamente em toda operação de modelo tenant-scoped | [01-estrategia-multitenancy.md §1.4](01-estrategia-multitenancy.md) |
| `withSoftDelete` | Filtra `excluidoEm IS NULL` por padrão; converte `delete`/`deleteMany` em `update` de `excluidoEm` | [10-soft-delete-retencao-lgpd.md §10.9](10-soft-delete-retencao-lgpd.md) |
| `withAudit` | Emite evento para o `AuditInterceptor` após operações marcadas como sensíveis (via metadado de decorator na camada de aplicação, não no Prisma) | [06-entidades-ia-notificacoes-auditoria.md §6.6](06-entidades-ia-notificacoes-auditoria.md) |

As três são compostas na inicialização do client:
```
const prisma = new PrismaClient()
  .$extends(withSoftDelete)
  .$extends(withTenantContext);
```
`withAudit` não é uma extensão de query do Prisma (auditoria de leitura de
documento, por exemplo, precisa capturar *quem pediu*, não apenas *o que foi
lido*) — vive como interceptor NestJS na camada de apresentação, conforme já
definido em [../05-arquitetura-backend.md §5.7](../05-arquitetura-backend.md).

## 11.5 Tratamento de soft delete no Prisma

Como o Prisma não suporta nativamente "soft delete transparente", a extensão
reescreve a operação:
- `delete`/`deleteMany` → `update`/`updateMany` setando `excluidoEm = now()`,
  `excluidoPor = tenantContext.membroId`.
- `findMany`/`findFirst`/`count` → injeta `excluido_em: null` no `where`, a
  menos que a chamada explicitamente passe `withDeleted: true` (opção de escape
  usada exclusivamente pela tela de Lixeira e por jobs de expurgo).

## 11.6 Transações

Toda escrita que envolve mais de uma tabela (ex.: aceitar convite → criar
`Membro` + atualizar `Convite`; criar prazo → inserir `Prazo` + inserir
`EventoTimeline`) usa `prisma.$transaction([...])` ou a forma interativa
`prisma.$transaction(async (tx) => {...})` quando há lógica condicional entre
os passos. É dentro dessa transação que o `SET LOCAL app.tenant_id` de RLS é
emitido como primeiro comando (§1.7 em
[01-estrategia-multitenancy.md](01-estrategia-multitenancy.md)) — nunca fora
dela, sob pena de a variável de sessão não estar ativa para as queries
seguintes em ambiente com PgBouncer transaction pooling.

## 11.7 Paginação

`cursor` + `take` + `orderBy` do Prisma mapeiam diretamente para a estratégia
de keyset pagination de [02-convencoes-dados.md §2.15](02-convencoes-dados.md) —
nunca `skip` (offset) além de telas administrativas de baixo volume
(ex.: lista de papéis customizados, que nunca passa de dezenas de linhas).

## 11.8 Seleção de campos

`select` explícito em todo endpoint de listagem — nunca retornar o modelo
completo por padrão. Em particular, `senhaHash`, `mfaSegredo`,
`refreshTokenHash`, `accessTokenCriptografado` **nunca** aparecem em nenhum
`select` de leitura voltada à API — reforçado por um tipo TypeScript de
"Usuario público" gerado a partir do schema, que estruturalmente não inclui
esses campos (omissão em tempo de compilação, não apenas disciplina de code
review).

## 11.9 Prevenção de N+1

- `include`/`select` aninhado explícito por caso de uso (ex.: listagem de
  processos com `include: { cliente: { select: { id, nome }}, responsavel: {...} }`
  em uma única query).
- Teste de contagem de queries (via listener de evento `prisma:query` em
  ambiente de teste) por endpoint crítico, com limite máximo declarado —
  regressão de N+1 quebra o teste, não é descoberta em produção.
- Para grafo mais profundo (montagem de contexto de IA — Processo → Documentos
  → Versões → texto extraído), usar `Promise.all` sobre um único `findMany`
  com `include` em vez de laço de `findUnique`.

## 11.10 Repositórios

Um repositório Prisma por agregado (`PrismaProcessoRepository`,
`PrismaDocumentoRepository`, ...), implementando a interface de domínio
definida na camada de aplicação (reafirma
[../05-arquitetura-backend.md §5.2](../05-arquitetura-backend.md)). Nenhum
repositório expõe o `PrismaClient` cru para fora de si — o use case nunca
importa `@prisma/client` diretamente.

## 11.11 Testes

- **Testes de integração de repositório** rodam contra um Postgres real (via
  Testcontainers), nunca contra um mock de Prisma — o valor destes testes está
  exatamente em validar RLS, constraints e comportamento de FK composta, que um
  mock não reproduz.
- **Testes de use case** mockam a interface de repositório (não o Prisma) —
  granularidade correta de unidade.
- Suíte de isolamento de tenant (§1.10 em
  [01-estrategia-multitenancy.md](01-estrategia-multitenancy.md)) roda como
  parte desta mesma categoria de teste de integração.

## 11.12 Como evitar consulta sem `escritorioId` (reforço multi-camada)

1. Extensão Prisma lança exceção se `tenantContext` ausente (§1.5).
2. Regra de lint proíbe `@prisma/client` fora de `infrastructure/`.
3. `BaseTenantRepository<T>` exige `escritorioId` como parâmetro posicional
   obrigatório em toda assinatura de método — impossível compilar sem ele.
4. RLS no banco recusa a leitura mesmo que as três camadas acima falhem.
5. Teste de CI dedicado (§1.10) valida as quatro camadas continuamente.

---

## 11.13 Estratégia de migrações por ambiente

| Ambiente | Como migrations rodam | Quem aciona |
|---|---|---|
| Local | `prisma migrate dev` | Desenvolvedor, interativo |
| Desenvolvimento (compartilhado) | `prisma migrate deploy` no pipeline de CI ao mergear em `develop` | CI, automático |
| Homologação | `prisma migrate deploy` + seed de dados fictícios (anonimizados) | CI, automático, gate manual de aprovação antes do deploy da aplicação |
| Produção | `prisma migrate deploy` como etapa **anterior** ao deploy da nova versão da aplicação, nunca simultânea | CI/CD, com aprovação manual explícita para qualquer migration marcada como destrutiva |

**Migrations destrutivas** (`DROP COLUMN`, `DROP TABLE`, `ALTER COLUMN` que
estreita tipo/nulidade) seguem o padrão *expand/contract*: (1) migration que
adiciona o novo estado sem remover o antigo, (2) deploy da aplicação que passa
a usar o novo estado mas ainda tolera o antigo, (3) migration separada, em
janela própria, que remove o estado antigo — nunca uma única migration que
quebra compatibilidade com a versão anterior da aplicação em produção
(deploy sem indisponibilidade depende disso).

**Rollback:** Prisma Migrate não tem rollback automático — a estratégia é
"rollforward": uma migration de correção nova, nunca reverter a migration
aplicada. Rollback de emergência real é via restauração de backup (PITR),
reservado a incidente grave, não a fluxo normal de correção.

**Backup antes de migration crítica:** obrigatório para qualquer migration
destrutiva ou que reescreva volume relevante de linhas (ex.: backfill de
coluna nova em `processos`) — snapshot manual adicional ao backup diário
automático, antes de aplicar em produção.

**Compatibilidade entre versões:** o contrato OpenAPI
([../05-arquitetura-backend.md §5.11](../05-arquitetura-backend.md)) e o padrão
expand/contract acima garantem que a API nunca quebra um cliente frontend
"meio migrado" durante o deploy.

## 11.14 Seed inicial

**Sempre semeado (todos os ambientes, incluindo produção):**
- Papéis de sistema (`OWNER`, `ADMIN`, `SOCIO`, `ADVOGADO`, `ASSISTENTE`,
  `ESTAGIARIO`) — dados de sistema, não fictícios.
- Catálogo de permissões (`Permissao`) e o vínculo `papel_permissao` da matriz
  de [08-permissoes-seguranca.md §8.3](08-permissoes-seguranca.md).
- Categorias/tipos padrão de documento, tipos de evento de timeline,
  prioridades de prazo — enums já cobrem a maior parte disso; o que fica como
  linha de tabela (não enum) são os valores iniciais de taxonomia livre
  (`area` do processo, `categoria` de documento) oferecidos como sugestão na UI.

**Somente em desenvolvimento/homologação (nunca em produção):**
- Um escritório demonstrativo (`slug = 'demo'`).
- Usuários fictícios com e-mails de domínio de teste (`@exemplo.invalid`), um
  por papel, para permitir QA manual de cada perfil.
- Clientes fictícios (nomes genéricos gerados, ex.: "Cliente Demonstração 1",
  CPF/CNPJ **matematicamente válidos porém não correspondentes a pessoa/empresa
  real** — usando faixas reservadas para teste, nunca documento de pessoa real).
- Processos fictícios com número CNJ **sintaticamente válido mas de faixa não
  distribuída** (não reutilizar número de processo real).
- Documentos fictícios: arquivos de texto simples gerados (ex.: "Petição
  inicial de demonstração"), nunca upload de documento real de cliente.

**Nunca no seed, em nenhum ambiente:** dado pessoal real de qualquer pessoa
física ou jurídica — reafirma a restrição explícita desta etapa.

**Idempotência do seed:** todo seed usa `upsert` chaveado por identificador
estável (`slug`, `chave` de permissão, `nome` de papel de sistema) — rodar o
seed múltiplas vezes nunca duplica registro.

---

**Anterior:** [10-soft-delete-retencao-lgpd.md](10-soft-delete-retencao-lgpd.md) · **Próximo:** [12-eventos-fluxos-regras.md](12-eventos-fluxos-regras.md)
