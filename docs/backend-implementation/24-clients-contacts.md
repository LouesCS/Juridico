# 24 — Clientes e Contatos (Sprint 17)

> Escopo: **exclusivamente `modules/clients/`** (+ `schema.prisma`/
> `seed.ts`). Nenhuma linha de `modules/timeline/`, `modules/tasks/`,
> `modules/configuration/`, `modules/search/`, `modules/ai/` ou do
> Permission Engine (mecanismo, não dados) foi tocada — reafirma o prompt
> ("Esta Sprint será dedicada EXCLUSIVAMENTE ao módulo Clientes e
> Contatos").

## 24.1 Por que reaproveitar, nunca duplicar

`modules/clients/` já existia (CRUD completo desde o Prompt 7) — esta
Sprint **amplia**, não recria. Antes de qualquer linha de código, o
mapeamento (FASE 0) confirmou:

- **Configuration Engine**: `CampoExtra`/`CampoObrigatorio` já tratam
  `CLIENTE` como `entidade` válida — só faltava um consumidor real (nunca
  existiu um, nem para Cliente nem para nenhuma outra entidade). O motor
  em si não foi alterado; só o valor guardado (`Cliente.
  camposExtrasValores`, coluna nova) e o formulário que lê `GET
  /configuration/extra-fields?entidade=CLIENTE`.
- **Permission Engine**: mecanismo (`@RequirePermission`, `hasPermission`,
  `redactFields`/`FieldRule`) 100% reaproveitado sem alteração; só uma
  permissão nova (`client:export`) foi adicionada ao catálogo — mesmo
  padrão de toda Sprint anterior que precisou de uma ação nova.
- **Universal Search**: `Cliente` já era indexado (`ClientSearchAdapter`)
  — nenhuma mudança necessária; linhas com `categoriaRelacionamento =
  CONTATO` aparecem automaticamente, sem código novo.
- **Favoritos**: réplica exata do padrão `TarefaFavorito`/
  `DocumentoFavorito`/`PastaFavorito` (tabela de junção por membro,
  `@@id([clienteId, membroId])`).
- **Timeline**: ver §24.4 — a única generalização que **não** pôde seguir
  o padrão das Sprints anteriores, por causa da restrição desta Sprint.

## 24.2 O que mudou em `Cliente`

Tudo aditivo (`schema.prisma`, migration `20260805000000_clients_
contacts`):

| Campo | Tipo | Observação |
|---|---|---|
| `categoriaRelacionamento` | `TipoRelacionamentoCliente` (`CLIENTE`\|`CONTATO`\|`CLIENTE_E_CONTATO`) | `@default(CLIENTE)` — dimensão independente de `tipo` (Pessoa Física/Jurídica) |
| `avatarUrl` | `String?` | URL simples — ver §24.7 (sem pipeline de upload) |
| `nomeMae`, `nomePai` | `String?` | Só Pessoa Física |
| `estadoCivil` | `EstadoCivil?` (enum fixo) | Só Pessoa Física; **não** é Conjunto de Valores — ver §24.3 |
| `profissao` | `String?` | Só Pessoa Física |
| `dataNascimento` | `DateTime? @db.Date` | Só Pessoa Física |
| `camposExtrasValores` | `Json @default("{}")` | `{ [campoExtraId]: valor }` — Configuration Engine |

Novo modelo `ClienteFavorito` (mesmo padrão de `TarefaFavorito`).

> Nesta Sprint, `nomeMae`/`nomePai`/`dataNascimento` (junto de CPF/CNPJ/
> endereço) exigiam `client:read:sensitive` para aparecer sem `null`. A
> Sprint "Remover mascaramento de dados do cliente em Processos" removeu
> essa exigência — são dados cadastrais de negócio, não dado
> genuinamente restrito; ver docs/backend-implementation/
> 21-permission-engine.md §21.4.

## 24.3 Por que `EstadoCivil` é um enum fixo, não um Conjunto de Valores

O prompt desta Sprint proíbe alterar o Configuration Engine. Adicionar
"Estado Civil" como um novo `TipoConjuntoValor` exigiria mexer no enum
`TipoConjuntoValor` do próprio motor — alteração ao mecanismo, não só aos
dados. Estado civil também é um vocabulário civil universal (5 opções
fixas, reconhecidas em qualquer cartório/contrato do Brasil), não algo que
cada escritório precise redefinir — diferente de Status/Prioridade de
Tarefa (Prompt 14), que são deliberadamente por-escritório. Por isso ficou
como `enum EstadoCivil` comum, igual a `TipoCliente`/`StatusCliente` já
existentes.

## 24.4 Timeline do Cliente — a restrição real desta Sprint

`Timeline` está na lista "NÃO alterar". `EventoTimeline` (schema já
existente) só tem `processoId`/`tarefaId` como escopo — nunca teve
`clienteId`. Dar ao Cliente uma Timeline própria no sentido literal
exigiria uma migration em `eventos_timeline` e um `escopo_tipo` novo — os
dois vivem conceitualmente dentro do Timeline Engine, mesmo que a
migration em si pudesse ser aplicada a partir de `modules/clients/`.
Decisão: **não alterar nada em `modules/timeline/`**, e reaproveitar
exatamente o mecanismo que `UpdateClientUseCase` já usava desde a Sprint
08 — gravar o evento no(s) Processo(s) vinculados ao cliente, com
`entidadeRelacionadaTipo: 'cliente'`/`entidadeRelacionadaId: clienteId`.

`ListClientTimelineUseCase` (novo, dentro de `modules/clients/`) lê esses
eventos filtrando por `entidadeRelacionadaTipo`/`entidadeRelacionadaId`
— uma leitura agregada, não uma escrita nova. Isso significa:

- Eventos cobertos: alteração de dados (`CLIENTE_ATUALIZADO`, com título
  específico por tipo de mudança — telefone/endereço/e-mail/genérico),
  arquivamento (`ARQUIVAMENTO`), restauração (`RESTAURACAO`), favorito/
  desfavorito (`PERSONALIZADO` — nenhum tipo dedicado no enum, reaproveita
  o genérico já existente, mesma filosofia de não criar valor novo para
  algo raro).
- **Pendência real, não contornável sem tocar o Timeline Engine**: o
  evento de **cadastro** do cliente nunca pode ser gravado por este
  mecanismo — um cliente recém-criado nunca tem processo vinculado ainda
  (o processo é criado depois, a partir do cliente). Documentado em
  §24.9, não simulado.
- **Limitação herdada, não nova**: um cliente sem nenhum processo
  vinculado continua sem timeline nenhuma — já era assim desde a Sprint
  08 (o `UpdateClientUseCase` original já tinha essa limitação); esta
  Sprint só passou a **ler** o que já era gravado.

## 24.5 Filtros e exportação

`buildClientWhere` (novo, `application/client-query-filters.ts`) —
compartilhado por `ListClientsUseCase` e `ExportClientsUseCase`, nenhuma
duplicação de lógica de filtro. Cobre todos os filtros pedidos: pesquisa
geral, nome, telefone, celular, e-mail, CPF, CNPJ, tipo (PF/PJ), categoria
de relacionamento, nome da mãe, nome do pai, estado civil, profissão, data
de cadastro (exata), período de cadastro (intervalo), última alteração.

`diaNascimento`/`mesNascimento` (dia-do-mês/mês, independente do ano) não
são expressáveis com o `where` padrão do Prisma — resolvidos com uma
consulta SQL auxiliar (`EXTRACT(DAY/MONTH FROM data_nascimento)`,
parametrizada, nunca interpolação de string) que devolve só os `id`s
batendo, depois filtrados via `id: { in: [...] }` no `findMany`
principal — mesma técnica já usada em `RestoreClientUseCase`.

`telefone`/`celular`/`email` usam `has` (igualdade de elemento em array,
único operador que o Postgres/Prisma oferece para `String[]`) — sem
`ILIKE` parcial dentro de um elemento da lista; limitação documentada, não
escondida.

`GET /clients/export`: mesmos filtros, sem paginação por cursor, até 5000
linhas. Devolve JSON (não CSV) — o cliente HTTP compartilhado por todo o
app (`lib/api/client.ts`) só fala JSON; o CSV é montado no navegador a
partir do JSON. Estender o cliente HTTP para respostas binárias/texto
ficaria fora do escopo desta Sprint (que é só o módulo Clientes) e
afetaria todo o app.

## 24.6 Permissões

Só uma nova: `client:export` (`recurso: client, acao: export`). OWNER/
ADMIN/SOCIO herdam automaticamente (mapeiam todo o catálogo menos uma
lista de exclusões); adicionada explicitamente a ADVOGADO/ASSISTENTE/
GESTOR (mesmos papéis que já tinham `client:update`).

O prompt pedia `client:view` — já existia como `client:read` desde o
Prompt 7. Renomear quebraria toda checagem `@RequirePermission('client:
read')`/`hasPermission(..., 'client:read')` já espalhada pelo módulo (e
pelo `search-adapters.ts`) sem nenhum ganho real — mapeado no documento,
não executado.

## 24.7 Foto do cliente — decisão de escopo

`avatarUrl` é uma coluna `String?` simples, preenchida via
`create`/`update` (o usuário cola uma URL). **Não** existe um pipeline de
upload dedicado (presign/confirm via `StoragePort`, como Documents tem).
Motivo: o único jeito de reaproveitar infraestrutura de upload real é via
`PresignDocumentUploadUseCase`, que sempre cria um `Documento` visível na
aba Documentos do cliente — inadequado para uma foto de perfil. Construir
um pipeline de upload dedicado só para avatar (novo endpoint de presign
usando `StoragePort` diretamente) é uma peça de infraestrutura razoável,
mas desproporcional para uma Sprint inteira dedicada só a Clientes, num
ambiente onde nenhum upload pode sequer ser testado de verdade (sem
Minio/Postgres). Arquitetura preparada (o campo existe, é servido em
todos os DTOs, o formulário já tem o campo); pendência documentada em
§24.9.

## 24.8 Testes

7 suítes / 26 casos em `modules/clients/` (4 pré-existentes intactos +
3 novos: `client-favorites`, `list-client-timeline`, `export-clients`).
Rodados **só o módulo alterado** (regra de execução desta Sprint —
"NÃO execute toda a suíte... Execute apenas testes do módulo Clientes e
Contatos"); `npx tsc --noEmit` e `npx nest build` completos confirmam
ausência de regressão em qualquer outro módulo sem precisar rodar `jest`
inteiro de novo.

## 24.9 Pendências

- **Evento de Cadastro na Timeline do cliente** — não expressável sem
  alterar o Timeline Engine (congelado nesta Sprint); precisa de um
  `EventoTimeline.clienteId` de verdade.
- **Upload real de foto** (drag-and-drop, `StoragePort`) — hoje é só uma
  URL colada; arquitetura preparada, ver §24.7.
- **Comments para Cliente** — só existe consumidor para Tarefa (Task
  Engine, congelado nesta Sprint); aba "Comentários" do Cliente continua
  placeholder.
- **Contratos/Financeiro/Serviços/Registros de Trabalho** — módulos que
  ainda não existem no sistema; abas/painel "Relacionados" preparados
  (placeholder elegante ou item esmaecido), sem simular dado algum.
- **Importação em massa** — botão presente na barra superior, desabilitado
  ("em breve"), sem nenhum endpoint por trás (arquitetura não iniciada —
  o prompt pedia explicitamente só o placeholder).
- **"Enviar mensagem"** — item de menu presente e desabilitado; não existe
  nenhum canal de mensageria integrado ao sistema ainda.

## 24.10 Correção — Edição completa em Clientes e Contatos

FASE 0 (auditoria de campos: schema Prisma → Create DTO → Update DTO →
Zod do frontend → formulário → view) confirmou que **backend e formulário
já cobriam 100% dos campos editáveis** — `UpdateClientUseCase` sempre
encaminhou `...dto` por completo ao Prisma (telefone, celular, profissão,
filiação, estado civil, data de nascimento, endereço completo, Campos
Extras — nada omitido), e `client-form-dialog.tsx` já era o único
formulário reaproveitado por Novo Cliente/Novo Contato/Editar (mesmo
schema `clientFormSchema`, mesmas abas). Nenhuma dessas duas camadas
precisou de correção — só ganharam um teste de regressão que faltava
(`update-client.use-case.spec.ts`, pass-through completo).

**Causa raiz real**: os mocks (`apps/web/src/mocks/handlers/clients.ts`,
usado em teste, e `apps/web/src/mocks/demo/handlers.ts`, usado no modo de
demonstração sem Postgres — o ambiente em que este projeto roda hoje).
`GET /clients/:id` sobrescrevia `nomeSocial`/`razaoSocial`/os 7 campos de
endereço/`observacoes` com valores fixos (`null`, ou `'São Paulo'`/`'SP'`
no modo demo) **depois** de espalhar `...client` — mesmo quando `PATCH`
gravava esses campos corretamente via `Object.assign`. `razaoSocial`, em
particular, nunca foi um campo de verdade nesses mocks: era derivado de
`client.nome` a cada `GET`, então editá-la não tinha efeito nenhum
observável. Resultado: editar endereço/nome social/razão social/
observações parecia funcionar (toast de sucesso, diálogo fecha), mas o
valor revertia ao reabrir o cliente — o sintoma relatado.

Também identificado na FASE 0: `responsavelId` tinha schema/DTO/mapeamento
completos (`clientFormSchema`, `toUpsertInput`, `fromClientDetail`), mas
**nenhum campo de formulário** para o usuário escolher o Responsável —
lacuna real de UI, não de dados.

**Correção:**
- `mocks/handlers/clients.ts`/`mocks/demo/handlers.ts`: `MockClient`/
  `DemoClient` ganharam os campos que faltavam; `GET /clients/:id` parou
  de sobrescrever; `POST`/`PATCH` passaram a persistir todos os campos,
  incluindo resolver `responsavelId` → `{id, nome}` a partir do mock de
  Membros (`team.ts`/`demoMembers`) — mesma fonte que `useMembers()` usa
  no formulário.
- `client-form-dialog.tsx`: campo "Responsável" adicionado (Select via
  `useMembers`, mesmo padrão de `legal-case-form-dialog.tsx`), logo após
  Status na aba Dados.
- `client-form-dialog.tsx`: campo "Tipo" (Pessoa Física/Jurídica) passou a
  ficar **bloqueado durante a edição** (`disabled={isEditing}`). Decisão
  documentada: o produto nunca definiu um fluxo de migração PF↔PJ (sem
  confirmação, sem regra de quais dados preservar/limpar); permitir a
  troca deixaria dados órfãos do tipo anterior no banco sem aviso (ex.:
  `nomeMae` sobrevivendo a uma virada para Pessoa Jurídica, já que campos
  omitidos no `PATCH` nunca são limpos). Bloquear é a opção segura e
  reversível — se o produto quiser um fluxo de conversão completo no
  futuro, ele precisa de tela própria (confirmação + o que muda),
  não de destravar este campo.

Nenhuma alteração em `apps/api/` foi necessária — reafirmado pelo teste
novo em `update-client.use-case.spec.ts` (asserção `objectContaining` com
todos os campos editáveis, prova que `UpdateClientUseCase` já encaminhava
tudo antes desta correção).
