# 10 — Soft Delete, Retenção, Auditoria vs. Histórico e LGPD

---

## 10.1 Entidades com soft delete

| Entidade | Campo | Motivo |
|---|---|---|
| `Usuario` | `excluidoEm` (+ anonimização) | Autoria de atos e comentários deve permanecer íntegra |
| `Escritorio` | `excluidoEm` | Encerramento contratual — retenção legal antes de expurgo |
| `Membro` | via `status = INATIVO` + `desativadoEm` | Preserva histórico de autoria e auditoria |
| `Cliente` | `excluidoEm` | Pode ter processos associados |
| `Processo` | `excluidoEm` | Valor jurídico e probatório — nunca some silenciosamente |
| `ParteProcesso` | `excluidoEm` | Pode ter sido citada em andamento já registrado |
| `Pasta` | `excluidoEm` | Pode conter documentos |
| `Documento` | `excluidoEm` (+ lixeira de 30 dias) | Valor probatório; erro humano deve ser recuperável |
| `Comentario` | `excluidoEm` | Preserva a thread para quem já leu/respondeu |
| `Tag` | `excluidoEm` | Preserva associações históricas |
| `EventoTimeline` | `excluidoEm` (restrito a eventos manuais) | Eventos de sistema não são excluíveis, ver [05](05-entidades-documentos-colaboracao.md) §5.1 |
| `Convite` | não usa soft delete — usa `status = REVOGADO` | É um registro de processo, não um dado de valor duradouro |

## 10.2 Entidades que podem ser excluídas fisicamente

| Entidade | Quando | Por quê é seguro |
|---|---|---|
| `Sessao` | Expurgo automático 90 dias após expiração/revogação | Sem valor probatório após a janela de investigação de segurança |
| `UserIdentity` | Ao desvincular provedor (se resta outro método de login) | Credencial, não dado de negócio |
| `PreferenciaNotificacao` | Livremente | Configuração, sem valor histórico |
| `PermissaoUsuario` (override) | Ao revogar | O efeito histórico já está em `LogAuditoria` |
| `VersaoDocumento` (arquivo físico no storage, não a linha) | 30 dias após soft delete do `Documento` pai, **exceto se citada em `FonteIA` de resumo vigente** (ver [06](06-entidades-ia-notificacoes-auditoria.md) §6.2) | Linha permanece para rastreabilidade mesmo após o binário ser expurgado do storage — `storageKey` passa a apontar para nada, sinalizado por `statusUpload = FALHA` retroativo com motivo `EXPURGADO` |

## 10.3 Quem pode restaurar

Restauração de item na lixeira exige a mesma permissão de exclusão do recurso
(`document:delete` restaura documento, `case:delete` restaura processo) — quem
pode apagar pode desfazer. Restauração é sempre auditada como ação própria
(`document.restore`), não como um "desfazer" silencioso da exclusão anterior.

## 10.4 Prazo de retenção

| Dado | Retenção ativa | Depois |
|---|---|---|
| Documentos e processos | Enquanto o contrato do escritório estiver ativo | Retenção pós-encerramento conforme contrato (mínimo sugerido: 5 anos, alinhado a prazo prescricional comum — **hipótese técnica, não parecer jurídico**, deve ser revisada por profissional do direito) |
| `LogAuditoria` | 12 meses "quente" (partição ativa, consulta rápida) | 5 anos "frio" (partição arquivada) — depois, expurgo |
| `Sessao` | Até 90 dias após expirar/revogar | Expurgo físico |
| Notificações | 90 dias | Arquivamento automático (`arquivadaEm`), depois expurgo |
| Convites | 30 dias após expirar/ser aceito | Expurgo físico (sem valor após resolvido) |
| Lixeira (soft delete de Documento/Processo/Cliente) | 30 dias | Documento: expurgo físico do storage; Processo/Cliente: retenção segue a mesma política de "documentos e processos" acima — soft delete não é o mesmo que o prazo final de retenção jurídica |

## 10.5 Tratamento de documentos

Soft delete → lixeira de 30 dias, visível e restaurável na UI → expurgo físico
do storage por job, **exceto** se citado em `FonteIA` de resumo `vigente = true`
(adiamento sinalizado para revisão manual, ver §10.2). O registro de metadados
(`Documento`) pode persistir além do expurgo do binário, com `statusUpload`
indicando indisponibilidade — a linha nunca desaparece completamente, pois
`EventoTimeline`, `Comentario` e `FonteIA` podem referenciá-la.

## 10.6 Tratamento de auditoria

`LogAuditoria` nunca é soft-deletada nem restaurável — é append-only por
definição (§6.6 em [06](06-entidades-ia-notificacoes-auditoria.md)). "Exclusão"
não existe como conceito para esta tabela; o que existe é expurgo por política
de retenção após 5 anos, executado por job administrativo com aprovação
registrada (o próprio expurgo gera uma entrada de auditoria... em um log
separado de nível de plataforma, já que a tabela que seria referenciada está
sendo removida).

## 10.7 Comportamento de relacionamentos sob soft delete

- Soft delete **não** dispara cascata automática sobre entidades filhas por
  padrão — ver matriz de `ON DELETE` em
  [07-relacionamentos-diagrama-er.md §7.3](07-relacionamentos-diagrama-er.md),
  que trata de exclusão **física**; soft delete é uma marca de coluna, não uma
  operação de FK, então cada caso decide explicitamente:
  - Excluir `Processo` → documentos e comentários **permanecem visíveis e
    intactos** (ficam acessíveis por busca direta, mas o processo pai aparece
    como "arquivado/excluído" no breadcrumb).
  - Excluir `Pasta` com documentos dentro → bloqueado até confirmação
    explícita de exclusão em cascata **lógica** (marca pasta e documentos
    filhos juntos, na mesma transação, todos recuperáveis juntos).
  - Excluir `Cliente` com processos ativos → bloqueado (constraint `RESTRICT`
    física reforça; a aplicação nem chega a tentar).

## 10.8 Impacto em índices únicos

Toda constraint única que convive com soft delete é **parcial**
(`WHERE excluido_em IS NULL`) — ver §2.6 e §4.1 em
[02-convencoes-dados.md](02-convencoes-dados.md) e
[04-entidades-clientes-processos.md](04-entidades-clientes-processos.md). Sem
isso, um CPF de cliente excluído impediria para sempre o recadastro do mesmo
CPF — comportamento incorreto e frustrante para o usuário.

## 10.9 Filtros obrigatórios

Toda leitura de domínio filtra `excluido_em IS NULL` por padrão, aplicado pela
mesma Prisma Client Extension do isolamento de tenant (§1.4 em
[01-estrategia-multitenancy.md](01-estrategia-multitenancy.md)) — um segundo
`allOperations` hook, não uma responsabilidade manual de cada repositório. A
lixeira é a **única** tela que passa explicitamente `incluirExcluidos: true`
como opção deliberada da query, nunca o padrão implícito.

## 10.10 Auditoria técnica vs. histórico funcional vs. observabilidade

| Camada | O que registra | Onde vive | Público |
|---|---|---|---|
| **Auditoria técnica** | Quem fez o quê, quando, resultado (sucesso/negado) | `LogAuditoria` (Postgres, append-only) | Compliance, administrador, resposta a incidente |
| **Histórico funcional** | O que aconteceu no caso (andamento, documento, decisão) | `EventoTimeline` (Postgres) | Usuário final — é produto |
| **Logs de aplicação** | Erros, requests, performance, stack traces | Ferramenta de observabilidade (não Postgres) | Engenharia |
| **Logs de segurança** (infraestrutura) | Tentativas de acesso à infraestrutura, WAF, rede | Ferramenta de observabilidade/SIEM | Segurança/infra |

**O que fica só em observabilidade, nunca em tabela de domínio:** stack trace de
erro, latência por request, métricas de sistema, log de acesso de
infraestrutura (nginx/load balancer). Esses dados não têm valor de negócio
duradouro nem requisito de imutabilidade jurídica — retenção curta (30–90 dias)
é suficiente e persistir no Postgres transacional seria desperdício de recurso
que o próprio banco de domínio precisa para servir o produto.

## 10.11 Encerramento de escritório e exclusão de conta

- **Exclusão de conta de usuário:** anonimização, nunca `DELETE` físico — ver
  [03](03-entidades-identidade-escritorios.md) §3.1.2. Um `Usuario` anonimizado
  permanece referenciável por FK em qualquer autoria histórica.
- **Encerramento de escritório:** marca `Escritorio.excluidoEm` e
  `status = CANCELADO`; todas as sessões de todos os membros são revogadas
  imediatamente; dados permanecem retidos pelo prazo contratual/legal (§10.4)
  antes de expurgo físico completo — decisão de produto que exige confirmação
  explícita do `OWNER` e, dado o impacto, dupla confirmação (digitar o nome do
  escritório), mesmo padrão de ação destrutiva do design system
  ([../07-design-system.md §7.8](../07-design-system.md), `ConfirmDialog`
  variante perigosa).

---

## 10.12 LGPD — diretrizes técnicas (não é parecer jurídico)

> **As definições abaixo são diretrizes técnicas de engenharia de dados,** não
> parecer jurídico. Devem ser revisadas por profissional do Direito
> especializado em proteção de dados antes de qualquer publicação contratual
> (Política de Privacidade, DPA). Reafirma e detalha
> [../09-seguranca-lgpd.md §9.5](../09-seguranca-lgpd.md).

| Elemento | Definição técnica adotada |
|---|---|
| **Controlador** | O escritório de advocacia (tenant), para os dados de seus clientes e das partes dos processos |
| **Operador** | Quilombo Dev (a plataforma), que processa em nome do controlador |
| **Titular** | Cliente do escritório, parte processual, membro do escritório (para seus próprios dados de conta) |
| **Finalidade** | Registrada por tipo de dado em [../09-seguranca-lgpd.md §9.5](../09-seguranca-lgpd.md) |
| **Base legal** | Execução de contrato (dados de conta/cliente), exercício regular de direito em processo (documentos processuais), cumprimento de obrigação legal (auditoria) |
| **Minimização** | Nenhum campo sem finalidade declarada; `camposCustomizados`/JSONB não são "gaveta" sem governança de schema por área (§4.2 em [04](04-entidades-clientes-processos.md)) |
| **Retenção** | Ver §10.4 |
| **Portabilidade** | Exportação em JSON + arquivos originais, job assíncrono (ver §10.9 abaixo) |
| **Correção** | Usuário corrige o próprio perfil; dado de cliente é corrigido pelo escritório (controlador), não diretamente pelo titular na Fase 1 |
| **Anonimização** | Ver §10.11 — aplica-se a `Usuario`; para `Cliente`/`ParteProcesso`, anonimização mediante solicitação é possível apenas quando não há obrigação legal de retenção do dado em curso (ex.: processo ativo que cita a parte) |
| **Consentimento** | Não é a base legal dominante neste produto (a maior parte do tratamento é execução de contrato/obrigação legal); onde consentimento for a base (ex.: comunicação de marketing futura), registrar `consentimentoConcedidoEm`/`revogadoEm` em tabela própria — não modelada nesta fase por não haver funcionalidade que a exija ainda |
| **Logs de solicitação de titular** | Toda solicitação de exportação/correção/anonimização gera `LogAuditoria` com `acao = 'lgpd.request.*'` — nunca tratada informalmente por e-mail sem rastro |
| **Documentos jurídicos com dados de terceiros** | Documento de um processo frequentemente contém dados pessoais de partes que não são "titular" da conta (réu, testemunha) — direito de exclusão dessas pessoas é limitado pela obrigação legal de manutenção de prova processual (LGPD art. 16, I) — **hipótese técnica**, confirmar com jurídico |
| **Limites do direito de exclusão** | Auditoria e autoria de atos processuais nunca são apagadas, mesmo sob solicitação — modelado estruturalmente (anonimização, não remoção) |
| **Política de backup** | Backup também está sujeito à mesma política de retenção — expurgo de dado do titular deve alcançar backups dentro do ciclo de retenção do backup (documentar prazo de expiração de snapshot como parte do compliance, não deixar como detalhe puramente operacional) |
| **Resposta a incidente** | Runbook já referenciado em [../09-seguranca-lgpd.md §9.5](../09-seguranca-lgpd.md); a modelagem contribui com `LogAuditoria` e `correlationId` como insumo primário de investigação |

### 10.12.1 Exportação de dados (portabilidade)

Job assíncrono por solicitação: coleta dados do `Usuario` solicitante (perfil,
preferências) **e**, se aplicável ao papel, referências de autoria (comentários
próprios, uploads próprios) — nunca inclui dado de **outro** titular presente no
mesmo processo (ex.: exportação de um advogado não inclui CPF de clientes de
outros advogados do escritório) — o escopo da exportação é sempre "meus dados
pessoais", não "todos os dados que toquei", para não transformar o direito de
portabilidade individual em vazamento indireto de dado de terceiro.

---

**Anterior:** [09-indices-busca-performance.md](09-indices-busca-performance.md) · **Próximo:** [11-prisma-migracoes-seed.md](11-prisma-migracoes-seed.md)
