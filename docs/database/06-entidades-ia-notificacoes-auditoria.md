# 06 — Catálogo de Entidades: IA, Notificações e Auditoria

> Módulos `AISummaries`, `Notifications` (CRUD simples), `Audit`.

---

## 6.1 ResumoIA

**Finalidade.** Resumo gerado por IA sobre um processo — rastreável, versionado
e vinculado às fontes usadas.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `escritorioId` | UUID | ✓ | — | FK → `escritorios.id` |
| `processoId` | UUID | ✓ | — | FK composta → `processos` |
| `solicitadoPorId` | UUID | ✓ | — | FK composta → `membros` |
| `tipoResumo` | Enum `TipoResumoIA` | ✓ | `GERAL` | `GERAL`\|`EXECUTIVO`\|`CRONOLOGICO`\|`PONTOS_CHAVE`\|`RISCOS` |
| `versaoResumo` | Inteiro | ✓ | incremental por `(processoId, tipoResumo)` | Cada regeneração cria uma nova linha, nunca sobrescreve |
| `status` | Enum `StatusResumoIA` | ✓ | `PENDENTE` | `PENDENTE`\|`GERANDO`\|`PRONTO`\|`FALHA`\|`EXPIRADO` |
| `conteudo` | Texto longo (markdown) | — | `null` | Preenchido quando `status = PRONTO` |
| `estruturaJson` | JSONB | — | `null` | Seções estruturadas opcionais (bullets, riscos) |
| `modelo` | Texto | ✓ | — | Ex.: `claude-opus-5` |
| `promptVersion` | Texto | ✓ | — | Versão do template de prompt usado |
| `tokensEntrada` / `tokensSaida` | Inteiro | — | `null` | |
| `custoEstimadoCentavos` | Inteiro | — | `null` | |
| `hashContexto` | Texto (SHA-256) | ✓ | — | Hash dos dados de entrada — chave de invalidação de cache |
| `latenciaMs` | Inteiro | — | `null` | |
| `erro` | Texto | — | `null` | Mensagem técnica se `status = FALHA` |
| `feedback` | Enum `FeedbackResumo` | — | `null` | `POSITIVO`\|`NEGATIVO` |
| `comentarioFeedback` | Texto | — | `null` | |
| `vigente` | Booleano | ✓ | `true` | Só uma linha vigente por `(processoId, tipoResumo)` |
| `geradoEm` | Timestamptz | — | `null` | |
| `expiraEm` | Timestamptz | — | `null` | TTL de cache — reavaliação, não exclusão |
| `criadoEm` / `atualizadoEm` | Timestamptz | ✓ | `now()` | |

**FK:** `processoId` composta (`RESTRICT` — resumo não sobrevive sem o
processo, mas exclusão de processo é soft delete, então nunca dispara isso na
prática) · `solicitadoPorId` composta (`RESTRICT`).

**Índices:** `idx_resumos_ia_processo_tipo_vigente (processo_id, tipo_resumo)
WHERE vigente = true` · `idx_resumos_ia_status (status) WHERE status IN
('PENDENTE','GERANDO')` (fila de acompanhamento).

**Restrições únicas:** `uq_resumos_ia_vigente (processo_id, tipo_resumo) WHERE
vigente = true` — garante, no próprio banco, que nunca existam dois resumos
vigentes do mesmo tipo simultaneamente (mesmo sob concorrência de duas
requisições de regeneração).

### 6.1.1 Estados do processamento

```
PENDENTE → GERANDO → PRONTO
                   ↘ FALHA
PRONTO → EXPIRADO (quando hashContexto do processo diverge do gravado)
```

`GERANDO` bloqueia nova solicitação do mesmo `(processoId, tipoResumo)` — a API
retorna o resumo em andamento em vez de disparar um segundo (idempotência,
detalhada em [12-eventos-fluxos-regras.md §12.4](12-eventos-fluxos-regras.md)).

### 6.1.2 Invalidação, regeneração, histórico e rastreabilidade

- **Invalidação:** não é exclusão — ao detectar `hashContexto` desatualizado
  (novo documento, novo andamento desde a geração), a linha vigente permanece
  legível mas a UI exibe aviso "processo mudou desde este resumo" com ação
  "Atualizar". Isso preserva o que a Camila/Ricardo já leram enquanto sinaliza
  obsolescência.
- **Regeneração:** cria nova linha (`versaoResumo + 1`), marca a anterior
  `vigente = false` — **nunca** faz `UPDATE` sobre o conteúdo de um resumo já
  gerado. Histórico completo de todas as versões permanece consultável.
- **Rastreabilidade:** `modelo`, `promptVersion`, `hashContexto`, `tokensEntrada/Saida`
  e `custoEstimadoCentavos` tornam qualquer resumo auditável e comparável entre
  versões — essencial para diagnosticar regressão de qualidade, reafirmando
  [../05-arquitetura-backend.md §5.10](../05-arquitetura-backend.md).
- **Privacidade:** nenhum dado de outro escritório entra no contexto — o
  `ContextBuilder` (RAG) só pode consultar `Documento`/`EventoTimeline` com o
  mesmo `escritorioId` do `Processo` solicitado, pela mesma extensão Prisma de
  tenant (premissa 17 desta etapa: "a IA nunca deve acessar dados de outro
  escritório" — modelada como a mesma barreira estrutural de qualquer outra
  leitura, não uma exceção).
- **Cache:** `hashContexto` igual entre uma solicitação nova e a linha vigente
  → retorna a vigente sem chamar o provedor de IA novamente.
- **Controle de custo:** cota por tenant verificada **antes** de criar a linha
  `PENDENTE` (consulta agregada de `custoEstimadoCentavos` do mês corrente por
  `escritorioId` — ver índice em [09](09-indices-busca-performance.md)).

**Soft delete:** não se aplica — resumos não são excluídos individualmente pelo
usuário; saem de circulação naturalmente ao deixar de ser `vigente`. Expurgo
de versões antigas segue política de retenção (ver [10](10-soft-delete-retencao-lgpd.md)).

---

## 6.2 FonteIA (normalizada nesta etapa)

**Finalidade.** Relaciona um `ResumoIA` às fontes efetivamente citadas —
documento, evento de timeline ou outro dado usado na geração.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `resumoIaId` | UUID | ✓ | — | FK → `resumos_ia.id` |
| `sourceType` | Enum `TipoFonteIA` | ✓ | — | `DOCUMENTO`\|`EVENTO_TIMELINE`\|`METADADO_PROCESSO` |
| `sourceId` | UUID | — | `null` | FK fraca (polimórfica, sem constraint física — mesmo racional de `EventoTimeline.entidadeRelacionadaId`) |
| `hashFonte` | Texto (SHA-256) | ✓ | — | Hash do conteúdo da fonte no momento da citação — permite detectar se a fonte mudou depois |
| `ordem` | Inteiro | ✓ | — | Ordem de exibição/relevância |
| `trechoOuReferencia` | Texto | — | `null` | Trecho citado ou referência (ex.: "página 3, parágrafo 2") |
| `criadoEm` | Timestamptz | ✓ | `now()` | |

**FK:** `resumoIaId → resumos_ia.id` (`CASCADE`).

**Índices:** `idx_fontes_ia_resumo (resumo_ia_id, ordem)` ·
`idx_fontes_ia_source (source_type, source_id)` (responde "quais resumos citam
este documento").

**Por que tabela própria em vez de array/JSON embutido:** permite a pergunta
inversa ("este documento foi usado em quais resumos, antes de eu excluí-lo ou
gerar nova versão?") sem varrer JSON de toda a tabela `resumos_ia` — decisiva
para a regra de retenção do §5.3 (adiar exclusão física de documento citado em
resumo vigente).

**Regra de integridade:** toda linha de `ResumoIA` com `status = PRONTO` tem
**ao menos uma** `FonteIA` associada — reforça o requisito inegociável de
[../08-especificacao-modulos.md §8.5](../08-especificacao-modulos.md) ("toda
saída cita a fonte"). Validado na transação de conclusão do job de geração, não
por `CHECK` de banco (depende de contagem em tabela relacionada).

---

## 6.3 Embedding e IndiceBusca

Mantidos conforme conceitual em [../06-modelo-dominio.md §6.6](../06-modelo-dominio.md),
detalhados em [09-indices-busca-performance.md](09-indices-busca-performance.md)
(são, por natureza, estruturas de índice/performance mais do que entidades de
domínio lidas diretamente pelo usuário).

---

## 6.4 Notificacao *(CRUD simples)*

**Finalidade.** Alerta ao usuário sobre evento relevante — módulo
propositalmente anêmico: sem regra de domínio rica, apenas criação, leitura e
marcação de lida.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `escritorioId` | UUID | ✓ | — | FK → `escritorios.id` |
| `destinatarioId` | UUID | ✓ | — | FK composta → `membros` |
| `tipo` | Texto | ✓ | — | Catálogo de eventos em [../08-especificacao-modulos.md §8.6](../08-especificacao-modulos.md) — texto livre, não enum (catálogo cresce sem migração de tipo) |
| `titulo` | Texto | ✓ | — | |
| `mensagem` | Texto | ✓ | — | |
| `urlAcao` | Texto | — | `null` | Rota interna do frontend |
| `entidadeRelacionadaTipo` / `entidadeRelacionadaId` | Texto / UUID | — | `null` | Referência fraca, mesmo padrão de `EventoTimeline` |
| `prioridade` | Enum `PrioridadeNotificacao` | ✓ | `NORMAL` | `BAIXA`\|`NORMAL`\|`ALTA`\|`SEGURANCA` |
| `lidaEm` | Timestamptz | — | `null` | |
| `arquivadaEm` | Timestamptz | — | `null` | |
| `canaisEnviados` | `TEXT[]` | ✓ | `[]` | `['IN_APP','EMAIL']` |
| `agrupamentoChave` | Texto | — | `null` | Para digest — mesma chave agrupa no e-mail resumo |
| `criadoEm` | Timestamptz | ✓ | `now()` | |
| `expiraEm` | Timestamptz | — | `null` | Arquivamento automático (90 dias) |

**Índices:** `idx_notificacoes_destinatario_nao_lida (destinatario_id, criado_em
DESC) WHERE lida_em IS NULL` — sustenta o badge do sino e o painel, é a query
mais frequente deste módulo · `idx_notificacoes_expiracao (expira_em) WHERE
arquivada_em IS NULL`.

**Idempotência:** `agrupamentoChave + tipo + entidadeRelacionadaId` verificado
antes de criar — mesmo evento não gera notificação duplicada (regra de negócio
20 do prompt anterior, reafirmada aqui).

**Prioridade `SEGURANCA`** nunca é filtrável por `PreferenciaNotificacao` — a
aplicação ignora a preferência do usuário para este nível, sempre envia por
todos os canais habilitados.

**Soft delete:** não se aplica — notificação "some" da visão ativa por
`arquivadaEm` ou expira por job; não tem valor de retenção longa como
auditoria.

---

## 6.5 PreferenciaNotificacao *(CRUD simples)*

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `membroId` | UUID | ✓ | — | FK composta → `membros` |
| `tipoNotificacao` | Texto | ✓ | — | Mesmo catálogo de `Notificacao.tipo` |
| `inApp` | Booleano | ✓ | `true` | |
| `email` | Booleano | ✓ | `true` | |
| `frequencia` | Enum `FrequenciaNotificacao` | ✓ | `IMEDIATA` | `IMEDIATA`\|`DIARIA`\|`SEMANAL`\|`NUNCA` |

**Restrições únicas:** `(membro_id, tipo_notificacao)`.

**Regra de negócio:** ausência de linha para um `(membroId, tipo)` implica
padrão do catálogo (definido em código, não em banco) — a tabela só guarda
*desvios* do padrão, o que mantém o volume baixo (a maioria dos usuários nunca
grava uma linha aqui).

---

## 6.6 LogAuditoria

**Finalidade.** Trilha imutável de ações sensíveis — a peça central de
conformidade com sigilo profissional e LGPD.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `escritorioId` | UUID | — | `null` | `null` apenas para ação de nível de plataforma sem tenant (raro) |
| `atorId` | UUID | — | `null` | FK → `membros.id`; `null` se `atorTipo = SISTEMA` |
| `atorTipo` | Enum `TipoAtor` | ✓ | `USUARIO` | `USUARIO`\|`SISTEMA`\|`API` |
| `sessaoId` | UUID | — | `null` | FK → `sessoes.id` |
| `acao` | Texto | ✓ | — | Ex.: `case.update`, `document.download`, `permission.grant` |
| `recursoTipo` | Texto | ✓ | — | Ex.: `Processo` |
| `recursoId` | UUID | — | `null` | |
| `dadosAntes` | JSONB | — | `null` | Snapshot dos campos relevantes, com PII redigida |
| `dadosDepois` | JSONB | — | `null` | Idem |
| `ip` | `inet` | — | `null` | |
| `userAgent` | Texto | — | `null` | |
| `correlationId` | UUID | ✓ | — | Correlaciona com log de aplicação e trace |
| `resultado` | Enum `ResultadoAuditoria` | ✓ | — | `SUCESSO`\|`FALHA`\|`NEGADO` |
| `motivo` | Texto | — | `null` | Preenchido em `NEGADO` (ex.: "permissão insuficiente") |
| `metadados` | JSONB | ✓ | `{}` | Contexto adicional específico da ação |
| `criadoEm` | Timestamptz | ✓ | `now()` | Sem `atualizadoEm` — imutável |

**FK:** `escritorioId → escritorios.id` (`RESTRICT`, quando presente) ·
`atorId → membros.id` (`RESTRICT`) · `sessaoId → sessoes.id` (`SET NULL`).

**Índices:** `idx_auditoria_escritorio_periodo (escritorio_id, criado_em DESC)` ·
`idx_auditoria_recurso (recurso_tipo, recurso_id, criado_em DESC)` ·
`idx_auditoria_ator (ator_id, criado_em DESC)`.

**Imutabilidade — reforçada em nível de privilégio de banco, não só de
aplicação:**
```sql
REVOKE UPDATE, DELETE ON log_auditoria FROM app_runtime;
GRANT INSERT, SELECT ON log_auditoria TO app_runtime;
```
Nenhuma role usada pela API tem `UPDATE`/`DELETE` sobre esta tabela — mesmo um
bug ou uma query manual maliciosa não consegue alterar um registro já gravado.
Correção de um evento indevido é feita por **nova linha** que referencia a
anterior via `metadados.correcaoDe`, nunca por edição.

### 6.6.1 Ações obrigatoriamente auditadas

Login, logout e falha de login · criação, alteração, arquivamento e exclusão de
processo · **visualização e download de documento** (diferencial de
conformidade com sigilo profissional — a maioria dos concorrentes só audita
escrita) · alteração de permissão/papel · convite, aceite e desativação de
membro · exportação de dados (LGPD) · toda chamada de IA (geração de resumo) ·
acesso administrativo (qualquer ação em `/admin/*`) · tentativa negada de
acesso a recurso confidencial ou sob segredo de justiça.

**Particionamento:** dado o volume esperado e a política de retenção (12 meses
quente + 5 anos frio, ver [10-soft-delete-retencao-lgpd.md](10-soft-delete-retencao-lgpd.md)),
esta tabela é particionada por mês (`PARTITION BY RANGE (criado_em)`) desde o
início — não é um "gatilho futuro" como em `EventoTimeline`, porque a política
de retenção fria já é um requisito conhecido da Fase 1, e criar a partição
depois do fato exigiria reescrever dados existentes.

---

**Anterior:** [05-entidades-documentos-colaboracao.md](05-entidades-documentos-colaboracao.md) · **Próximo:** [07-relacionamentos-diagrama-er.md](07-relacionamentos-diagrama-er.md)
