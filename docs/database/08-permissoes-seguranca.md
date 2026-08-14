# 08 — Perfis, Permissões e Segurança dos Dados

---

## 8.1 Reconciliação de perfis

Este prompt lista cinco perfis para a Fase 1: Administrador, Sócio, Advogado,
Assistente, Estagiário. A arquitetura oficial em
[../08-especificacao-modulos.md §8.9](../08-especificacao-modulos.md) já define
sete papéis, incluindo `OWNER` (dono do escritório, bootstrap) e `CLIENTE`
(Fase 3). Não é conflito de fundo — é diferença de nível de detalhe:

- **`CLIENTE`** permanece corretamente fora da Fase 1 (Portal do Cliente é
  Fase 3) — nenhuma ação necessária.
- **`OWNER`** é **mantido como papel distinto de `ADMIN`**, apesar de omitido
  nesta lista, porque [../06-modelo-dominio.md §6.3](../06-modelo-dominio.md)
  registra um invariante estrutural que depende dele existir: *todo escritório
  tem sempre ≥1 membro `OWNER` ativo*. Sem um papel que carregue essa
  responsabilidade de forma exclusiva (faturamento, encerramento de
  escritório, transferência de titularidade), o invariante não tem onde se
  apoiar. `ADMIN` continua administrando usuários/permissões/auditoria; `OWNER`
  é o único que encerra o escritório ou transfere titularidade.

A matriz abaixo cobre os **seis** papéis ativos na Fase 1: `OWNER`, `ADMIN`,
`SOCIO`, `ADVOGADO`, `ASSISTENTE`, `ESTAGIARIO`.

## 8.2 Modelo de autorização: RBAC com regras contextuais

Comparação solicitada:

| Modelo | O que resolve bem | O que não resolve |
|---|---|---|
| **RBAC puro** | Ações amplas por papel (quem pode criar processo) | Não expressa "só os processos deste responsável" ou "segredo de justiça" sem papéis explosivos por combinação |
| **ABAC puro** | Regras baseadas em qualquer atributo do recurso/contexto | Overhead de motor de regras (ex.: OPA/Cedar) desproporcional para o volume de regras real da Fase 1; mais difícil de auditar visualmente no admin |
| **RBAC + regras contextuais** ✅ | Papel resolve a ação; um pequeno conjunto de atributos do recurso (responsável, equipe, segredo de justiça, confidencialidade) refina o escopo | Exige que o catálogo de atributos contextuais permaneça pequeno e estável — se crescer sem controle, aproxima-se de ABAC completo |

**Escolha:** RBAC com regras contextuais — reafirma
[../05-arquitetura-backend.md §5.6](../05-arquitetura-backend.md). Papel
resolve **a ação** (`case:read`); o `escopo` da permissão (`ALL`\|`TEAM`\|
`ASSIGNED`\|`OWN`) e os atributos do recurso (`segredoJustica`,
`confidencialidade`) resolvem **o registro específico** — exatamente as duas
etapas de verificação já descritas em
[01-estrategia-multitenancy.md §1.6](01-estrategia-multitenancy.md) item 3.

## 8.3 Matriz de permissões — Fase 1

| Permissão | OWNER | ADMIN | SOCIO | ADVOGADO | ASSISTENTE | ESTAGIARIO |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Visualizar escritório | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Alterar escritório | ✓ | ✓ | — | — | — | — |
| Convidar usuários | ✓ | ✓ | ✓ | — | — | — |
| Remover usuários | ✓ | ✓ | — | — | — | — |
| Alterar funções (papel) | ✓ | ✓ | — | — | — | — |
| Visualizar clientes | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (atribuídos) |
| Criar clientes | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Editar clientes | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Excluir clientes | ✓ | ✓ | ✓ | — | — | — |
| Visualizar todos os processos | ✓ | ✓ | ✓ | — | ✓ | — |
| Visualizar apenas processos atribuídos | — | — | — | ✓ | — | ✓ |
| Criar processos | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Editar processos | ✓ | ✓ | ✓ | ✓ (seus/equipe) | ✓ (campos básicos) | — |
| Excluir processos | ✓ | ✓ | ✓ | — | — | — |
| Gerenciar equipe do processo | ✓ | ✓ | ✓ | ✓ (seus) | — | — |
| Acessar processos confidenciais/segredo de justiça | ✓ | — | ✓ | ✓ (se responsável/equipe) | — | — |
| Visualizar documentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (atribuídos) |
| Enviar documentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Baixar documentos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (seus) |
| Excluir documentos | ✓ | ✓ | ✓ | ✓ (seus) | — | — |
| Gerar resumo por IA | ✓ | — | ✓ | ✓ | — | ✓ |
| Visualizar custos da IA | ✓ | ✓ | ✓ | — | — | — |
| Gerenciar notificações (próprias) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Consultar auditoria | ✓ | ✓ | ✓ (limitado ao próprio escritório) | — | — | — |

**Por que `ADMIN` não tem `ai:read-cost` implícito por padrão em algumas
leituras sensíveis nem `case:read:confidential`:** administrar o sistema
(usuários, permissões, configuração) é um poder operacional; ler conteúdo sob
segredo de justiça é um poder de acesso a conteúdo. Mantê-los separados reduz a
superfície de risco — reafirma a nota já registrada em
[../08-especificacao-modulos.md §8.9](../08-especificacao-modulos.md).

## 8.4 Segurança dos dados

| Item | Tratamento |
|---|---|
| Hash de senha | Argon2id (`memoryCost` 19 MiB, `timeCost` 2, `parallelism` 1) — reafirma [../05-arquitetura-backend.md §5.5](../05-arquitetura-backend.md) |
| Hash de refresh token | SHA-256 — nunca o token em claro persistido (§3.3) |
| Tokens OAuth (access/refresh externo) | AES-256-GCM em coluna, chave em KMS com rotação anual — nunca em texto claro mesmo com disco criptografado (defesa em profundidade) |
| CPF / CNPJ | Sem máscara armazenada; nunca em URL ou log; mascarado na exibição (`***.***.**` exceto responsável autorizado); considerar criptografia de coluna se auditoria/pentest indicar necessidade — pendência registrada em [13](13-decisoes-riscos-proxima-etapa.md) |
| Dados confidenciais / segredo de justiça | Resolvidos na autorização de recurso, nunca por ocultação apenas na UI (§4.2.5 em [04](04-entidades-clientes-processos.md)) |
| Storage privado | Bucket sem acesso público em nenhuma hipótese; `storageKey` nunca exposta ao cliente |
| URLs temporárias | Pré-assinadas, TTL de 5 minutos, uma finalidade (download específico) |
| Autorização por recurso | Guard (ação) + use case (registro), sempre as duas — nunca uma sozinha |
| Prevenção de IDOR | Busca sempre por `(id, escritorioId)` composto; nunca `id` isolado (§1.6 em [01](01-estrategia-multitenancy.md)) |
| Prevenção de mass assignment | DTOs de entrada explícitos por endpoint (Zod `.pick`/`.strict()`); nunca `Object.assign(entity, req.body)` — campos como `escritorioId`, `papelId`, `versao` nunca aceitos de fora do que o use case permite |
| SQL injection | Eliminado estruturalmente pelo Prisma (queries parametrizadas); `$queryRaw` só com `Prisma.sql` tagged template, nunca concatenação de string — regra de lint dedicada |
| Validação | Zod em toda entrada (body, query, params, headers), na borda da API |
| Rate limiting | Por tenant, por usuário e por IP, com foco redobrado em login e recuperação de senha |
| Trilha de auditoria | Ver [06](06-entidades-ia-notificacoes-auditoria.md) §6.6 |
| Segregação por escritório | Três camadas — guard, extensão Prisma, RLS (§1) |
| Backups | Diário + PITR; teste de restauração trimestral documentado |
| Recuperação | RPO 1h / RTO 4h — ver [13](13-decisoes-riscos-proxima-etapa.md) §13.1 |
| Anonimização | Ver [03](03-entidades-identidade-escritorios.md) §3.1.2 e [10](10-soft-delete-retencao-lgpd.md) |
| Exportação de dados | Job assíncrono, link com TTL, sem PII de terceiros indevida no pacote (ver [10](10-soft-delete-retencao-lgpd.md) §10.9) |

## 8.5 Papéis de banco (recapitulando §1.7 sob a ótica de segurança)

| Role | Uso | RLS | Privilégios |
|---|---|---|---|
| `app_runtime` | API em produção | Sujeita, `FORCE ROW LEVEL SECURITY` | CRUD conforme tabela; sem `UPDATE`/`DELETE` em `log_auditoria`, `versoes_documento` |
| `app_migration` | Prisma Migrate / seed em pipeline controlado | `BYPASSRLS` | DDL completo — nunca usada por request de usuário |
| `app_readonly` | BI/relatórios futuros | Sujeita | Apenas `SELECT` |

## 8.6 Proteção de segredo de MFA e criptografia em coluna

`Usuario.mfaSegredo` é armazenado com AES-256-GCM, chave por ambiente gerida em
KMS (não a mesma chave de criptografia de disco do provedor de nuvem — chave
de aplicação própria, para que um vazamento de snapshot de disco sozinho não
exponha segredos de MFA). Mesma abordagem para `accessTokenCriptografado`/
`refreshTokenCriptografado` de `UserIdentity`.

---

**Anterior:** [07-relacionamentos-diagrama-er.md](07-relacionamentos-diagrama-er.md) · **Próximo:** [09-indices-busca-performance.md](09-indices-busca-performance.md)
