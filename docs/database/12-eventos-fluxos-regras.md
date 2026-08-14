# 12 — Eventos de Domínio, Fluxos de Dados, Regras de Negócio e Concorrência

---

## 12.1 Eventos de domínio

Padrão de entrega: emitidos in-process (NestJS `EventEmitter2`) dentro da
mesma transação de banco que os originou; efeitos que exigem trabalho
assíncrono confiável (envio de e-mail, geração de IA, indexação) são
enfileirados no BullMQ **via padrão outbox** — uma tabela `eventos_outbox`
(escritorioId, tipo, payload JSONB, processadoEm) gravada na mesma transação do
evento de domínio, consumida por um worker que publica na fila e marca
`processadoEm`. Isso fecha a lacuna clássica de "a transação do banco commitou
mas o enfileiramento na fila falhou" — sem outbox, um evento pode ser perdido
silenciosamente; com outbox, o pior caso é reprocessamento (mitigado por
idempotência, §12.13). Este é um detalhe de implementação do "eventos de
domínio + BullMQ" já decidido em
[../05-arquitetura-backend.md §5.8](../05-arquitetura-backend.md), não uma nova
peça de arquitetura.

| Evento | Origem | Payload mínimo | Consumidores | Idempotência necessária |
|---|---|---|---|---|
| `UserRegistered` | Cadastro de usuário | `usuarioId`, `email` | Envio de e-mail de verificação | Sim — não reenviar se já verificado |
| `OfficeCreated` | Criação de escritório | `escritorioId`, `ownerId` | Seed de papéis/permissões padrão do tenant, boas-vindas | Sim — criação de papéis é `upsert` |
| `UserInvited` | Convite emitido | `conviteId`, `escritorioId`, `email` | Envio de e-mail de convite | Sim — reenvio revoga o anterior (§3.6) |
| `InvitationAccepted` | Aceite de convite | `conviteId`, `membroId` | Notificação ao convidante, auditoria | Sim — `status` do convite é a guarda |
| `ClientCreated` | Criação de cliente | `clienteId`, `escritorioId` | Indexação para busca | Idempotente por natureza (reindexação é substitutiva) |
| `ProcessoCriado` | Criação de processo | `processoId`, `escritorioId`, `responsavelId` | Timeline (evento inicial), notificação ao responsável, indexação | Sim |
| `ProcessoAtualizado` | Update de campos | `processoId`, `camposAlterados` | Timeline, invalidação de cache de resumo IA (`hashContexto`) | Sim — recomputar hash é idempotente |
| `ProcessoStatusAlterado` | Mudança de status | `processoId`, `statusAnterior`, `statusNovo` | Timeline, notificação à equipe | Sim |
| `ProcessoMembroAtribuido` | Atribuição de responsável/equipe | `processoId`, `membroId`, `papelNoProcesso` | Timeline, notificação ao atribuído | Sim |
| `DocumentoEnviado` | Upload confirmado | `documentoId`, `processoId?` | Timeline, disparo do pipeline de processamento | Sim — pipeline por `documentoId` é naturalmente idempotente (reprocessar não duplica) |
| `DocumentoProcessado` | Pipeline concluído | `documentoId`, `statusProcessamento` | Notificação, disponibilização para busca | Sim |
| `EventoTimelineCriado` | Qualquer inserção em timeline | `eventoId`, `processoId`, `tipo` | Notificação (quando aplicável ao tipo) | Sim |
| `ResumoIaSolicitado` | Solicitação de resumo | `resumoIaId`, `processoId` | Worker de IA (fila dedicada) | Sim — `status = GERANDO` é a guarda contra duplicidade |
| `ResumoIaConcluido` | Geração finalizada | `resumoIaId`, `status` | Notificação, timeline | Sim |
| `ResumoIaFalhou` | Erro na geração | `resumoIaId`, `erro` | Notificação, log técnico | Sim |
| `NotificacaoCriada` | Qualquer evento acima que gera notificação | `notificacaoId`, `destinatarioId` | Envio por canal (in-app/e-mail) conforme preferência | Sim — `agrupamentoChave` é a guarda (§6.4) |
| `MembroRemovidoDoEscritorio` | Desativação de membro | `membroId`, `escritorioId` | Revogação de sessões, reatribuição obrigatória de processos, auditoria | Sim |

## 12.2 Idempotência — mecanismo geral

Todo consumidor de evento é escrito para ser seguro sob reentrega: verifica o
estado atual antes de agir (ex.: "already processed" via `status` da entidade
de destino) em vez de assumir entrega única. Jobs BullMQ usam `jobId`
determinístico (ex.: `resumo-ia:{resumoIaId}:{versaoResumo}`) para que o próprio
BullMQ deduplique reentregas idênticas antes mesmo de o consumidor rodar.

---

## 12.3 Fluxos de dados detalhados

### 12.3.1 Cadastro e criação do primeiro escritório

**Validações:** e-mail único (parcial, não excluído) · senha atende política
mínima · `slug` do escritório gerado e verificado como único.
**Transação:** `INSERT Usuario` (status `PENDENTE`) → `INSERT Escritorio`
(status `TRIAL`) → `INSERT Membro` (papel `OWNER`, status `ATIVO`) — as três em
uma única transação; falha em qualquer etapa reverte tudo (nunca existe
`Usuario` sem `Escritorio` associado quando o fluxo é "criar meu escritório").
**Entidades:** `Usuario`, `Escritorio`, `Membro`.
**Eventos:** `UserRegistered`, `OfficeCreated`.
**Auditoria:** `office.create`, `user.register`.
**Falhas:** e-mail já existe → 409 com mensagem genérica (não revela se é o
e-mail ou outro campo); `slug` colidiu → sufixo numérico automático, sem expor
erro ao usuário.
**Permissões:** endpoint público (sem autenticação prévia).

### 12.3.2 Convite e entrada de um usuário

**Validações:** `email` do convite não pertence já a um `Membro` ativo do
mesmo escritório · `papelId` existe e pertence ao escritório ou é papel de
sistema.
**Transação (emissão):** `UPDATE` de convite pendente anterior para
`REVOGADO` (se existir) → `INSERT Convite` novo, na mesma transação.
**Transação (aceite):** validar hash do token + expiração + status
`PENDENTE` → se `Usuario` com este e-mail já existe, criar `Membro`; senão,
redirecionar para cadastro e só então criar `Membro` → `UPDATE Convite` para
`ACEITO` — tudo em uma transação por etapa, nunca dois-passos sem atomicidade
entre "criar Membro" e "marcar convite aceito" (evita convite aceito duas
vezes gerando dois `Membro`, ver §12.13).
**Entidades:** `Convite`, `Usuario`, `Membro`.
**Eventos:** `UserInvited`, `InvitationAccepted`.
**Auditoria:** `invitation.create`, `invitation.accept`, `member.create`.
**Falhas:** token inválido/expirado → erro genérico; convite já aceito →
idempotente (retorna sucesso sem duplicar, ver §12.13 item "convite aceito
duas vezes").
**Permissões:** emissão exige `user:invite`; aceite é público (mediante token).

### 12.3.3 Criação de cliente

**Validações:** `razaoSocial` obrigatório se `PESSOA_JURIDICA` · CPF/CNPJ
normalizado e, se informado, validado por dígito verificador.
**Transação:** `INSERT Cliente` único passo (agregado simples, DDD leve).
**Entidades:** `Cliente`.
**Eventos:** `ClientCreated`.
**Auditoria:** `client.create`.
**Falhas:** documento duplicado no escritório → aviso não bloqueante (ver
§4.1 em [04](04-entidades-clientes-processos.md)), nunca erro duro.
**Permissões:** `client:create`.

### 12.3.4 Criação de processo

**Validações:** CNJ (se informado) com dígito verificador válido e não
duplicado no escritório · `clienteId` pertence ao mesmo escritório (FK
composta) · `responsavelPrincipalId` é `Membro` ativo do mesmo escritório.
**Transação:** `INSERT Processo` → `INSERT ProcessoMembro`
(`responsavelPrincipal = true` para o responsável) → `INSERT EventoTimeline`
(`tipo = SISTEMA`, "processo criado") — uma única transação.
**Entidades:** `Processo`, `ProcessoMembro`, `EventoTimeline`.
**Eventos:** `ProcessoCriado`.
**Auditoria:** `case.create`.
**Falhas:** CNJ duplicado → 409 com sugestão de ir ao processo existente
(reafirma [../03-fluxos-e-telas.md §3.4.1](../03-fluxos-e-telas.md)).
**Permissões:** `case:create`.

### 12.3.5 Associação de equipe ao processo

**Validações:** `membroId` ativo no mesmo escritório · não duplicar vínculo
ativo (`(processo_id, membro_id) WHERE saiu_em IS NULL` único).
**Transação:** `INSERT ProcessoMembro` → `INSERT EventoTimeline` (opcional,
`tipo = SISTEMA`) → `INSERT Notificacao` para o membro adicionado.
**Entidades:** `ProcessoMembro`, `EventoTimeline`, `Notificacao`.
**Eventos:** `ProcessoMembroAtribuido`.
**Auditoria:** `case.team.add`.
**Falhas:** membro já na equipe → idempotente, retorna o vínculo existente.
**Permissões:** `case:team:manage` (responsável do processo ou papel com
escopo `ALL`/`TEAM`).

### 12.3.6 Upload de documento

**Validações:** MIME type e extensão permitidos · tamanho ≤ limite do plano ·
`processoId`/`clienteId`/`pastaId` (se informados) pertencem ao mesmo
escritório.
**Transação (etapa 1 — presign):** `INSERT Documento` (`statusUpload =
PENDENTE`, sem `versaoVigenteId`).
**Transação (etapa 2 — confirmação):** `INSERT VersaoDocumento` (v1) →
`UPDATE Documento` (`versaoVigenteId`, `statusUpload = CONCLUIDO`) →
`INSERT EventoTimeline` (`tipo = DOCUMENTO`) — uma transação.
**Assíncrono (fora da transação, via fila):** antivírus → extração de texto →
thumbnail → indexação (regenera `tsvector`) → embeddings.
**Entidades:** `Documento`, `VersaoDocumento`, `EventoTimeline`.
**Eventos:** `DocumentoEnviado`, depois `DocumentoProcessado`.
**Auditoria:** `document.upload`, e **toda visualização/download subsequente**
(`document.view`, `document.download`) — reafirma
[06](06-entidades-ia-notificacoes-auditoria.md) §6.6.1.
**Falhas:** antivírus detecta ameaça → `statusAntivirus = INFECTADO`, download
bloqueado, alerta ao autor do upload e ao admin.
**Permissões:** `document:create`.

### 12.3.7 Inclusão de evento na timeline

**Validações:** exatamente um tipo de origem (manual, sistema, IA, importação)
· `dataEvento` pode ser retroativa, `dataRegistro` nunca.
**Transação:** `INSERT EventoTimeline` único passo, a menos que a origem seja
outra escrita (prazo, documento) — nesse caso, parte da mesma transação da
escrita de origem (§4.6 em [04](04-entidades-clientes-processos.md)).
**Entidades:** `EventoTimeline`.
**Eventos:** `EventoTimelineCriado`.
**Auditoria:** apenas se o tipo for sensível (`ALTERACAO_STATUS`) ou se a
edição/exclusão ocorrer depois.
**Falhas:** nenhuma validação bloqueante além de forma.
**Permissões:** herda a permissão do processo (`case:read` para ver,
permissão de escrita do tipo de origem para criar).

### 12.3.8 Geração de resumo por IA

**Validações:** cota do tenant não excedida (consulta agregada de custo do mês)
· papel do solicitante tem `ai:summarize` · não existe geração `GERANDO` em
andamento para o mesmo `(processoId, tipoResumo)`.
**Transação (início):** `INSERT ResumoIA` (`status = PENDENTE` → `GERANDO`
antes de enfileirar — a mudança de status é o lock lógico).
**Assíncrono:** `ContextBuilder` monta contexto (RAG, restrito ao mesmo
`escritorioId`) → chamada ao provedor com streaming → `INSERT` de N linhas em
`FonteIA` → `UPDATE ResumoIA` (`conteudo`, `status = PRONTO`, `tokensEntrada/Saida`,
`custoEstimadoCentavos`) — tudo em uma transação de conclusão.
**Entidades:** `ResumoIA`, `FonteIA`.
**Eventos:** `ResumoIaSolicitado`, depois `ResumoIaConcluido` ou
`ResumoIaFalhou`.
**Auditoria:** `ai.summary.generate` (sempre, sucesso ou falha).
**Falhas:** provedor indisponível → `status = FALHA`, `erro` preenchido,
notificação ao solicitante, sem consumir cota; cota excedida → 402/403 antes
de sequer criar a linha `PENDENTE`.
**Permissões:** `ai:summarize`.

### 12.3.9 Busca global

**Validações:** nenhuma validação de negócio — é leitura.
**Transação:** nenhuma — `SELECT` puro, porém **sempre dentro do contexto de
tenant e autorização** (extensão Prisma + predicado de segredo de
justiça/confidencialidade no `WHERE`, ver [09](09-indices-busca-performance.md) §9.3.3).
**Entidades lidas:** `Processo`, `Cliente`, `Documento`, `Tag`, `Comentario`
(conforme escopo do prompt desta etapa).
**Eventos:** nenhum evento de domínio — busca é operação de leitura pura, sem
efeito colateral (analytics de busca, se existir, é telemetria, não evento de
domínio).
**Falhas:** nenhuma — busca sem resultado retorna lista vazia, nunca erro.
**Permissões:** herdadas por entidade — resultado é a interseção do que o
usuário pode ler em cada tipo.

### 12.3.10 Emissão e leitura de notificação

**Validações:** verificação de duplicidade por `agrupamentoChave` antes de
inserir (§6.4).
**Transação:** `INSERT Notificacao` → leitura de `PreferenciaNotificacao` do
destinatário → envio por canal habilitado (fora da transação de banco, via
fila, para não acoplar entrega de e-mail à transação de escrita).
**Entidades:** `Notificacao`, `PreferenciaNotificacao`.
**Eventos:** `NotificacaoCriada`.
**Leitura:** `UPDATE Notificacao SET lida_em = now() WHERE id = ? AND
destinatario_id = ?` — sempre com o filtro de destinatário, nunca por `id`
isolado (mesma disciplina anti-IDOR do §1.6).
**Auditoria:** não auditada individualmente (volume alto, baixo risco) —
exceção: notificação de segurança (`prioridade = SEGURANCA`) é auditada.
**Permissões:** usuário só lê/marca as próprias notificações.

### 12.3.11 Desativação de usuário (remoção de membro)

**Validações:** membro a desativar não é o último `OWNER` ativo do
escritório · **todos os processos onde é responsável principal têm novo
responsável definido antes da conclusão** (regra dura, não apenas aviso).
**Transação:** se houver processos sem reatribuição, a API retorna a lista
para o admin resolver **antes** de a transação de desativação sequer começar
(não é rollback — é validação prévia, pois reatribuição em massa é decisão
humana, não automática) → `UPDATE Membro` (`status = INATIVO`,
`desativadoEm`, `desativadoPorId`) → revogação de todas as `Sessao` ativas
deste membro neste escritório.
**Entidades:** `Membro`, `Processo` (leitura para checagem), `Sessao`.
**Eventos:** `MembroRemovidoDoEscritorio`.
**Auditoria:** `member.deactivate` — ação sensível de alto impacto.
**Falhas:** tentativa de desativar o último `OWNER` → 409 explícito
("transfira a titularidade antes").
**Permissões:** `user:manage`.

### 12.3.12 Exclusão lógica de processo

**Validações:** papel com `case:delete`.
**Transação:** `UPDATE Processo SET excluido_em = now()` — **sem** cascata
sobre `Documento`/`Comentario`/`EventoTimeline` (permanecem intactos e
acessíveis por busca direta, conforme §10.7 em
[10-soft-delete-retencao-lgpd.md](10-soft-delete-retencao-lgpd.md)).
**Entidades:** `Processo`.
**Eventos:** `ProcessoStatusAlterado` (tratado como transição para um estado
lógico "excluído" do ponto de vista de eventos, mesmo sem status enum
dedicado).
**Auditoria:** `case.delete` — sempre auditado.
**Falhas:** nenhuma condição de negócio bloqueia (diferente de exclusão de
`Cliente`, que é bloqueada por `RESTRICT` se houver processo ativo — aqui é o
próprio processo sendo excluído).
**Permissões:** `case:delete`.

---

## 12.4 Regras de negócio críticas (lista consolidada)

Reafirmando e expandindo a lista de 20 regras do prompt anterior, com a
modelagem de dados que cada uma exige:

1. Todo processo pertence a um escritório — `Processo.escritorioId NOT NULL`,
   imutável após criação.
2. Todo cliente pertence a um escritório — `Cliente.escritorioId NOT NULL`.
3. Todo documento pertence a um escritório — `Documento.escritorioId NOT NULL`
   (mesmo quando órfão de processo/pasta).
4. Usuários só acessam dados de escritórios aos quais estão vinculados — via
   `Membro` + três camadas de isolamento (guard, extensão Prisma, RLS).
5. O responsável de um processo deve pertencer ao mesmo escritório — FK
   composta `(responsavelPrincipalId, escritorioId)`.
6. Número CNJ não duplica no mesmo escritório, salvo justificativa de negócio
   — `uq_processos_escritorio_cnj` parcial; exceção de negócio (se necessária)
   é tratada como override manual documentado em auditoria, nunca por
   flexibilização silenciosa da constraint.
7. Processo extrajudicial pode não ter CNJ — `numeroCnj` nullable, sem `CHECK`
   condicionando à obrigatoriedade.
8. Documentos confidenciais exigem permissão adicional —
   `Documento.confidencialidade`, resolvido na autorização de recurso.
9. Apenas perfis autorizados geram resumo por IA — `ai:summarize` na matriz
   de permissões.
10. Resumos registram as fontes utilizadas — `FonteIA`, ao menos uma linha por
    resumo `PRONTO` (§6.2).
11. Resumos são invalidados quando fontes relevantes mudam —
    `ResumoIA.hashContexto` comparado a cada leitura.
12. Exclusão de processo não apaga documentos imediatamente — soft delete sem
    cascata (§12.3.12).
13. Auditoria não pode ser alterada por usuários comuns — privilégio de banco
    revogado (`REVOKE UPDATE, DELETE`), não apenas checagem de aplicação.
14. Convites expiram — `Convite.expiraEm`, validado no aceite.
15. E-mails são normalizados — `lower(trim(...))` na aplicação e reforçado por
    trigger.
16. CPF e CNPJ são normalizados — apenas dígitos, sem máscara persistida.
17. Um usuário não tem dois vínculos ativos com o mesmo escritório —
    `uq_membros_usuario_escritorio`.
18. Toda consulta respeita o escritório ativo — extensão Prisma + RLS.
19. Ações críticas exigem revalidação de permissão — guard de ação + use case
    de recurso em toda operação sensível, sem cache de decisão de autorização
    entre requisições.
20. Nenhuma resposta de IA é orientação jurídica definitiva — selo obrigatório
    na apresentação (`ResumoIA` não tem campo de "validado juridicamente";
    a ausência desse campo é deliberada — não modelamos um estado que
    sugeriria chancela jurídica automática).

**Regras adicionais identificadas nesta etapa de modelagem física:**

21. `escritorio_id` é imutável após `INSERT` em toda tabela de domínio — sem
    `UPDATE` permitido nesta coluna em nenhum caso de uso (mover um registro
    entre tenants nunca é uma operação de produto legítima).
22. Papel de sistema (`Papel.ehSistema = true`) não é editável nem excluível
    via API — apenas via seed/migration.
23. Prazo `FATAL` não é excluído fisicamente nem via soft delete simples —
    apenas `CANCELADO` com justificativa (campo obrigatório no payload da API,
    registrado em auditoria).
24. Pasta não é excluída com documentos dentro sem confirmação explícita de
    cascata lógica.
25. Um `Membro` não pode alterar o próprio `papelId` (prevenção de
    auto-escalonamento de privilégio).
26. `NEGAR` em `PermissaoUsuario` sempre vence `CONCEDER`, independente da
    ordem de concessão.
27. Documento com `statusAntivirus = INFECTADO` nunca é servido para
    download/preview, independentemente de permissão do solicitante.

---

## 12.5 Concorrência e integridade

| Cenário | Tratamento |
|---|---|
| **Duas pessoas editando o mesmo processo** | Versionamento otimista (`Processo.versao`) — segunda escrita com versão desatualizada recebe `409 Conflict` e precisa reler antes de tentar de novo |
| **Upload duplicado** | Deduplicação por `hashSha256` gera aviso não bloqueante, nunca erro — duplicidade intencional é caso válido (§5.3) |
| **Alteração simultânea de status** | Coberta pelo mesmo versionamento otimista do processo — não há mecanismo separado por campo |
| **Geração duplicada de resumo** | `status = GERANDO` funciona como lock lógico; constraint única `uq_resumos_ia_vigente` impede duas linhas vigentes simultâneas mesmo sob concorrência de transação |
| **Convite aceito duas vezes** | Segunda tentativa encontra `status != PENDENTE` (já `ACEITO`) e retorna sucesso idempotente sem criar segundo `Membro` — nunca erro genérico que confunda o usuário |
| **Exclusão de pasta com documentos** | Bloqueada por padrão; cascata lógica só mediante confirmação explícita (§5.2) |
| **Remoção de usuário responsável** | Bloqueada até reatribuição de todos os processos sob sua responsabilidade (§12.3.11) |
| **Processo sem responsável** | Estruturalmente impedido — `responsavelPrincipalId NOT NULL`, nunca existe como estado transitório persistido |
| **Documento órfão** | Estado válido para `processoId`/`clienteId`/`pastaId` (todos `SET NULL`), nunca para `escritorioId` (sempre obrigatório) |
| **Evento de timeline excluído** | Apenas eventos manuais são excluíveis; exclusão é soft delete, auditada |
| **Cliente associado a processos** | `RESTRICT` físico impede exclusão enquanto houver `Processo.clienteId` apontando para ele |
| **Transações** | `$transaction` do Prisma para toda escrita multi-tabela; `SET LOCAL` de RLS como primeiro comando dentro dela |
| **Idempotência** | `jobId` determinístico em filas; `status` como guarda em fluxos de estado (convite, resumo IA); `agrupamentoChave` em notificação |
| **Versionamento otimista** | `Processo.versao`, `Documento.versao` (metadados) — incrementado por trigger, checado no `WHERE` do `UPDATE` |
| **Locks explícitos** | Evitados por padrão (preferência por otimista, que escala melhor sob baixa contenção real); `SELECT ... FOR UPDATE` reservado a um único caso: geração de resumo IA, para impedir corrida entre a checagem de `GERANDO` e a escrita do `INSERT`, dentro da mesma transação curta |

---

**Anterior:** [11-prisma-migracoes-seed.md](11-prisma-migracoes-seed.md) · **Próximo:** [13-decisoes-riscos-proxima-etapa.md](13-decisoes-riscos-proxima-etapa.md)
