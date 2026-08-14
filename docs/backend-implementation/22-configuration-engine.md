# 22 — Configuration Engine (Prompt 13)

> Este documento descreve o motor central de parametrização do Quilombo
> Dev. **Nenhum módulo futuro poderá ter configurações próprias** — Campos
> Extras, Campos Obrigatórios, Conjuntos de Valores, Categorias de
> Tarefas, Grupos de Colaboradores, Modelos de Tarefa, Feriados e as
> configurações Geral/Financeira/de IA de cada escritório vivem aqui,
> nunca duplicadas por um módulo de negócio futuro. Cada escritório
> (tenant) tem seus próprios dados — nada compartilhado entre escritórios,
> mesma garantia de isolamento (`escritorioId` + `tenant-scoped.extension.ts`)
> que todo o resto do sistema já usa.

## 22.1 Por que "evoluir" e não "recriar"

Achado-chave desta rodada: `Escritorio.configuracoes` (coluna `Json`,
existia desde a Fase 1) **nunca foi lida nem escrita por nenhum use case**
até agora. Em vez de criar 3 tabelas novas (Geral/Financeiro/IA — cada uma
com meia dúzia de campos, 1 linha por escritório), o motor reaproveita essa
coluna diretamente, sob 3 sub-chaves (`geral`/`financeiro`/`ia`) — **zero
migration nova** para essas três categorias. `fusoHorario`/`idioma`
continuam sendo colunas próprias de `Escritorio` (já existiam, também
reaproveitadas, nunca duplicadas dentro do Json).

Os 7 catálogos restantes (Campos Extras, Campos Obrigatórios, Conjuntos de
Valores + Itens, Categorias de Tarefa, Grupos de Colaboradores + Membros,
Modelos de Tarefa, Feriados) têm ciclo de vida próprio — CRUD completo, N
linhas por escritório — por isso são tabelas novas reais (migration
`20260803000001_configuration_engine`, nunca aplicada contra Postgres real
nesta etapa, mesma limitação de ambiente de todas as rodadas anteriores).

## 22.2 Arquitetura

```
apps/api/src/modules/configuration/
  configuration.module.ts        importa AiModule (reaproveita AiUsageUseCase/AiQuotaService)
  application/
    office-settings.use-cases.ts   Get/Update Geral, Financeiro (gate financeiro:read), IA
    extra-fields.use-cases.ts      List/Create/Update/Delete (soft delete)
    required-fields.use-cases.ts   List/BulkUpdate (upsert em transação)
    value-sets.use-cases.ts        List/Get/Create/Update/Delete + Item Add/Update/Remove
    task-categories.use-cases.ts   List/Create/Update/Delete
    collaborator-groups.use-cases.ts  List/Create/Update/Delete + Member Add/Remove
    task-templates.use-cases.ts    List/Create/Update/Delete (categoriaId validado)
    holidays.use-cases.ts          List/Create/Update/Delete
    configuration-dashboard.use-case.ts  agrega contagens + AiUsageUseCase + log_auditoria
  presentation/
    schemas/configuration.schemas.ts   todos os Zod schemas
    *.controller.ts (9 controllers, um por sub-recurso, todos sob /configuration/*)
```

Nenhuma autorização própria: todos os controllers usam `@RequirePermission`
(Permission Engine, Prompt 12) — `configuration:read` para GET,
`configuration:manage` para escrita. A aba Financeiro exige adicionalmente
`financeiro:read` — checado **dentro do use case** (não no guard), reafirmando
docs/backend/06-autorizacao.md §6.1 ("etapa 2 é responsabilidade da Policy
do use case"). A aba IA exige `ai:manage` (nova).

## 22.3 Geral, Financeiro e IA (`Escritorio.configuracoes`)

```json
{
  "geral": { "formatoData": "DD/MM/YYYY", "moedaPadrao": "BRL", "diaInicioSemana": 1, "notificacoesPadrao": true },
  "financeiro": { "formaCalculoHonorarioPadrao": "FIXO", "percentualHonorarioPadrao": null, "diasVencimentoPadrao": 30 },
  "ia": { "providerPadrao": "fake", "modeloPadrao": null, "cotaMensalPersonalizada": null, "exigirRevisaoHumana": false }
}
```

Cada `Get*SettingsUseCase` mescla os defaults em código por cima do que
está salvo (uma linha nunca criada ainda não quebra nada). `GET
/configuration/financial` e `PATCH .../financial` retornam `FORBIDDEN` sem
`financeiro:read` — mesma permissão catálogo-apenas criada no Prompt 12
(§Financeiro), que ganha aqui seu **primeiro ponto de aplicação real**.

**Integração real com a IA (não apenas catálogo-apenas):**
`AiQuotaService.checkQuota` (Sprint 11) foi estendido para ler
`configuracoes.ia.cotaMensalPersonalizada` e usá-la no lugar da cota fixa
do plano quando definida — mudança aditiva de 6 linhas, contrato
`QuotaStatus` inalterado, todos os testes antigos deste serviço continuam
passando sem alteração.

## 22.4 Catálogos (tabelas novas)

| Tabela | Chave única | Observação |
|---|---|---|
| `campos_extra` | `(escritorioId, entidade, chave)` | `entidade` ∈ {CLIENTE,PROCESSO,DOCUMENTO,TAREFA}; `tipo` ∈ {TEXTO,NUMERO,DATA,BOOLEANO,SELECT,MULTISELECT}; `opcoes` exigidas para SELECT/MULTISELECT (validado no Zod) |
| `campos_obrigatorios` | `(escritorioId, entidade, campo)` | upsert em `$transaction`, nunca soft delete (é config, não catálogo) |
| `conjuntos_valores` + `conjunto_valor_itens` | `(escritorioId, nome)` | itens sem soft delete próprio (delete físico — são só uma lista de strings) |
| `categorias_tarefa` | `(escritorioId, nome)` | `ModeloTarefa.categoriaId` é `onDelete: SetNull` — excluir uma categoria nunca é bloqueada por modelo vinculado |
| `grupos_colaboradores` + `grupo_colaborador_membros` | `(escritorioId, nome)` / `(grupoId, membroId)` | `membroId` validado contra o mesmo `escritorioId` antes de vincular |
| `modelos_tarefa` | `(escritorioId, nome)` | catálogo-apenas — módulo Tarefas não existe ainda |
| `feriados` | `(escritorioId, nome, data)` | catálogo-apenas — não conectado ao cálculo de dias úteis de Prazos nesta rodada |

Todas seguem a convenção padrão do schema: `escritorioId` obrigatório,
`criadoEm`/`atualizadoEm`/`excluidoEm` (soft delete via a extensão global
já existente, nunca reimplementada), `@@map`/`@@index` nomeados.

## 22.5 Dashboard das Configurações

`GET /configuration/dashboard-summary` agrega, numa única chamada:
contagens dos 7 catálogos + usuários ativos (`Membro.count`), **reaproveita
`AiUsageUseCase`** (Sprint 11, agora exportado por `AiModule`) para
consumo de IA — nenhum cálculo de cota duplicado — e as 10 últimas
entradas de `log_auditoria` filtradas por `recursoTipo` do Configuration
Engine (`CAMPO_EXTRA`, `CONJUNTO_VALORES`, etc.) para "Últimas Alterações".

## 22.6 Exclusões conscientes desta rodada

Mesmo padrão de escopo pragmático de todas as rodadas anteriores
(`19-decisions.md`):

1. **Campos Extras/Obrigatórios administráveis, não consumidos.** Conectar
   ao formulário real de Cliente/Processo alteraria o contrato desses
   módulos (Zod schema, DTO) — proibido explicitamente pelo Prompt 13.
   Fica pronto para o próximo módulo que precisar ler esse catálogo.
2. **Modelos de Tarefa/Categorias catálogo-apenas** — módulo Tarefas não
   existe no backend ainda (mesmo padrão de `financeiro:*` no Prompt 12).
3. **Feriados catálogo-apenas** — pronto para o futuro cálculo de "dias
   úteis" em Prazos, não conectado a `PrazoUseCase` nesta rodada (evita
   alterar o contrato de Deadlines).
4. **Auditoria de negativas por recurso** — pendência já registrada desde
   o Prompt 12, inalterada.

## 22.7 Erros e permissões novas

| Código | Status | Uso |
|---|---|---|
| `DUPLICATE_NAME` | 409 | Nome/chave duplicados em qualquer um dos 7 catálogos (genérico, reaproveitado — mesmo padrão de `ROLE_IN_USE`) |

| Permissão | Categoria | Uso |
|---|---|---|
| `configuration:read` | Configurações | GET de todo o motor |
| `configuration:manage` | Configurações | POST/PATCH/DELETE de todo o motor |
| `ai:manage` | IA | `PATCH /configuration/ai` (distinta de `ai:usage:read`/`ai:summarize`, já existentes) |

Concedidas por padrão a OWNER/ADMIN/SOCIO (não fazem parte de
`ADMIN_SOCIO_RESTRITAS`); GESTOR e FINANCEIRO ganham `configuration:read`
(visualização); ADVOGADO/ASSISTENTE/ESTAGIARIO não têm acesso ao motor.

## 22.8 Testes

44 testes novos (9 arquivos de use case + 1 teste adicional em
`ai-quota.service.spec.ts` para o override de cota) — 402/402 no total
(era 358).

## 22.9 Pendências para o Prompt 14

1. Conectar Campos Extras/Obrigatórios aos formulários reais de
   Cliente/Processo quando esses módulos passarem por uma rodada própria.
2. Conectar Feriados ao cálculo de prazos em dias úteis (Deadlines).
3. Módulo Tarefas real, consumindo Categorias/Modelos já catalogados aqui.
4. Módulo Financeiro real, consumindo `financeiro:*` (Prompt 12) e
   `configuracoes.financeiro` (esta rodada).
5. Mesmas pendências de infraestrutura já registradas desde a Sprint 11
   (filas, providers reais de IA, migrations aplicadas, CI/Docker
   executado).

---

**Anterior:** [21-permission-engine.md](21-permission-engine.md) · **Início:** [00-status.md](00-status.md)
