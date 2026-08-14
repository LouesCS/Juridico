# 02 — Convenções de Modelagem de Dados

> Padrão oficial para toda tabela criada na Fase 1 e em fases seguintes.
> Divergir de qualquer item abaixo exige registro em ADR, não decisão ad-hoc.

---

## 2.1 Nomes de tabela e campo

| Camada | Convenção | Exemplo |
|---|---|---|
| Tabela (Postgres) | `snake_case`, **plural** | `processos`, `documentos`, `eventos_timeline` |
| Coluna (Postgres) | `snake_case` | `escritorio_id`, `criado_em`, `numero_cnj` |
| Model (Prisma) | `PascalCase`, **singular** | `Processo`, `Documento`, `EventoTimeline` |
| Campo (Prisma) | `camelCase` | `escritorioId`, `criadoEm`, `numeroCnj` |
| Tabela associativa | `snake_case` das duas entidades no singular, ordem alfabética do domínio | `processo_tag`, `documento_tag` |
| Enum (Postgres) | `snake_case`, sufixo `_enum` | `status_processo_enum` |
| Enum (Prisma) | `PascalCase` | `StatusProcesso` |
| Índice | `idx_{tabela}_{colunas}` | `idx_processos_escritorio_status` |
| Constraint única | `uq_{tabela}_{colunas}` | `uq_processos_escritorio_numero_cnj` |
| Foreign key | `fk_{tabela}_{tabela_referenciada}` | `fk_processos_clientes` |

Mapeamento no Prisma é sempre explícito, nunca implícito:
```prisma
model Processo {
  id           String   @id @default(uuid()) @db.Uuid
  escritorioId String   @map("escritorio_id") @db.Uuid
  numeroCnj    String?  @map("numero_cnj")
  criadoEm     DateTime @default(now()) @map("criado_em") @db.Timestamptz

  @@map("processos")
}
```
**Por quê separar convenção de banco e de aplicação:** `snake_case` é o padrão do
ecossistema SQL (compatibilidade com ferramentas de BI, `psql`, extensões);
`camelCase` é o padrão idiomático de TypeScript. O `@map` do Prisma torna essa
tradução automática e sem custo — não há razão para forçar uma convenção sobre a
outra.

## 2.2 Singular vs. plural

Tabela sempre no plural (representa um conjunto de linhas); model Prisma sempre
no singular (representa uma instância/entidade). Segue a convenção mais comum do
ecossistema Prisma + Postgres e evita a ambiguidade de "a tabela `processo` tem
uma linha chamada `processo`".

## 2.3 Chaves primárias — UUID, UUIDv7 ou CUID2

| Opção | Ordenável por tempo | Tamanho | Suporte nativo Postgres | Geração |
|---|---|---|---|---|
| UUID v4 | Não | 16 bytes | Nativo (`gen_random_uuid()`) | Banco ou app |
| **UUID v7** ✅ | Sim (prefixo de timestamp) | 16 bytes | Nativo a partir do PG 18; antes disso via função ou biblioteca | App (recomendado) |
| CUID2 | Sim | Variável (string) | Nenhum — é convenção de aplicação | App |

**Decisão:** **UUID v7**, gerado na camada de aplicação (biblioteca `uuidv7` no
Node), armazenado como `uuid` nativo do Postgres (`@db.Uuid`).

**Por quê não UUID v4 puro:** índices B-tree em PK aleatória (v4) degradam com
volume — cada inserção cai em posição imprevisível da árvore, aumentando *page
splits* e *bloat*. Isso importa especialmente para tabelas de alto volume de
escrita (`eventos_timeline`, `log_auditoria`).

**Por quê não CUID2:** não é um tipo nativo do Postgres (fica como `text`/`varchar`,
16 bytes a mais e comparação mais lenta que `uuid` nativo), e o ganho de
k-ordenação já é obtido pelo UUID v7 sem abrir mão do tipo de coluna nativo.

**Por quê não sequencial (`serial`/`bigserial`):** viola a premissa 14
explicitamente ("identificadores não devem ser sequenciais ou previsíveis
publicamente") — um ID incremental exposto em URL habilita enumeração direta de
processos/documentos de outros escritórios, mesmo com RLS (RLS impede *ler* o
dado, mas o padrão de ID vazado ainda informa volume e cadência de uso do
concorrente).

**Caminho de evolução:** ao adotar Postgres 18+, migrar a geração de `uuidv7()`
da aplicação para `DEFAULT uuidv7()` no banco é mudança de coluna, não de tipo —
sem impacto em dado existente.

## 2.4 Chaves estrangeiras

- Sempre `NOT NULL` a menos que a relação seja genuinamente opcional (ex.:
  `Documento.processoId` — documento pode existir sem processo).
- Sempre com índice — Postgres não cria índice automático em FK (diferente de PK).
- `ON DELETE` explícito por relação, nunca o default implícito — ver matriz
  completa em [07-relacionamentos-diagrama-er.md](07-relacionamentos-diagrama-er.md).
- Nenhuma FK cruza a fronteira de tenant implicitamente: toda tabela com
  `escritorio_id` só referencia outra tabela que também tenha o mesmo
  `escritorio_id` — validado por constraint composta onde aplicável (ver §2.4.1).

### 2.4.1 FK composta para reforçar tenant na própria constraint

Para relações críticas (`Processo.clienteId`, `Documento.processoId`), a FK é
composta incluindo `escritorio_id` dos dois lados:
```sql
ALTER TABLE processos
  ADD CONSTRAINT fk_processos_clientes
  FOREIGN KEY (cliente_id, escritorio_id)
  REFERENCES clientes (id, escritorio_id);
```
Isso torna estruturalmente impossível vincular um processo ao cliente de outro
escritório — não depende de nenhuma checagem de aplicação lembrar de validar.

## 2.5 Timestamps

- `criado_em TIMESTAMPTZ NOT NULL DEFAULT now()` em toda tabela.
- `atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()`, mantido por trigger
  `BEFORE UPDATE` (não pelo Prisma `@updatedAt` isoladamente — trigger garante o
  valor mesmo em update via SQL direto de manutenção).
- `excluido_em TIMESTAMPTZ NULL` onde soft delete se aplica (ver [10](10-soft-delete-retencao-lgpd.md)).
- **Sempre `TIMESTAMPTZ`, nunca `TIMESTAMP`** (premissa 13 — UTC). O Postgres
  normaliza para UTC internamente e converte na leitura conforme o `timezone`
  da sessão; a aplicação nunca grava hora local diretamente.
- Datas de negócio sem hora (ex.: `data_distribuicao` de um processo) usam
  `DATE`, não `TIMESTAMPTZ` — evita bug de fuso deslocando o dia.

## 2.6 Soft delete

Detalhado em [10-soft-delete-retencao-lgpd.md](10-soft-delete-retencao-lgpd.md).
Convenção de campo: `excluido_em TIMESTAMPTZ NULL` + `excluido_por UUID NULL
REFERENCES membros(id)`. Toda query de leitura de domínio filtra
`WHERE excluido_em IS NULL` por padrão — aplicado automaticamente pela mesma
Prisma Client Extension do §1.4, não repetido manualmente em cada repositório.

## 2.7 Versionamento otimista

Coluna `versao INT NOT NULL DEFAULT 1`, incrementada em todo `UPDATE` via
trigger. Toda atualização vinda do use case inclui `WHERE versao = :versaoLida`;
zero linhas afetadas → `OptimisticLockError`, tratado pela API como `409
Conflict`. Aplicado em entidades com edição concorrente real: `Processo`,
`Documento` (metadados), `ResumoIA` (transições de status). Não aplicado em
tabelas append-only (`LogAuditoria`, `EventoTimeline`) nem em CRUD simples de
baixa contenção (`PreferenciaNotificacao`).

## 2.8 Textos longos

`TEXT` sem limite arbitrário para `descricao`, `conteudo` de comentário,
`conteudo` de resumo de IA. Postgres não penaliza `TEXT` versus `VARCHAR(n))` —
o limite artificial de `VARCHAR` não traz benefício de performance e só adiciona
risco de truncamento de conteúdo jurídico. Validação de tamanho máximo (quando
necessária por UX ou custo de IA) é responsabilidade do Zod na camada de
aplicação, não do tipo de coluna.

## 2.9 Enums — nativo do Postgres vs. texto livre

| Critério | Enum nativo do Postgres | Texto + `CHECK` / tabela de referência |
|---|---|---|
| Conjunto de valores estável, definido pelo domínio | ✅ | |
| Precisa mudar por escritório (papel customizado) | | ✅ |
| Adicionar valor é operação de migração aceitável | ✅ | |
| Alta frequência de novos valores esperada | | ✅ |

**Aplicado como enum nativo:** `StatusProcesso`, `TipoDocumento`,
`StatusUpload`, `StatusProcessamentoDocumento`, `TipoEventoTimeline`,
`StatusConvite`, `StatusNotificacao`, `PrioridadePrazo`, `TipoParticipante`.

**Aplicado como texto livre (não enum):** `Papel.nome` (papéis customizados por
escritório), `Tag.nome`, `area` de atuação do processo (taxonomia jurídica é
extensa e evolui por escritório), `categoria` de documento.

**Trade-off assumido:** enum nativo do Postgres exige `ALTER TYPE ... ADD VALUE`
em migration para incluir um novo valor (e essa operação não pode ser revertida
dentro da mesma transação em versões antigas do Postgres). Aceito porque os
enums escolhidos mudam por decisão de produto, não por usuário final — a
cadência de mudança é compatível com o custo de uma migration.

## 2.10 Valores monetários

`INTEGER` (ou `BIGINT` se necessário) representando **centavos**, nunca
`NUMERIC`/`FLOAT` para exibição direta, nunca ponto flutuante. Reafirma
[06-modelo-dominio.md §6.8](../06-modelo-dominio.md) (Value Object `Monetario`).
Coluna acompanhada de `moeda CHAR(3) DEFAULT 'BRL'` (ISO 4217) para preparar
multi-moeda futuro sem migração de tipo.

## 2.11 Documentos de identificação e contato

| Dado | Armazenamento | Normalização |
|---|---|---|
| Número de processo (CNJ) | `TEXT`, formato completo com máscara (`NNNNNNN-DD.AAAA.J.TR.OOOO`) | Validação de dígito verificador na aplicação antes de persistir; índice também sobre a forma **só dígitos** (coluna gerada, ver [09](09-indices-busca-performance.md)) |
| CPF | `TEXT`, 11 dígitos, sem máscara armazenada | Removida máscara antes de gravar; máscara é responsabilidade de exibição no frontend |
| CNPJ | `TEXT`, 14 dígitos, sem máscara armazenada | Idem |
| E-mail | `TEXT` | `lower(trim(email))` antes de gravar — aplicado por trigger `BEFORE INSERT/UPDATE` além da normalização na aplicação, para blindar contra escrita fora da API (seed, correção manual) |
| Telefone | `TEXT`, formato E.164 (`+55...`) | Normalizado na aplicação; nunca salvo com formatação local |

CPF e CNPJ **nunca** são chave primária nem aparecem em URL — são atributo de
`Cliente`/`ParteProcesso`, buscados sempre por `id` interno. Ver criptografia em
repouso e mascaramento em exibição em [08-permissoes-seguranca.md](08-permissoes-seguranca.md).

## 2.12 Campos JSON

Tipo `JSONB` (nunca `JSON` simples — `JSONB` é indexável e mais compacto).
Uso restrito a três casos, cada um com justificativa:

1. **Metadados polimórficos** (`EventoTimeline.metadados`, `Notificacao.metadados`)
   — o formato varia por `tipo`, e criar uma coluna por variante infla o schema
   sem benefício de consulta (os metadados não são filtrados diretamente, são
   exibidos).
2. **Configuração de baixa consulta** (`Escritorio.configuracoes`,
   `Membro.configuracoesEspecificas`, `PreferenciaNotificacao` quando agrupada) —
   estrutura evolui sem migration.
3. **Estrutura opcional de saída de IA** (`ResumoIA.estruturaJson`) — a IA pode
   retornar seções variáveis; o texto (`conteudo`) é sempre a fonte de verdade
   exibida, o JSON é auxiliar.

**Nunca em JSONB:** nada que precise de `WHERE`/`ORDER BY` frequente, unicidade
ou integridade referencial — isso é coluna própria ou tabela relacionada, sempre.
Índice `GIN` em toda coluna JSONB usada em filtro (ex.: metadados de notificação
por `entidadeTipo`).

## 2.13 Endereços

Modelados como objeto embutido (Prisma `Unsupported`/tipo composto não é usado;
optamos por colunas prefixadas simples, não JSONB) para permitir busca e
validação por campo:
```
{prefixo}_logradouro, {prefixo}_numero, {prefixo}_complemento,
{prefixo}_bairro, {prefixo}_cidade, {prefixo}_uf CHAR(2), {prefixo}_cep,
{prefixo}_pais CHAR(2) DEFAULT 'BR'
```
Ex.: `Escritorio` usa prefixo `endereco_`; `Cliente` idem. Rejeitado JSONB para
endereço porque UF e CEP entram em filtro/validação (`CHECK uf IN (...)`) e
colunas tipadas custam menos para validar do que expressões sobre JSON.

## 2.14 Timezone

Banco configurado com `timezone = 'UTC'` a nível de instância. Toda
`TIMESTAMPTZ` é gravada e lida em UTC pelo driver; conversão para o fuso do
usuário (`Usuario.fusoHorario`, padrão `America/Sao_Paulo`) acontece
exclusivamente na camada de apresentação (frontend ou serialização da API) —
nunca no banco. Isso elimina uma classe inteira de bug de "prazo virou o dia
errado por causa de fuso".

## 2.15 Ordenação e paginação

- **Paginação por cursor** (keyset pagination) em toda listagem de volume —
  nunca `OFFSET` além da primeira página de telas administrativas pequenas.
- Cursor codifica `(valorDeOrdenacao, id)` em Base64 opaco — nunca o `id` cru,
  para não vazar padrão de criação.
- Ordenação padrão por entidade:

| Entidade | Ordenação padrão | Critério de desempate |
|---|---|---|
| Processo | `atualizado_em DESC` | `id` |
| Documento | `criado_em DESC` | `id` |
| EventoTimeline | `data_evento DESC` | `id` |
| Notificacao | `criado_em DESC` | `id` |
| LogAuditoria | `criado_em DESC` | `id` |

Detalhamento de implementação em [09-indices-busca-performance.md](09-indices-busca-performance.md).

## 2.16 Auditoria e histórico de mudanças — o que vive onde

- **Auditoria técnica** (quem fez o quê, quando, de onde) → `LogAuditoria`,
  append-only. Ver [06](06-entidades-ia-notificacoes-auditoria.md) e [10](10-soft-delete-retencao-lgpd.md) §10.10.
- **Histórico funcional do processo** (o que aconteceu no caso) →
  `EventoTimeline`, legível pelo usuário.
- **Diferença chave:** `LogAuditoria` existe para responder "quem acessou/alterou
  o quê" (compliance, sigilo profissional); `EventoTimeline` existe para
  responder "o que aconteceu neste caso" (produto). Um mesmo fato de negócio
  pode gerar as duas entradas, com propósitos e públicos diferentes — auditoria
  é técnica e não é exibida como "história do caso"; timeline é produto e nunca
  substitui a trilha de auditoria.
- Nenhuma tabela guarda "antes/depois" genérico de todo campo de todo modelo
  (isso seria event sourcing, decisão explicitamente não tomada — ver
  [10-roadmap-e-decisoes.md §10.1](../10-roadmap-e-decisoes.md)). `LogAuditoria`
  grava `dados_antes`/`dados_depois` como snapshot JSONB apenas dos campos
  relevantes da operação específica, não o objeto inteiro por padrão.

---

**Anterior:** [01-estrategia-multitenancy.md](01-estrategia-multitenancy.md) · **Próximo:** [03-entidades-identidade-escritorios.md](03-entidades-identidade-escritorios.md)
