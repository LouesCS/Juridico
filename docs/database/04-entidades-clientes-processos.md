# 04 — Catálogo de Entidades: Clientes e Processos

> Módulos `Clients` e `LegalCases`. `Processo` recebe **DDD completo**
> (agregado, invariantes, eventos) conforme decidido em
> [../05-arquitetura-backend.md §5.1](../05-arquitetura-backend.md); as demais
> entidades deste arquivo são parte do mesmo agregado ou satélites diretos.

---

## 4.1 Cliente

**Finalidade.** Pessoa física ou jurídica atendida pelo escritório.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `escritorioId` | UUID | ✓ | — | FK → `escritorios.id` |
| `tipo` | Enum `TipoCliente` | ✓ | — | `PESSOA_FISICA`\|`PESSOA_JURIDICA` |
| `nome` | Texto | ✓ | — | Nome civil (PF) ou nome fantasia (PJ) |
| `nomeSocial` | Texto | — | `null` | PF |
| `razaoSocial` | Texto | — | `null` | Obrigatório se `tipo = PESSOA_JURIDICA` |
| `cpf` | Texto (11 díg.) | — | `null` | Obrigatório se `PESSOA_FISICA` e sem CNPJ estrangeiro |
| `cnpj` | Texto (14 díg.) | — | `null` | Obrigatório se `PESSOA_JURIDICA` |
| `emails` | `TEXT[]` | — | `[]` | Múltiplos, com rótulo em tabela satélite se necessário exibir rótulo (MVP: array simples) |
| `telefones` | `TEXT[]` | — | `[]` | |
| `endereco_*` | Ver [02](02-convencoes-dados.md) §2.13 | — | `null` | |
| `observacoes` | Texto longo | — | `null` | |
| `responsavelId` | UUID | — | `null` | FK → `membros.id` — responsável interno pela conta |
| `status` | Enum `StatusCliente` | ✓ | `ATIVO` | `ATIVO`\|`INATIVO`\|`PROSPECT` |
| `criadoEm` / `atualizadoEm` | Timestamptz | ✓ | `now()` | |
| `excluidoEm` | Timestamptz | — | `null` | Soft delete |

**FK:** `escritorioId → escritorios.id` (`RESTRICT`) · `responsavelId → membros.id`
(`SET NULL` — saída do responsável não apaga o cliente).

**Índices:** `idx_clientes_escritorio_nome (escritorio_id, nome)` ·
`idx_clientes_escritorio_documento (escritorio_id, cpf)` ·
`idx_clientes_escritorio_documento_cnpj (escritorio_id, cnpj)` ·
`idx_clientes_responsavel`.

**Restrições únicas:** `(escritorio_id, cpf) WHERE cpf IS NOT NULL AND excluido_em
IS NULL` e `(escritorio_id, cnpj) WHERE cnpj IS NOT NULL AND excluido_em IS
NULL` — único **por escritório**, nunca global (dois escritórios podem
legitimamente atender o mesmo cliente).

**Como evitar duplicidade sem bloquear cadastro legítimo:** a constraint única
acima **bloqueia apenas duplicidade exata de documento dentro do mesmo
escritório** — nunca bloqueia por nome (nomes se repetem legitimamente) e nunca
bloqueia entre escritórios diferentes (é o comportamento correto e esperado).
Quando o CPF/CNPJ ainda não é conhecido no cadastro rápido (fluxo da Sandra em
[../02-personas.md](../02-personas.md)), o cliente é criado sem documento e a
aplicação sugere merge se um documento for adicionado depois e colidir — a
sugestão é uma tela de confirmação (soft warning), nunca um bloqueio automático
de escrita, porque cadastro incompleto é o caso comum, não a exceção.

**Regras de integridade:** `razaoSocial` obrigatório se `tipo = PESSOA_JURIDICA`
(validado na aplicação — `CHECK` de banco correspondente como reforço:
`CHECK (tipo <> 'PESSOA_JURIDICA' OR razao_social IS NOT NULL)`).

**Soft delete:** sim — cliente com processos associados nunca é excluído
fisicamente enquanto existir `Processo` referenciando-o (`RESTRICT` na FK de
`Processo.clienteId`, ver §4.2).

**Auditoria:** criação, edição de documento (CPF/CNPJ), exclusão e restauração
são auditadas — dado de terceiro sob responsabilidade do escritório.

**Relacionamentos:** 1:N com `Processo`, N:N com `Tag` via `cliente_tag`.

**Regras de acesso:** `client:create/read/update/delete` conforme
[08-permissoes-seguranca.md](08-permissoes-seguranca.md); leitura ampla (a
maioria dos papéis vê todos os clientes do escritório — diferente de Processo,
que tem escopo por responsável/equipe).

**Riscos:** CPF/CNPJ são dados sensíveis: nunca retornados em texto claro em
endpoint de busca/autocomplete que não exija permissão de leitura de cliente
(autocomplete de vínculo mostra nome + últimos 3 dígitos mascarados).

**Escalabilidade:** cresce O(escritórios × clientes por escritório); índice
composto por `escritorio_id` é suficiente até volumes muito além do esperado
para o segmento de pequeno/médio escritório.

---

## 4.2 Processo ⭐ (agregado raiz — DDD completo)

**Finalidade.** Entidade central do sistema — representa o caso jurídico,
judicial ou não.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `escritorioId` | UUID | ✓ | — | FK → `escritorios.id`, imutável após criação |
| `clienteId` | UUID | ✓ | — | FK composta → `(clientes.id, escritorio_id)` — ver §4.2.4 sobre múltiplos clientes |
| `numeroCnj` | Texto | — | `null` | Ver §4.2.1 — opcional para extrajudicial |
| `numeroCnjSomenteDigitos` | Texto (gerada) | — | calculado | Coluna gerada `GENERATED ALWAYS AS (regexp_replace(numero_cnj, '\D', '', 'g')) STORED`, usada em índice de busca |
| `numeroInterno` | Texto | — | `null` | Numeração própria do escritório |
| `titulo` | Texto | ✓ | — | |
| `descricao` | Texto longo | — | `null` | |
| `area` | Texto | ✓ | — | Taxonomia livre (ver [02](02-convencoes-dados.md) §2.9) |
| `tipoAcao` | Texto | — | `null` | |
| `tipo` | Enum `TipoProcesso` | ✓ | `JUDICIAL` | `JUDICIAL`\|`ADMINISTRATIVO`\|`CONSULTIVO`\|`EXTRAJUDICIAL` |
| `tribunal` / `comarca` / `vara` | Texto | — | `null` | |
| `uf` | `CHAR(2)` | — | `null` | |
| `instancia` | Enum `InstanciaProcesso` | — | `null` | `PRIMEIRA`\|`SEGUNDA`\|`SUPERIOR` |
| `classeProcessual` | Texto | — | `null` | |
| `assunto` | Texto | — | `null` | |
| `poloCliente` | Enum `PoloProcesso` | ✓ | — | `ATIVO`\|`PASSIVO`\|`TERCEIRO` |
| `status` | Enum `StatusProcesso` | ✓ | `ATIVO` | `ATIVO`\|`SUSPENSO`\|`ARQUIVADO`\|`ENCERRADO` |
| `prioridade` | Enum `PrioridadeProcesso` | ✓ | `MEDIA` | `BAIXA`\|`MEDIA`\|`ALTA`\|`CRITICA` |
| `segredoJustica` | Booleano | ✓ | `false` | Restringe acesso mesmo internamente |
| `valorCausaCentavos` | `BIGINT` | — | `null` | Ver [02](02-convencoes-dados.md) §2.10 |
| `moedaValorCausa` | `CHAR(3)` | — | `'BRL'` | |
| `dataDistribuicao` | `DATE` | — | `null` | |
| `dataEncerramento` | `DATE` | — | `null` | |
| `responsavelPrincipalId` | UUID | ✓ | — | FK composta → `(membros.id, escritorio_id)` |
| `proximaDataRelevante` | Timestamptz | — | `null` | Denormalizado do próximo `Prazo` aberto — ver §4.6.1 |
| `observacoes` | Texto longo | — | `null` | |
| `camposCustomizados` | JSONB | ✓ | `{}` | Extensibilidade por área do direito |
| `resumoIaVigenteId` | UUID | — | `null` | FK → `resumos_ia.id`, `SET NULL` |
| `ultimaAtualizacaoEm` | Timestamptz | ✓ | `now()` | Alimenta alerta de "processo parado" |
| `versao` | Inteiro | ✓ | `1` | Controle de concorrência otimista |
| `criadoEm` / `atualizadoEm` | Timestamptz | ✓ | `now()` | |
| `arquivadoEm` | Timestamptz | — | `null` | |
| `excluidoEm` | Timestamptz | — | `null` | Soft delete |

**Chave primária:** `id`. **FK:** `escritorioId → escritorios.id` (`RESTRICT`) ·
`clienteId` composta (`RESTRICT` — não é possível excluir cliente com processo
ativo) · `responsavelPrincipalId` composta (`RESTRICT`) · `resumoIaVigenteId →
resumos_ia.id` (`SET NULL`).

**Índices:** `idx_processos_escritorio_status (escritorio_id, status)` ·
`idx_processos_escritorio_responsavel (escritorio_id, responsavel_principal_id)` ·
`idx_processos_escritorio_atualizacao (escritorio_id, atualizado_em DESC)` ·
`idx_processos_escritorio_proxima_data (escritorio_id, proxima_data_relevante)
WHERE excluido_em IS NULL` · `idx_processos_cnj_digitos (numero_cnj_somente_digitos)
WHERE numero_cnj IS NOT NULL` (trigram, ver [09](09-indices-busca-performance.md)) ·
`idx_processos_cliente (cliente_id)`.

**Restrições únicas:** `uq_processos_escritorio_cnj (escritorio_id,
numero_cnj_somente_digitos) WHERE numero_cnj IS NOT NULL AND excluido_em IS
NULL` — único por escritório, permitindo dois processos sem CNJ (extrajudicial)
coexistirem sem conflito.

### 4.2.1 Validação do número CNJ

Formato `NNNNNNN-DD.AAAA.J.TR.OOOO` (20 dígitos). Validação de dígito
verificador (módulo 97, base 11, conforme Resolução CNJ 65/2008) acontece **na
aplicação**, antes do `INSERT` — não é `CHECK` de banco (algoritmo é complexo
demais para expressão SQL simples e o custo de manutenção de uma função
`PL/pgSQL` supera o benefício frente a já ter a validação como Value Object no
domínio, conforme [../06-modelo-dominio.md §6.8](../06-modelo-dominio.md)). O
banco garante apenas unicidade e formato de 20 dígitos via `CHECK
(numero_cnj_somente_digitos ~ '^\d{20}$')` quando não nulo.

### 4.2.2 Processos extrajudiciais e sem número CNJ

`tipo = EXTRAJUDICIAL` (ou `CONSULTIVO`) permite `numeroCnj IS NULL` —
`numeroInterno` passa a ser o identificador funcional exibido nas telas. Nada na
modelagem exige CNJ; a única obrigatoriedade é `titulo`, `clienteId` e
`responsavelPrincipalId`.

### 4.2.3 Responsável principal e responsável ausente

`responsavelPrincipalId` é `NOT NULL` — a regra de negócio 5 desta etapa ("todo
processo tem responsável") é modelada como campo obrigatório, não opcional. Se o
responsável é desativado/removido do escritório (ver §12.11 em
[12-eventos-fluxos-regras.md](12-eventos-fluxos-regras.md)), o use case de
desativação de membro **exige** reatribuição de todos os seus processos antes
de concluir — nunca deixa `Processo` órfão. Não existe estado "processo sem
responsável" no modelo de dados; é estado transitório impedido por transação.

### 4.2.4 Múltiplos clientes e múltiplos responsáveis

- **Múltiplos responsáveis:** `responsavelPrincipalId` é único (a regra de
  negócio exige *um* responsável principal), mas a tabela `processo_membro`
  (§4.4) modela quantos membros adicionais tiverem acesso/atuação no caso — a
  "equipe do processo" é N:N.
- **Múltiplos clientes:** o campo `clienteId` no agregado `Processo` representa
  o cliente **principal** (o que o escritório representa). Litisconsórcio (mais
  de um cliente nosso no mesmo processo) é modelado via `ParteProcesso` (§4.3)
  com `ehNossoCliente = true` e `clienteId` preenchido em mais de uma linha —
  `Processo.clienteId` permanece como atalho de exibição/filtro do cliente
  primário, sem duplicar a modelagem de partes.

### 4.2.5 Segredo de justiça e controle de acesso

`segredoJustica = true` não é aplicado por RLS (RLS resolve tenant, não
escopo fino) — é resolvido na autorização de recurso do use case, reafirmando
[../09-seguranca-lgpd.md §9.3](../09-seguranca-lgpd.md): mesmo com
`case:read:all`, acesso é negado a quem não é responsável, membro da equipe ou
`SOCIO`/`OWNER`. Detalhado em [08-permissoes-seguranca.md](08-permissoes-seguranca.md).

**Regras de integridade adicionais:** `status = ARQUIVADO` não aceita novo
`Prazo` com `status != CANCELADO` (validado no use case de criação de prazo,
reafirma [../06-modelo-dominio.md §6.4](../06-modelo-dominio.md)).

**Soft delete:** sim. Exclusão lógica preserva todas as relações (`Documento`,
`EventoTimeline`, `Comentario`) intactas — nada em cascata.

**Auditoria:** toda alteração de campo relevante gera `LogAuditoria` **e**
`EventoTimeline` (propósitos diferentes, ver [02](02-convencoes-dados.md) §2.16).

**Eventos de domínio:** `ProcessoCriado`, `ProcessoAtribuido`,
`ProcessoStatusAlterado`, `ProcessoArquivado` — catalogados em
[12-eventos-fluxos-regras.md](12-eventos-fluxos-regras.md).

**Riscos:** campo `camposCustomizados` (JSONB) sem governança pode virar
"gaveta de tudo" — mitigado por schema de validação Zod por `area` definido na
aplicação, não pelo banco.

**Escalabilidade:** maior tabela de domínio em volume de leitura (Dashboard,
listas, busca). Índices compostos por `escritorio_id` cobrem os padrões de
acesso dominantes; ver orçamento de performance em
[09-indices-busca-performance.md](09-indices-busca-performance.md).

---

## 4.3 ParteProcesso (Participante)

**Finalidade.** Registra qualquer pessoa ou entidade envolvida no processo além
do cliente principal — inclui partes formais e figuras processuais.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `escritorioId` | UUID | ✓ | — | FK → `escritorios.id` |
| `processoId` | UUID | ✓ | — | FK composta → `(processos.id, escritorio_id)` |
| `tipo` | Enum `TipoParticipante` | ✓ | — | Ver §4.3.1 |
| `natureza` | Enum `NaturezaPessoa` | ✓ | — | `PESSOA_FISICA`\|`PESSOA_JURIDICA` |
| `nome` | Texto | ✓ | — | |
| `documento` | Texto | — | `null` | CPF/CNPJ, quando conhecido |
| `clienteId` | UUID | — | `null` | FK → `clientes.id`, preenchido se `ehNossoCliente = true` |
| `ehNossoCliente` | Booleano | ✓ | `false` | |
| `oabNumero` / `oabUf` | Texto | — | `null` | Para `ADVOGADO_EXTERNO`, `JUIZ` (raro), etc. |
| `observacoes` | Texto | — | `null` | |
| `criadoEm` / `atualizadoEm` | Timestamptz | ✓ | `now()` | |
| `excluidoEm` | Timestamptz | — | `null` | |

### 4.3.1 Enum `TipoParticipante` (ampliado nesta etapa)

`AUTOR` · `REU` · `TERCEIRO_INTERESSADO` · `ASSISTENTE` · `MINISTERIO_PUBLICO` ·
`TESTEMUNHA` · `PERITO` · `ADVOGADO_EXTERNO` · `JUIZ` · `PROMOTOR` ·
`REPRESENTANTE_LEGAL` · `OUTRO`.

**Por que uma entidade só para tipos tão diferentes (parte formal vs.
testemunha vs. juiz):** todos compartilham o mesmo formato estrutural — nome,
documento opcional, vínculo opcional a um `Cliente` cadastrado — e todos
respondem à mesma pergunta ("quem está envolvido neste processo e em que
papel"). Modelar como entidades separadas obrigaria a timeline e a busca a
conhecer N tipos de tabela; um único `tipo` enumerado mantém a consulta
("participantes do processo X") simples e a UI capaz de agrupar por tipo sem
joins adicionais.

**Pessoa física, jurídica e participante sem cadastro completo de cliente:**
`ParteProcesso` **não exige** um `Cliente` associado — `nome` e `documento`
bastam para registrar um réu ou testemunha que nunca será cliente do
escritório. `clienteId` só é preenchido quando `ehNossoCliente = true` (nosso
cliente também aparece como parte formal do processo) ou quando o escritório
decide formalizar a parte contrária como `Cliente` (ex.: virou cliente em outro
caso) — nunca é obrigatório.

**FK:** `processoId` composta (`CASCADE` — parte não sobrevive à exclusão física
do processo, que de toda forma nunca ocorre por ser soft delete) ·
`clienteId → clientes.id` (`SET NULL`).

**Índices:** `idx_partes_processo (processo_id)` · `idx_partes_cliente`.

**Regras de integridade:** `documento` obrigatório apenas quando
`ehNossoCliente = true` (validado na aplicação).

**Soft delete:** sim — parte incluída por engano é desativada, não apagada
(pode ter sido citada em andamentos já registrados).

---

## 4.4 ProcessoMembro (Equipe do Processo)

**Finalidade.** Relaciona `Membro`s ao processo além do responsável principal —
a "equipe" que enxerga e atua no caso.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `processoId` | UUID | ✓ | — | FK composta → `(processos.id, escritorio_id)` |
| `membroId` | UUID | ✓ | — | FK composta → `(membros.id, escritorio_id)` |
| `funcaoNoProcesso` | Texto | — | `null` | Ex.: "advogado de apoio", "responsável por prazos" |
| `responsavelPrincipal` | Booleano | ✓ | `false` | Espelha `Processo.responsavelPrincipalId` para permitir `JOIN` direto na listagem "meus processos" sem consultar duas tabelas |
| `acessoPermitido` | Enum `NivelAcessoProcesso` | ✓ | `LEITURA_ESCRITA` | `LEITURA`\|`LEITURA_ESCRITA` |
| `entrouEm` | Timestamptz | ✓ | `now()` | |
| `saiuEm` | Timestamptz | — | `null` | Preenchido ao remover da equipe, sem apagar histórico |

**Índices:** `uq_processo_membro (processo_id, membro_id) WHERE saiu_em IS NULL` ·
`idx_processo_membro_membro (membro_id) WHERE saiu_em IS NULL` (para "meus
processos" — consulta mais frequente do produto, ver
[09-indices-busca-performance.md](09-indices-busca-performance.md)).

**Regras de integridade:** o responsável principal (`Processo.responsavelPrincipalId`)
sempre tem uma linha correspondente aqui com `responsavelPrincipal = true` —
mantido em sincronia pelo mesmo use case que altera o responsável (transação
única), nunca em dessincronia.

---

## 4.5 ProcessoRelacionado

**Finalidade.** Relaciona processos entre si (recurso, apenso, conexo etc.).

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `escritorioId` | UUID | ✓ | — | FK → `escritorios.id` |
| `processoOrigemId` | UUID | ✓ | — | FK composta → `processos` |
| `processoRelacionadoId` | UUID | ✓ | — | FK composta → `processos` |
| `tipoRelacao` | Enum `TipoRelacaoProcesso` | ✓ | — | `PRINCIPAL`\|`DEPENDENTE`\|`RECURSO`\|`CUMPRIMENTO`\|`CONEXO`\|`APENSO`\|`RELACIONADO` |
| `observacoes` | Texto | — | `null` | |
| `criadoEm` | Timestamptz | ✓ | `now()` | |

**Índices:** `idx_processo_relacionado_origem` · `idx_processo_relacionado_destino`.

**Restrições únicas:** `(processo_origem_id, processo_relacionado_id, tipo_relacao)`.

**Regras de integridade:** `processoOrigemId <> processoRelacionadoId`
(`CHECK`) · ambos os processos devem pertencer ao mesmo `escritorioId`
(garantido por FK composta — relação entre processos de escritórios diferentes
é estruturalmente impossível).

**Direção da relação:** modelada como par ordenado (origem → relacionado) com
`tipoRelacao` do ponto de vista da origem; a aplicação exibe a relação inversa
calculada (ex.: se A→B é `RECURSO`, a tela de B mostra "processo de origem: A").

---

## 4.6 Prazo *(entidade dedicada — mantida da arquitetura oficial)*

> Ver nota de conflito no início desta etapa: modelado como entidade própria,
> não apenas como tipo de `EventoTimeline`, para sustentar a consulta de
> Dashboard "Prazos Críticos" ([../08-especificacao-modulos.md §8.1](../08-especificacao-modulos.md)).

**Finalidade.** Compromisso com data — fatal, interno, audiência, reunião ou
tarefa — vinculado a um processo.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `escritorioId` | UUID | ✓ | — | FK → `escritorios.id` |
| `processoId` | UUID | ✓ | — | FK composta → `processos` |
| `titulo` | Texto | ✓ | — | |
| `descricao` | Texto | — | `null` | |
| `tipo` | Enum `TipoPrazo` | ✓ | — | `FATAL`\|`INTERNO`\|`AUDIENCIA`\|`REUNIAO`\|`TAREFA` |
| `dataVencimento` | `DATE` | ✓ | — | |
| `horaVencimento` | `TIME` | — | `null` | |
| `dataConclusao` | Timestamptz | — | `null` | |
| `responsavelId` | UUID | ✓ | — | FK composta → `membros` |
| `prioridade` | Enum `PrioridadePrazo` | ✓ | `MEDIA` | `BAIXA`\|`MEDIA`\|`ALTA`\|`CRITICA` |
| `status` | Enum `StatusPrazo` | ✓ | `PENDENTE` | `PENDENTE`\|`EM_ANDAMENTO`\|`CONCLUIDO`\|`CANCELADO`\|`ATRASADO` |
| `lembretes` | `INT[]` | ✓ | `{7,3,1,0}` | Offsets em dias antes do vencimento |
| `origem` | Enum `OrigemPrazo` | ✓ | `MANUAL` | `MANUAL`\|`IMPORTADO`\|`IA`\|`TRIBUNAL` |
| `criadoEm` / `atualizadoEm` | Timestamptz | ✓ | `now()` | |

**Índices:** `idx_prazos_escritorio_vencimento (escritorio_id, data_vencimento)
WHERE status NOT IN ('CONCLUIDO','CANCELADO')` — índice parcial que sustenta o
bloco de Dashboard sem varrer prazos resolvidos · `idx_prazos_responsavel
(responsavel_id, data_vencimento) WHERE status NOT IN ('CONCLUIDO','CANCELADO')`.

**Regras de integridade:** `status = ATRASADO` é **derivado**, nunca gravado
diretamente por escrita de usuário — recalculado por job periódico
(`dataVencimento < today() AND status = PENDENTE`) ou por *view* computada na
leitura; a coluna existe para permitir índice e filtro rápido no Dashboard, mas
a fonte de verdade do "atraso" é a comparação de data, não um estado que pode
divergir. Prazo `FATAL` não é excluído — apenas `CANCELADO` com justificativa
obrigatória (campo de auditoria).

**Relação com Timeline:** ao criar/concluir/cancelar um `Prazo`, o mesmo use
case insere uma linha em `EventoTimeline` (`tipo = PRAZO`,
`entidadeRelacionadaId = prazo.id`) dentro da mesma transação — é a "projeção"
mencionada na resolução do conflito desta etapa. `EventoTimeline` nunca é a
origem da verdade sobre o prazo, apenas seu espelho cronológico.

**Soft delete:** não se aplica diretamente — o ciclo de vida é por `status`
(`CANCELADO` é o "soft delete" funcional de um prazo).

---

**Anterior:** [03-entidades-identidade-escritorios.md](03-entidades-identidade-escritorios.md) · **Próximo:** [05-entidades-documentos-colaboracao.md](05-entidades-documentos-colaboracao.md)
