# 05 — Catálogo de Entidades: Timeline, Documentos e Colaboração

> Módulos `Timeline`, `Documents`, `Comments`, `Tags`. `Documento` recebe **DDD
> parcial** (agregado + VO de versão), conforme
> [../05-arquitetura-backend.md §5.1](../05-arquitetura-backend.md).

---

## 5.1 EventoTimeline

**Finalidade.** Unifica a história cronológica do processo — andamentos,
documentos, comentários, prazos e eventos de IA em uma única linha do tempo
consultável.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK — o prefixo temporal do UUID v7 já ajuda na ordenação física |
| `escritorioId` | UUID | ✓ | — | FK → `escritorios.id` |
| `processoId` | UUID | ✓ | — | FK composta → `processos` |
| `tipo` | Enum `TipoEventoTimeline` | ✓ | — | `MOVIMENTACAO`\|`PETICAO`\|`AUDIENCIA`\|`DECISAO`\|`SENTENCA`\|`DOCUMENTO`\|`COMENTARIO`\|`ALTERACAO_STATUS`\|`PRAZO`\|`ANOTACAO`\|`PERSONALIZADO` |
| `titulo` | Texto | ✓ | — | |
| `descricao` | Texto longo | — | `null` | |
| `dataEvento` | Timestamptz | ✓ | — | Data do fato, pode ser retroativa (ex.: andamento importado) |
| `dataRegistro` | Timestamptz | ✓ | `now()` | Data em que a linha foi gravada — sempre presente, distinta de `dataEvento` |
| `origem` | Enum `OrigemEvento` | ✓ | `MANUAL` | `MANUAL`\|`SISTEMA`\|`IA`\|`IMPORTACAO` |
| `autorId` | UUID | — | `null` | FK → `membros.id`; `null` se gerado pelo sistema |
| `entidadeRelacionadaTipo` | Texto | — | `null` | `'documento'`, `'prazo'`, `'comentario'`, `'resumo_ia'` |
| `entidadeRelacionadaId` | UUID | — | `null` | Sem FK física (referência polimórfica) — ver nota abaixo |
| `visibilidade` | Enum `Visibilidade` | ✓ | `INTERNA` | `INTERNA`\|`COMPARTILHADA` — prepara Portal do Cliente, [../06-modelo-dominio.md §6.5](../06-modelo-dominio.md) |
| `metadados` | JSONB | ✓ | `{}` | Estrutura por `tipo` |
| `fixado` | Booleano | ✓ | `false` | Destaque no topo da timeline |
| `criadoEm` / `atualizadoEm` | Timestamptz | ✓ | `now()` | |
| `excluidoEm` | Timestamptz | — | `null` | |

**FK:** `processoId` composta (`CASCADE`) · `autorId` composta (`SET NULL`).
`entidadeRelacionadaId` é **referência fraca** (sem FK de banco) porque aponta
para tabelas diferentes conforme `entidadeRelacionadaTipo` — Postgres não
suporta FK polimórfica nativamente; integridade é garantida na aplicação, no
momento da escrita (transação única que cria a entidade de origem e a entrada
de timeline juntas — nunca em dois passos separados que possam divergir).

**Índices:** `idx_timeline_processo_data (processo_id, data_evento DESC)` — o
índice mais importante deste módulo, sustenta a aba Timeline e a montagem de
contexto para IA · `idx_timeline_processo_tipo (processo_id, tipo)` ·
GIN em `metadados` se filtro por campo de metadado se tornar necessário
(nenhum previsto no MVP).

**Regras de integridade:** `visibilidade = COMPARTILHADA` só é permitida em
`tipo` que já nasce compartilhável por natureza (documento marcado como
compartilhado, andamento público) — nunca em `COMENTARIO` interno, reforçando o
invariante de [../06-modelo-dominio.md §6.5](../06-modelo-dominio.md):
comentário interno nunca aparece na timeline do cliente.

**Soft delete:** sim, mas **eventos gerados pelo sistema não podem ser
excluídos pelo usuário** (apenas `ANOTACAO` e `PERSONALIZADO` manuais são
excluíveis) — validado no use case, não no schema.

**Auditoria:** exclusão de evento de timeline é auditada (é reescrita de
histórico, ainda que soft).

**Riscos:** tabela de altíssimo volume de escrita (todo evento de todo processo
passa por aqui) — particionamento por `criado_em` (mensal) é o gatilho de
evolução registrado em [13-decisoes-riscos-proxima-etapa.md](13-decisoes-riscos-proxima-etapa.md)
se o volume superar a capacidade de um índice único bem mantido.

---

## 5.2 Pasta *(nova nesta etapa — organização de documentos)*

**Finalidade.** Estrutura hierárquica opcional para organizar documentos dentro
de um processo ou da biblioteca geral do escritório.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `escritorioId` | UUID | ✓ | — | FK → `escritorios.id` |
| `processoId` | UUID | — | `null` | FK composta → `processos`; `null` = pasta da biblioteca geral |
| `pastaPaiId` | UUID | — | `null` | FK composta → `pastas` (auto-relacionamento) |
| `nome` | Texto | ✓ | — | |
| `caminhoLogico` | Texto (gerado/mantido pela app) | ✓ | calculado | Ex.: `/Contratos/2026/`, cache de exibição — não fonte de verdade (a árvore real é `pastaPaiId`) |
| `ordem` | Inteiro | ✓ | `0` | Ordenação manual dentro do mesmo nível |
| `criadaPorId` | UUID | ✓ | — | FK composta → `membros` |
| `criadoEm` / `atualizadoEm` | Timestamptz | ✓ | `now()` | |
| `excluidoEm` | Timestamptz | — | `null` | |

**Índices:** `idx_pastas_processo (processo_id)` · `idx_pastas_pai (pasta_pai_id)`.

**Prevenção de ciclo:** `pastaPaiId` não pode, direta ou transitivamente,
apontar para a própria pasta ou para um descendente seu. Postgres não valida
ciclo em auto-relacionamento por `CHECK` simples — a validação acontece na
aplicação (percorrer a cadeia de ancestrais antes de mover/criar) dentro da
mesma transação da escrita. **Profundidade máxima:** 6 níveis, validada no
mesmo passo — limite de produto (evita árvore ingerenciável na UI), não
limitação técnica do banco.

**Regras de integridade:** `pastaPaiId`, quando presente, deve pertencer ao
mesmo `processoId` (ou ambos `null`, biblioteca geral) — garantido por FK
composta incluindo `processo_id` além de `escritorio_id`.

**Soft delete:** sim. Exclusão de pasta com documentos dentro **não é permitida
por padrão** — bloco com mensagem clara ("mova ou exclua os N documentos
primeiro") a menos que o usuário confirme exclusão em cascata lógica (marca
pasta e documentos filhos como excluídos na mesma transação, todos recuperáveis
juntos da lixeira).

---

## 5.3 Documento

**Finalidade.** Metadado e referência de um arquivo — o binário nunca é
armazenado no banco (premissa 8/9); vive em storage S3-compatible.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `escritorioId` | UUID | ✓ | — | FK → `escritorios.id` |
| `processoId` | UUID | — | `null` | FK composta → `processos` |
| `clienteId` | UUID | — | `null` | FK composta → `clientes` |
| `pastaId` | UUID | — | `null` | FK composta → `pastas` |
| `nome` | Texto | ✓ | — | Nome de exibição, editável |
| `nomeOriginal` | Texto | ✓ | — | Nome do arquivo como enviado, imutável |
| `extensao` | Texto curto | ✓ | — | |
| `mimeType` | Texto | ✓ | — | |
| `tamanhoBytes` | `BIGINT` | ✓ | — | |
| `storageProvider` | Enum `StorageProvider` | ✓ | `S3` | Preparação para múltiplos provedores |
| `storageKey` | Texto | ✓ | — | Caminho no bucket — nunca exposto diretamente ao cliente |
| `hashSha256` | Texto (64 hex) | ✓ | — | Integridade + deduplicação |
| `statusUpload` | Enum `StatusUpload` | ✓ | `PENDENTE` | `PENDENTE`\|`CONCLUIDO`\|`FALHA` |
| `statusProcessamento` | Enum `StatusProcessamentoDocumento` | ✓ | `PENDENTE` | `PENDENTE`\|`PROCESSANDO`\|`PRONTO`\|`FALHA` |
| `statusAntivirus` | Enum `StatusAntivirus` | ✓ | `PENDENTE` | `PENDENTE`\|`LIMPO`\|`INFECTADO`\|`ERRO` |
| `categoria` | Texto | — | `null` | Taxonomia livre — ver [02](02-convencoes-dados.md) §2.9 |
| `tipo` | Enum `TipoDocumento` | ✓ | `OUTRO` | `PETICAO`\|`CONTRATO`\|`PROCURACAO`\|`SENTENCA`\|`DECISAO`\|`COMPROVANTE`\|`PARECER`\|`OUTRO` |
| `confidencialidade` | Enum `NivelConfidencialidade` | ✓ | `PADRAO` | `PADRAO`\|`CONFIDENCIAL` |
| `visibilidade` | Enum `Visibilidade` | ✓ | `INTERNA` | `INTERNA`\|`COMPARTILHADA`\|`PUBLICA` — prepara Portal do Cliente |
| `descricao` | Texto | — | `null` | |
| `versaoVigenteId` | UUID | — | `null` | FK → `versoes_documento.id`; `null` só durante a janela entre criação do `Documento` e conclusão do primeiro upload |
| `autorUploadId` | UUID | ✓ | — | FK composta → `membros` |
| `dataDocumento` | `DATE` | — | `null` | Data do documento em si (ex.: data da sentença), distinta de `criadoEm` |
| `versao` | Inteiro | ✓ | `1` | Controle de concorrência otimista sobre os *metadados* (não sobre o binário — binário versiona via `VersaoDocumento`) |
| `criadoEm` / `atualizadoEm` | Timestamptz | ✓ | `now()` | |
| `excluidoEm` | Timestamptz | — | `null` | |

**FK:** `processoId` composta (`SET NULL` — documento pode ficar órfão de
processo, nunca de escritório) · `clienteId` composta (`SET NULL`) ·
`pastaId` composta (`SET NULL`) · `versaoVigenteId → versoes_documento.id` (`RESTRICT`).

**Índices:** `idx_documentos_escritorio_processo (escritorio_id, processo_id)` ·
`idx_documentos_pasta (pasta_id)` · `idx_documentos_hash (escritorio_id,
hash_sha256)` (deduplicação) · `idx_documentos_status_processamento
(status_processamento) WHERE status_processamento <> 'PRONTO'` (fila de
trabalho pendente).

**Ciclo de upload:**
1. `POST /v1/documents/presign` → `statusUpload = PENDENTE`, linha criada sem
   `versaoVigenteId`.
2. Cliente sobe o binário direto ao storage via URL assinada.
3. `POST /v1/documents` confirma → cria `VersaoDocumento` (v1), atualiza
   `versaoVigenteId`, `statusUpload = CONCLUIDO`.
4. Falha de confirmação em janela de tempo (ex.: 1h) → job marca
   `statusUpload = FALHA`, registro permanece (não é excluído automaticamente,
   permite diagnóstico) e é ocultado da listagem padrão.
5. Pipeline assíncrono (antivírus → extração → thumbnail → indexação →
   embeddings) avança `statusProcessamento`; documento é **visível e baixável**
   assim que `statusAntivirus = LIMPO`, mesmo antes de `PRONTO` — só não aparece
   em busca por conteúdo ainda (reafirma [../08-especificacao-modulos.md §8.3](../08-especificacao-modulos.md)).

**Antivírus:** `statusAntivirus = INFECTADO` bloqueia download e preview
incondicionalmente (checado no use case de download, não apenas na UI);
documento permanece visível como metadado (para rastreabilidade), mas o
binário nunca é servido.

**Duplicidade:** `hashSha256` igual dentro do mesmo `escritorio_id` gera aviso
não bloqueante ("este arquivo já existe como '<nome>' em <local>") — nunca
impede o upload, pois duplicidade intencional é um caso legítimo (mesmo
documento anexado a dois processos).

**Documentos confidenciais:** `confidencialidade = CONFIDENCIAL` exige
permissão adicional de leitura além do acesso padrão ao processo — resolvido na
autorização de recurso, mesmo padrão de `segredoJustica` do Processo.

**URL assinada:** toda leitura/download passa por URL pré-assinada de TTL curto
(5 minutos, reafirmando [../09-seguranca-lgpd.md §9.4](../09-seguranca-lgpd.md))
— `storageKey` nunca é exposta diretamente, nunca é previsível.

**Remoção física futura e retenção:** soft delete com lixeira de 30 dias;
expurgo físico do storage (não apenas da linha do banco) roda por job após o
prazo, exceto se o documento estiver referenciado por `FonteIA` de um resumo
ainda vigente (ver [06](06-entidades-ia-notificacoes-auditoria.md)) — nesse
caso a exclusão física do binário é adiada e sinalizada para revisão manual,
para não invalidar silenciosamente uma fonte já citada em resumo entregue ao
usuário.

**Versionamento futuro:** já presente como base ativa nesta fase (não é "futuro"
— reafirma [../08-especificacao-modulos.md §8.3](../08-especificacao-modulos.md),
que já trata versionamento como requisito de MVP); ver §5.4.

---

## 5.4 VersaoDocumento

**Finalidade.** Cada envio de conteúdo binário para um `Documento` — imutável
após criada.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `documentoId` | UUID | ✓ | — | FK composta → `documentos` |
| `numero` | Inteiro | ✓ | incremental | `1, 2, 3...` por documento |
| `storageKey` | Texto | ✓ | — | Caminho próprio desta versão no bucket |
| `hashSha256` | Texto | ✓ | — | |
| `tamanhoBytes` | `BIGINT` | ✓ | — | |
| `autorId` | UUID | ✓ | — | FK composta → `membros` |
| `comentarioVersao` | Texto | — | `null` | "O que mudou nesta versão" |
| `criadoEm` | Timestamptz | ✓ | `now()` | Sem `atualizadoEm` — imutável por design |

**Índices:** `idx_versoes_documento (documento_id, numero DESC)`.

**Restrições únicas:** `uq_versoes_documento_numero (documento_id, numero)`.

**Regra de integridade:** nenhuma coluna desta tabela aceita `UPDATE` após
`INSERT` (reforçável revogando privilégio `UPDATE` da role de aplicação sobre
esta tabela especificamente, mesmo padrão de imutabilidade de
`LogAuditoria`) — "correção" é sempre uma nova versão, nunca uma edição.

---

## 5.5 Comentario

**Finalidade.** Discussão interna sobre processo, documento ou evento de
timeline.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `escritorioId` | UUID | ✓ | — | FK → `escritorios.id` |
| `processoId` | UUID | — | `null` | FK composta → `processos` |
| `documentoId` | UUID | — | `null` | FK composta → `documentos` |
| `timelineEventoId` | UUID | — | `null` | FK → `eventos_timeline.id` |
| `autorId` | UUID | ✓ | — | FK composta → `membros` |
| `conteudo` | Texto longo (rich text sanitizado) | ✓ | — | |
| `comentarioPaiId` | UUID | — | `null` | FK → `comentarios.id` (thread de 1 nível — ver abaixo) |
| `editado` | Booleano | ✓ | `false` | |
| `visibilidade` | Enum `Visibilidade` | ✓ | `INTERNA` | `INTERNA`\|`COMPARTILHADA` |
| `criadoEm` / `atualizadoEm` | Timestamptz | ✓ | `now()` | |
| `excluidoEm` | Timestamptz | — | `null` | |

**Regra de integridade:** exatamente **um** de `processoId`/`documentoId`/
`timelineEventoId` é preenchido (`CHECK` com `num_nonnulls`) — comentário
sempre tem exatamente um contexto de origem, nunca zero nem múltiplos.

**Índices:** `idx_comentarios_processo (processo_id, criado_em)` ·
`idx_comentarios_documento (documento_id, criado_em)` ·
`idx_comentarios_pai (comentario_pai_id)`.

**Thread de 1 nível:** `comentarioPaiId` só pode referenciar um comentário cujo
próprio `comentarioPaiId` seja `null` (`CHECK` validado na aplicação) — evita
threads profundas que a UI não precisa suportar.

**Preparação para menções futuras:** tabela satélite `comentario_mencao
(comentarioId, membroId)` já reservada na modelagem (não populada por regra de
negócio nova, apenas estrutura pronta) — permite notificação por @menção sem
migração de schema quando a funcionalidade for ligada; consistente com o `@menção`
já citado em [../08-especificacao-modulos.md §8.6](../08-especificacao-modulos.md).

**Regra de segurança crítica:** `visibilidade = INTERNA` **nunca** é exposta a
usuário `EXTERNO` (Fase 3) — filtrado na própria query de leitura, reforçando
[../06-modelo-dominio.md §6.5](../06-modelo-dominio.md).

---

## 5.6 Tag (normalizada nesta etapa)

**Finalidade.** Etiqueta reutilizável entre Processos, Documentos e Clientes.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `escritorioId` | UUID | ✓ | — | FK → `escritorios.id` |
| `nome` | Texto | ✓ | — | |
| `cor` | Texto (hex) | ✓ | cor padrão do design system | |
| `descricao` | Texto | — | `null` | |
| `criadoEm` / `atualizadoEm` | Timestamptz | ✓ | `now()` | |
| `excluidoEm` | Timestamptz | — | `null` | |

**Restrições únicas:** `uq_tags_escritorio_nome (escritorio_id, lower(nome))
WHERE excluido_em IS NULL` — evita "Urgente" e "urgente" coexistindo por erro
de digitação.

### Tabelas associativas (N:N)

| Tabela | Colunas | Único |
|---|---|---|
| `processo_tag` | `processoId`, `tagId`, `criadoEm` | `(processo_id, tag_id)` |
| `documento_tag` | `documentoId`, `tagId`, `criadoEm` | `(documento_id, tag_id)` |
| `cliente_tag` | `clienteId`, `tagId`, `criadoEm` | `(cliente_id, tag_id)` |

Cada uma com FK composta incluindo `escritorio_id` implícito via a entidade
principal — `Tag` de um escritório nunca é associável a `Processo` de outro
(garantido pela FK composta em cada lado).

**Soft delete de Tag e impacto nas associações:** excluir uma `Tag` não apaga as
linhas associativas (preserva histórico do que já foi marcado); a listagem de
tags de um item filtra `Tag.excluidoEm IS NULL`, então uma tag excluída some da
exibição sem quebrar integridade referencial.

---

**Anterior:** [04-entidades-clientes-processos.md](04-entidades-clientes-processos.md) · **Próximo:** [06-entidades-ia-notificacoes-auditoria.md](06-entidades-ia-notificacoes-auditoria.md)
