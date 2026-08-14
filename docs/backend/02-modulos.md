# 02 — Módulos

> Granularidade de módulo NestJS **um pouco mais fina** que os módulos de
> domínio de [../database/00-resumo-modelagem.md §0.4](../database/00-resumo-modelagem.md)
> (`LegalCases` inclui Prazo no domínio; aqui `Deadlines` é módulo NestJS
> próprio). Não é conflito — ver justificativa e registro formal em
> [13-decisoes.md §13.1](13-decisoes.md).

Para cada módulo: finalidade, o que contém, dependências permitidas/proibidas,
eventos publicados/consumidos.

---

## 2.1 Identity

**Finalidade:** autenticação — usuário global, identidades OAuth, sessões.
**Contém:** `Usuario`, `UserIdentity`, `Sessao` (repositórios, use cases de
login/logout/refresh/MFA). **Dependências permitidas:** `Shared` (mail, para
e-mail de verificação/recuperação), `Common` (guards/strategies).
**Proibido:** importar `Office`/`Membership` diretamente — Identity não sabe
o que é um escritório; a ligação usuário↔escritório é responsabilidade de
`Membership`. **Eventos publicados:** `UserRegistered`, `PasswordChanged`,
`SessionRevoked`. **Consome:** nenhum.

## 2.2 Office

**Finalidade:** o tenant — dados do escritório, configurações, encerramento.
**Contém:** `Escritorio`. **Dependências:** `Shared`. **Proibido:** depender
de `Membership`, `Clients`, `LegalCases` (a seta é sempre de fora para
dentro — módulos de conteúdo dependem de `Office` para saber "qual tenant",
nunca o contrário). **Eventos publicados:** `OfficeCreated`, `OfficeSuspended`.

## 2.3 Membership

**Finalidade:** vínculo usuário↔escritório — `Membro`, `Convite`, `Papel`,
`Permissao`, `PermissaoUsuario`, `Equipe`. **Dependências:** `Identity`,
`Office`, `Shared` (mail, para convite). **Consumido por:** todos os módulos
de conteúdo (`Clients`, `LegalCases`, `Documents`, ...) — todos referenciam
`Membro.id` como autoria/responsabilidade, nunca `Usuario.id` diretamente
(reafirma [../database/01-estrategia-multitenancy.md §1.8](../database/01-estrategia-multitenancy.md)).
**Eventos publicados:** `UserInvited`, `InvitationAccepted`,
`MemberRoleChanged`, `MemberRemoved`. **Consome:** `UserRegistered` (de
Identity, para completar convite pendente do mesmo e-mail, se houver).

## 2.4 Users

**Finalidade:** perfil pessoal (dados, foto, preferências) — distinto de
Identity (autenticação) e de Membership (vínculo), reafirma
[../api/07-users.md](../api/07-users.md). **Contém:** casos de uso sobre
`Usuario` que não são de autenticação (`AtualizarPerfil`,
`AtualizarPreferencias`, `SolicitarExportacaoDados`).
**Dependências:** `Identity` (mesmo agregado `Usuario`), `Shared`.

## 2.5 Clients

**Finalidade:** `Cliente`. **Dependências:** `Membership` (responsável
interno), `Shared`, `Tags` (associação). **Consumido por:** `LegalCases`
(processo referencia cliente). **Eventos publicados:** `ClientCreated`.

## 2.6 LegalCases ⭐

**Finalidade:** núcleo jurídico — `Processo` (DDD completo), `ParteProcesso`,
`ProcessoMembro`, `ProcessoRelacionado`. **Dependências:** `Clients`,
`Membership`, `Shared`, `Tags`. **Consumido por:** `Documents`, `Timeline`,
`Comments`, `Deadlines`, `AI` (todos referenciam `processoId`).
**Eventos publicados:** `ProcessoCriado`, `ProcessoAtualizado`,
`ProcessoStatusAlterado`, `ProcessoMembroAtribuido`. **Consome:**
`PrazoConcluido`/`PrazoCancelado` (de `Deadlines`, para atualizar
`proximaDataRelevante` denormalizado).

## 2.7 Timeline

**Finalidade:** `EventoTimeline` — projeção de leitura cronológica.
**Dependências:** `LegalCases` (FK), `Shared`. **Consome eventos de quase
todo módulo** (`ProcessoCriado`, `DocumentoEnviado`, `ComentarioCriado`,
`PrazoCriado/Concluido/Cancelado`, `ResumoIaConcluido`) para inserir a
entrada correspondente — é o único módulo que **depende estruturalmente**
de consumir eventos de outros como parte central de sua função (reafirma
resolução do conflito Prazo×Timeline em
[../database/04-entidades-clientes-processos.md §4.6](../database/04-entidades-clientes-processos.md)).
**Nunca é dependência de nenhum outro módulo** — é fim de linha, como
`Audit`.

## 2.8 Deadlines

**Finalidade:** `Prazo` — módulo NestJS próprio (distinto do módulo de
domínio `LegalCases` que o contém conceitualmente), pela mesma razão que
justifica a entidade dedicada: sustentar a consulta agregada "Prazos
Críticos" do Dashboard sem acoplar o controller de `LegalCases`.
**Dependências:** `LegalCases` (FK composta), `Membership`, `Shared`.
**Eventos publicados:** `PrazoCriado`, `PrazoConcluido`, `PrazoCancelado` —
consumidos por `Timeline` (projeção) e `Notifications` (lembretes D-7/D-3/
D-1/D-0).

## 2.9 Documents

**Finalidade:** `Documento`, `VersaoDocumento` (DDD parcial). **Dependências:**
`LegalCases`, `Clients`, `Folders`, `Membership`, `Shared` (storage), `Tags`.
**Eventos publicados:** `DocumentoEnviado`, `DocumentoProcessado`,
`DocumentoExcluido`. **Consome:** nenhum evento de outro módulo — apenas
dispara jobs de processamento próprios (fila `documents`, ver
[09-filas.md](09-filas.md)).

## 2.10 Folders

**Finalidade:** `Pasta` — módulo NestJS próprio (distinto de `Documents` na
granularidade de código, mesma razão de `Deadlines`: rotas e regras de
hierarquia/ciclo próprias, embora o domínio trate como parte do módulo de
conteúdo de documentos). **Dependências:** `LegalCases` (FK opcional),
`Shared`. **Consumido por:** `Documents` (todo documento referencia
`pastaId` opcional).

## 2.11 Comments

**Finalidade:** `Comentario`. **Dependências:** `LegalCases`, `Documents`,
`Timeline`, `Membership`, `Shared`. **Eventos publicados:**
`ComentarioCriado` (consumido por `Notifications` para @menção e por
`Timeline` para projeção).

## 2.12 Tags

**Finalidade:** `Tag` + tabelas associativas. **Dependências:** `Shared`
apenas — módulo deliberadamente "burro" (CRUD simples), consumido por
`Clients`, `LegalCases`, `Documents` via associação, nunca o contrário.

## 2.13 Search

**Finalidade:** índice e busca híbrida (FTS + trigram). **Dependências:**
lê de `LegalCases`, `Clients`, `Documents`, `Tags`, `Comments` (leitura
direta via repositório de projeção, não acoplamento de domínio — é
infraestrutura de leitura, reafirma
[../05-arquitetura-backend.md §5.1](../05-arquitetura-backend.md), Search
tratado como "serviço de infraestrutura"). **Consome eventos** de todos os
módulos de conteúdo para reindexação incremental (job assíncrono, fila
`search`).

## 2.14 AI

**Finalidade:** `ResumoIA`, `FonteIA` — orquestração de IA. **Dependências:**
`LegalCases`, `Documents`, `Timeline` (fonte de contexto/RAG), `Shared`
(adapter de provedor de IA), `Office` (checagem de cota). **Eventos
publicados:** `ResumoIaSolicitado`, `ResumoIaConcluido`, `ResumoIaFalhou`.

## 2.15 Notifications

**Finalidade:** `Notificacao`, `PreferenciaNotificacao` — CRUD simples +
motor de regras de entrega. **Dependências:** `Membership` (destinatário),
`Shared` (mail). **Consome eventos de praticamente todo módulo** (é, com
`Timeline`, o outro grande consumidor transversal de eventos) — nunca
publica evento consumido por módulo de domínio (fim de linha, como `Audit`).

## 2.16 Audit

**Finalidade:** `LogAuditoria` — trilha append-only. **Dependências:**
nenhuma de domínio — recebe chamada do `AuditInterceptor` (camada de
apresentação, `common/interceptors/audit.interceptor.ts`) e do decorator
`@Audit(...)`, nunca é importado por um use case de outro módulo
diretamente. **Fim de linha absoluto** — nada depende de `Audit` e `Audit`
não depende de nada além de `Shared`.

## 2.17 Shared — inclui a resolução da pendência de e-mail

**Finalidade:** infraestrutura transversal sem regra de negócio própria —
banco (extensões Prisma), cache, fila (base de processors), storage, IA
(adapter), **e-mail transacional**, telemetria.

### Provedor de E-mail Transacional (pendência resolvida)

> Fecha a pendência registrada em
> [../api/22-decisoes.md §22.5](../api/22-decisoes.md).

**Abstração — port/adapter, independente de fornecedor**, mesmo padrão já
aplicado ao provedor de IA em
[../05-arquitetura-backend.md §5.10](../05-arquitetura-backend.md):

```
shared/infrastructure/mail/
├── mail.port.ts              # interface — o único contrato que o resto do código conhece
├── mail.module.ts            # registra o adapter configurado via env
├── templates/                # templates de e-mail (verificação, convite, recuperação, alerta de segurança)
└── adapters/
    ├── sendgrid.adapter.ts
    ├── ses.adapter.ts
    └── smtp.adapter.ts        # fallback genérico / desenvolvimento local
```

**Interface (`MailPort`):**
```
interface MailPort {
  send(message: { to: string; template: MailTemplate; variables: Record<string, unknown> }): Promise<void>;
}
```
Nenhum use case (`RegistrarUsuario`, `ConvidarMembro`,
`SolicitarRecuperacaoSenha`) conhece o fornecedor — todos dependem apenas de
`MailPort`, injetado pelo `MailModule`. **Nenhuma regra de negócio é
acoplada ao fornecedor:** decisão de "quando enviar e-mail" e "qual
template" pertence inteiramente à camada de aplicação de cada módulo
(`Identity`, `Membership`, `Notifications`); o adapter só sabe "como entregar
uma mensagem já composta".

**Adapters definidos:**

| Adapter | Quando usar |
|---|---|
| `SmtpAdapter` | Desenvolvimento local e ambiente de teste (aponta para Mailhog/Mailpit no Docker Compose, ver [12-docker.md](12-docker.md)) |
| `SesAdapter` | Produção, se a infraestrutura já for AWS (reaproveita IAM, sem credencial extra) |
| `SendgridAdapter` | Produção, alternativa independente de nuvem específica |

**Escolha inicial configurável por ambiente:** variável `MAIL_PROVIDER`
(`smtp`\|`ses`\|`sendgrid`), validada no `env.schema.ts` (Zod, falha o boot
se valor inválido ou credencial ausente para o provedor escolhido) —
reafirma [../05-arquitetura-backend.md §5.1](../05-arquitetura-backend.md)
("fail fast — configuração validada com Zod no boot"). **Recomendação para
o primeiro deploy:** `SesAdapter` se a infraestrutura escolhida em
[../10-roadmap-e-decisoes.md §10.1](../10-roadmap-e-decisoes.md) for AWS;
`SendgridAdapter` caso contrário — decisão final de infraestrutura (não de
arquitetura de código) cabe ao Prompt 5B/DevOps, a abstração já suporta
qualquer uma sem alterar um único use case.

**Retry e confiabilidade:** envio de e-mail passa pela fila `notifications`
(BullMQ, ver [09-filas.md](09-filas.md)) — nunca síncrono no request HTTP —
com retry e backoff exponencial padrão de toda fila desta arquitetura.

## 2.18 Common

**Finalidade:** transversal de **apresentação** (guards, strategies,
interceptors, filters, decorators, pipes, middlewares) — distinto de
`Shared`, que é transversal de **infraestrutura**. Não é um módulo NestJS
importável (a maioria de seu conteúdo é registrado globalmente em
`app.module.ts`), mas está documentado aqui por ser peça central da
arquitetura.

## 2.19 Health

**Finalidade:** `/health/live`, `/health/ready` — reafirma
[../05-arquitetura-backend.md §5.12](../05-arquitetura-backend.md). Verifica
Postgres, Redis, Storage. Sem dependência de nenhum módulo de domínio.

---

**Anterior:** [01-arquitetura.md](01-arquitetura.md) · **Próximo:** [03-camadas.md](03-camadas.md)
# Regra de integração com Pasta Jurídica

Sempre que um módulo que aparece dentro de Pasta Jurídica for desenvolvido, sua implementação deve utilizar a entidade principal daquele módulo como fonte da verdade e integrar imediatamente a visão contextual da Pasta, filtrando ou vinculando pelo relacionamento real. Não criar entidades, tabelas, use cases ou dados duplicados apenas para atender a página da Pasta.
### Pasta Jurídica como agregador

Toda funcionalidade acessada pela Pasta Jurídica reutiliza a entidade, o serviço, o Permission Engine, o Audit Engine e a fonte da verdade do módulo responsável. A Pasta apenas agrega e contextualiza Processos, Tarefas, Documentos, Capturas e futuros dados financeiros; implementações paralelas dentro de `legal-folders` não são permitidas.

Processos/Movimentações Extrajudiciais seguem esse padrão por meio de uma FK opcional do recurso global para `PastaJuridica`. Listar, criar, vincular e desvincular continuam operações do módulo `extrajudicial-movements`; a tela da Pasta apenas fixa `pastaJuridicaId` como contexto.
