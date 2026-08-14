# 03 — Catálogo de Entidades: Identidade e Escritórios

> Módulos `Identity`, `Offices`, `Memberships`. Convenções de [02-convencoes-dados.md](02-convencoes-dados.md)
> aplicam-se a todos os campos abaixo salvo exceção indicada.

---

## 3.1 Usuario

**Finalidade.** Identidade global da pessoa no sistema — não pertence a nenhum
escritório; um `Usuario` pode ter `Membro` em vários. Autentica por senha e/ou
provedor OAuth (Google, Microsoft).

| Campo | Tipo conceitual | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `nome` | Texto curto | ✓ | — | |
| `sobrenome` | Texto curto | ✓ | — | |
| `nomeExibicao` | Texto curto | — | `nome + ' ' + sobrenome` calculado na app | Permite apelido/nome social |
| `email` | Texto curto | ✓ | — | Normalizado, único global |
| `emailVerificadoEm` | Timestamptz | — | `null` | `null` = não verificado |
| `senhaHash` | Texto | — | `null` | `null` se autentica só por OAuth |
| `avatarUrl` | Texto (URL) | — | `null` | Referência a storage, não a imagem embutida |
| `telefone` | Texto (E.164) | — | `null` | |
| `idioma` | Texto curto | ✓ | `'pt-BR'` | |
| `fusoHorario` | Texto curto | ✓ | `'America/Sao_Paulo'` | IANA tz name |
| `tema` | Enum `TemaUsuario` | ✓ | `SISTEMA` | `CLARO`\|`ESCURO`\|`SISTEMA` |
| `status` | Enum `StatusUsuario` | ✓ | `PENDENTE` | `PENDENTE`\|`ATIVO`\|`INATIVO`\|`BLOQUEADO` |
| `mfaHabilitado` | Booleano | ✓ | `false` | |
| `mfaSegredo` | Texto (criptografado em coluna, não em repouso de disco genérico) | — | `null` | Ver [08](08-permissoes-seguranca.md) §8.6 |
| `ultimoAcessoEm` | Timestamptz | — | `null` | |
| `criadoEm` / `atualizadoEm` | Timestamptz | ✓ | `now()` | |
| `excluidoEm` | Timestamptz | — | `null` | Ver §3.1.2 (anonimização, não exclusão física) |

**Chave primária:** `id`. **Chaves estrangeiras:** nenhuma (raiz de agregado global).

**Índices:** `uq_usuarios_email` (único, parcial `WHERE excluido_em IS NULL`) ·
`idx_usuarios_status`.

**Restrições únicas:** `email` único entre usuários não excluídos (unicidade
parcial — ver §3.1.2 sobre reuso de e-mail após anonimização).

**Regras de integridade:**
- `senhaHash IS NOT NULL OR EXISTS (UserIdentity para este usuário)` — verificada
  na aplicação no momento de desabilitar o último método de login (não é uma
  `CHECK` de banco, pois depende de outra tabela).
- `status = BLOQUEADO` impede emissão de novo token, verificado no use case de
  login, não bloqueado por trigger (regra de negócio, não de integridade).

**Soft delete:** exclusão de conta é **anonimização**, não `DELETE`. Ver §3.1.2.

**Auditoria:** login, logout, falha de login, alteração de senha, ativação/
desativação de MFA, alteração de e-mail — todos geram `LogAuditoria` com
`atorId = próprio usuário`.

**Relacionamentos:** 1:N com `UserIdentity`, `Sessao`, `Membro`.

**Regras de acesso:** um usuário só lê/edita o próprio registro via `/v1/me/*`;
nenhum endpoint expõe listagem de `Usuario` fora do escopo de um escritório
(a listagem "usuários do escritório" é sobre `Membro`, nunca sobre `Usuario` cru).

**Riscos:** e-mail é PII e chave de correlação entre escritórios — vazamento de
tabela `usuarios` revela em quais organizações uma pessoa pode atuar (mitigar
com RLS não aplicável aqui, pois a tabela é global; mitigar com controle de
acesso administrativo e ausência de endpoint de busca cross-tenant por e-mail).

**Escalabilidade:** tabela cresce O(número de pessoas), não O(escritórios ×
pessoas) — baixo volume relativo; sem necessidade de particionamento.

### 3.1.2 Anonimização (LGPD)

Ao excluir conta: `nome`/`sobrenome` → `"Usuário removido"`, `email` →
`deleted+{id}@quilombo.invalid` (libera o e-mail original para reuso por outra
pessoa), `senhaHash`/`mfaSegredo`/`avatarUrl`/`telefone` → `null`,
`excluidoEm = now()`. Registros que referenciam `Usuario.id` (autoria de
comentário, andamento) **permanecem intactos** — a autoria por ID é preservada
para integridade probatória e de auditoria; apenas os dados pessoais são
descaracterizados. Detalhado em [10-soft-delete-retencao-lgpd.md](10-soft-delete-retencao-lgpd.md).

---

## 3.2 UserIdentity (Provedor de Autenticação)

**Finalidade.** Vínculo com credencial ou conta externa — permite login local
e/ou OAuth Google/Microsoft, N provedores por usuário.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `usuarioId` | UUID | ✓ | — | FK → `usuarios.id` |
| `provider` | Enum `ProvedorAuth` | ✓ | — | `LOCAL`\|`GOOGLE`\|`MICROSOFT`\|`SAML` |
| `providerAccountId` | Texto | ✓ (exceto `LOCAL`) | `null` | ID do usuário no provedor |
| `emailNoProvedor` | Texto | — | `null` | |
| `emailVerificadoNoProvedor` | Booleano | ✓ | `false` | Gate para auto-vínculo (§9.3 de [../09-seguranca-lgpd.md](../09-seguranca-lgpd.md)) |
| `accessTokenCriptografado` | `bytea` (AES-256-GCM) | — | `null` | Só quando o provedor exige chamadas subsequentes (não necessário no MVP de login) |
| `refreshTokenCriptografado` | `bytea` (AES-256-GCM) | — | `null` | Idem |
| `escopos` | `TEXT[]` | — | `[]` | Escopos OAuth concedidos |
| `expiraEm` | Timestamptz | — | `null` | Validade do token externo, se aplicável |
| `criadoEm` / `atualizadoEm` | Timestamptz | ✓ | `now()` | |

**FK:** `usuarioId → usuarios.id` (`ON DELETE CASCADE` — identidade não
sobrevive sem o usuário; mas exclusão real de `Usuario` não acontece, ver §3.1.2,
então na prática este `CASCADE` só age em limpeza administrativa excepcional).

**Índices:** `uq_user_identity_provider_account (provider, provider_account_id)` ·
`idx_user_identity_usuario`.

**Restrições únicas:** `(provider, providerAccountId)` — a mesma conta Google não
pode vincular a dois usuários Quilombo Dev.

**Regras de integridade:** vínculo automático a usuário existente só é permitido
se `emailVerificadoNoProvedor = true` **e** o e-mail do provedor confere com
`Usuario.email` já verificado — caso contrário, fluxo de solicitação de acesso
manual (ver [../05-arquitetura-backend.md §5.5](../05-arquitetura-backend.md)).

**Soft delete:** não se aplica — remoção de vínculo OAuth é `DELETE` físico
(não é dado com valor probatório; é apenas uma credencial), desde que reste ao
menos um método de autenticação ativo.

**Auditoria:** vínculo e desvínculo de provedor auditados.

**Riscos:** tokens de provedor são credencial de terceiro — criptografia em
coluna obrigatória (não apenas "disco criptografado"), chave gerenciada em KMS,
nunca logada.

---

## 3.3 Sessao

**Finalidade.** Sessão de autenticação ativa — base para revogação em tempo
real, MFA, "dispositivos conectados" e detecção de reuso de refresh token.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `usuarioId` | UUID | ✓ | — | FK → `usuarios.id` |
| `escritorioAtivoId` | UUID | ✓ | — | FK → `escritorios.id` — escritório selecionado nesta sessão |
| `familiaId` | UUID | ✓ | gerado no 1º login | Agrupa a cadeia de refresh tokens (detecção de reuso) |
| `refreshTokenHash` | Texto (SHA-256) | ✓ | — | Nunca o token em claro |
| `ip` | `inet` | — | `null` | |
| `userAgent` | Texto | — | `null` | |
| `dispositivo` | Texto | — | `null` | Derivado do user agent |
| `criadaEm` | Timestamptz | ✓ | `now()` | |
| `ultimoUsoEm` | Timestamptz | ✓ | `now()` | Atualizado a cada refresh |
| `expiraEm` | Timestamptz | ✓ | `now() + 7d` (30d com "lembrar de mim") | |
| `revogadaEm` | Timestamptz | — | `null` | |
| `motivoRevogacao` | Enum `MotivoRevogacaoSessao` | — | `null` | `LOGOUT`\|`TROCA_SENHA`\|`REUSO_DETECTADO`\|`ADMIN`\|`EXPIRACAO` |

**FK:** `usuarioId → usuarios.id` (`CASCADE`) · `escritorioAtivoId → escritorios.id`
(`RESTRICT` — não é possível excluir fisicamente um escritório com sessões
ativas; encerramento de escritório revoga sessões antes).

**Índices:** `idx_sessoes_usuario` · `idx_sessoes_familia` ·
`idx_sessoes_expiracao (expira_em) WHERE revogada_em IS NULL` (para job de limpeza).

**Regras de integridade:** refresh token reapresentado após uso → toda a
`familiaId` é revogada (`motivoRevogacao = REUSO_DETECTADO`) e alerta de
segurança é disparado — regra de aplicação, documentada aqui pois depende
inteiramente desta modelagem.

**Soft delete:** não se aplica — sessão expirada/revogada não é excluída
imediatamente; retida por 90 dias para auditoria de segurança, depois expurgada
por job (não tem valor jurídico de longo prazo como `LogAuditoria`).

**Auditoria:** criação e revogação de sessão auditadas; conteúdo do token nunca
aparece em log.

**Riscos:** `escritorioAtivoId` errado após troca de escritório sem invalidar a
sessão anterior corretamente é o principal vetor de "vejo dado do escritório
errado" — mitigado pelo fluxo do §1.9 de [01-estrategia-multitenancy.md](01-estrategia-multitenancy.md).

---

## 3.4 Escritorio

**Finalidade.** Organização jurídica cliente do SaaS — o tenant.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `razaoSocial` | Texto | — | `null` | Obrigatório se `cnpj` presente |
| `nomeFantasia` | Texto | ✓ | — | |
| `slug` | Texto curto | ✓ | gerado a partir do nome, ajustável | Único global, usado em URL/onboarding |
| `cnpj` | Texto (14 dígitos) | — | `null` | |
| `email` | Texto | ✓ | — | E-mail de contato do escritório |
| `telefone` | Texto (E.164) | — | `null` | |
| `endereco_*` | Ver [02](02-convencoes-dados.md) §2.13 | — | `null` | |
| `fusoHorario` | Texto | ✓ | `'America/Sao_Paulo'` | |
| `idioma` | Texto | ✓ | `'pt-BR'` | |
| `status` | Enum `StatusEscritorio` | ✓ | `TRIAL` | `TRIAL`\|`ATIVO`\|`SUSPENSO`\|`CANCELADO` |
| `plano` | Enum `PlanoEscritorio` | ✓ | `TRIAL` | Preparação para faturamento futuro — ver [../10-roadmap-e-decisoes.md](../10-roadmap-e-decisoes.md) |
| `configuracoes` | JSONB | ✓ | `{}` | MFA obrigatório, domínios de SSO, retenção customizada |
| `criadoEm` / `atualizadoEm` | Timestamptz | ✓ | `now()` | |
| `excluidoEm` | Timestamptz | — | `null` | Encerramento de escritório — ver [10](10-soft-delete-retencao-lgpd.md) §10.11 |

**Chave primária:** `id`. **Sem FK** — raiz de agregado, é a própria unidade de
tenant.

**Índices:** `uq_escritorios_slug` · `uq_escritorios_cnpj` (parcial,
`WHERE cnpj IS NOT NULL AND excluido_em IS NULL`) · `idx_escritorios_status`.

**Regras de integridade:** sempre existe ao menos um `Membro` com papel `OWNER`
e `status = ATIVO` para o escritório (verificado na aplicação a cada
desativação/remoção de membro, não é `CHECK` de banco — invariante
multi-tabela).

**Soft delete:** `excluido_em` = encerramento contratual do escritório;
diferente de `status = CANCELADO` (que é reversível/comercial). Exclusão real
segue política de retenção contratual, nunca imediata.

**Riscos:** é o nó central de isolamento — qualquer bug que permita alterar
`escritorio_id` de um registro após criado é equivalente a mover dado entre
tenants. Mitigação: coluna `escritorio_id` **imutável** após `INSERT` (sem
`UPDATE` permitido na aplicação; reforçável com trigger que rejeita mudança).

---

## 3.5 Membro (Vínculo Usuário × Escritório)

**Finalidade.** Representa a participação de um `Usuario` em um `Escritorio` —
é sobre este registro, não sobre `Usuario`, que toda autorização é resolvida.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `usuarioId` | UUID | ✓ | — | FK → `usuarios.id` |
| `escritorioId` | UUID | ✓ | — | FK → `escritorios.id` |
| `papelId` | UUID | ✓ | — | FK → `papeis.id` |
| `equipeId` | UUID | — | `null` | FK → `equipes.id`, opcional |
| `cargo` | Texto | — | `null` | Texto livre exibido na UI |
| `status` | Enum `StatusMembro` | ✓ | `ATIVO` | `ATIVO`\|`INATIVO`\|`SUSPENSO` |
| `entrouEm` | Timestamptz | ✓ | `now()` | |
| `convidadoPorId` | UUID | — | `null` | FK → `membros.id` |
| `dataAceiteConvite` | Timestamptz | — | `null` | |
| `configuracoesEspecificas` | JSONB | ✓ | `{}` | Preferências que fazem sentido por vínculo (ex.: notificação por escritório) |
| `desativadoEm` | Timestamptz | — | `null` | |
| `desativadoPorId` | UUID | — | `null` | FK → `membros.id` |
| `criadoEm` / `atualizadoEm` | Timestamptz | ✓ | `now()` | |

**FK:** `usuarioId → usuarios.id` (`RESTRICT`) · `escritorioId → escritorios.id`
(`RESTRICT`) · `papelId → papeis.id` (`RESTRICT` — não é possível excluir papel
em uso) · `equipeId → equipes.id` (`SET NULL`).

**Índices:** `uq_membros_usuario_escritorio (usuario_id, escritorio_id)` ·
`idx_membros_escritorio_status` · `idx_membros_papel`.

**Restrições únicas:** um usuário tem **no máximo um** vínculo por escritório
(regra de negócio 17 desta etapa) — `UNIQUE (usuario_id, escritorio_id)`.

**Regras de integridade:** todo `responsavelId`/`autorId` em `Processo`,
`Documento`, `Comentario` etc. referencia `Membro.id`, nunca `Usuario.id`
diretamente — garante estruturalmente que o responsável pertence ao mesmo
escritório do recurso (reforçado por FK composta, ver [02](02-convencoes-dados.md) §2.4.1).

**Soft delete:** desativação (`status = INATIVO`, `desativadoEm` preenchido) é o
caminho padrão — preserva histórico de autoria. Exclusão física nunca acontece
enquanto houver registro que referencie o `Membro` (o que é sempre o caso, dado
que qualquer atividade gera timeline/auditoria).

**Auditoria:** toda mudança de papel, status e desativação é auditada — é a
operação mais sensível deste módulo (escalonamento/revogação de privilégio).

**Regras de acesso:** listagem de `Membro` por escritório exige
`user:manage`/`user:invite` conforme a ação; um `Membro` só edita o próprio
registro em campos não-sensíveis (cargo, configurações), nunca o próprio papel.

**Riscos:** auto-promoção (usuário alterando o próprio `papelId`) — bloqueado na
autorização do use case (`update-membro`), que rejeita `actorId === targetId`
para o campo `papelId`.

**Escalabilidade:** cresce O(escritórios × pessoas por escritório) — ainda
assim, baixo volume absoluto (dezenas por escritório); sem necessidade de
particionamento.

---

## 3.6 Convite

**Finalidade.** Representa convite pendente para um e-mail entrar no
escritório com um papel pré-definido.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `escritorioId` | UUID | ✓ | — | FK → `escritorios.id` |
| `email` | Texto | ✓ | — | Normalizado |
| `papelId` | UUID | ✓ | — | FK → `papeis.id` |
| `tokenHash` | Texto (SHA-256) | ✓ | — | Ver §3.6.1 |
| `convidadoPorId` | UUID | ✓ | — | FK → `membros.id` |
| `expiraEm` | Timestamptz | ✓ | `now() + 7d` | |
| `status` | Enum `StatusConvite` | ✓ | `PENDENTE` | `PENDENTE`\|`ACEITO`\|`EXPIRADO`\|`REVOGADO` |
| `aceitoPorId` | UUID | — | `null` | FK → `usuarios.id` (só existe após aceite) |
| `dataAceite` | Timestamptz | — | `null` | |
| `criadoEm` / `atualizadoEm` | Timestamptz | ✓ | `now()` | |

**FK:** `escritorioId → escritorios.id` (`CASCADE`) · `papelId → papeis.id`
(`RESTRICT`) · `convidadoPorId → membros.id` (`RESTRICT`).

**Índices:** `uq_convites_token (token_hash)` ·
`idx_convites_escritorio_email_pendente (escritorio_id, email) WHERE status = 'PENDENTE'`.

**Restrições únicas:** apenas um convite `PENDENTE` por `(escritorioId, email)` —
reenvio revoga o anterior e cria um novo, nunca acumula duplicado.

### 3.6.1 Armazenamento seguro do token

O token enviado por e-mail é uma string aleatória de 256 bits gerada por CSPRNG
(nunca derivada de dado previsível como e-mail+timestamp). **Apenas o hash
SHA-256 é persistido** (`tokenHash`) — o token em claro existe somente no
e-mail enviado e na URL que o destinatário abre, nunca no banco. Validação do
aceite: hash do token recebido = `tokenHash` armazenado **e** `expiraEm > now()`
**e** `status = PENDENTE`. Mesmo padrão do token de redefinição de senha em
[../05-arquitetura-backend.md §5.5](../05-arquitetura-backend.md).

**Regras de integridade:** aceite gera `Membro` novo (nunca reaproveita um
`Membro` antigo desativado do mesmo e-mail sem novo convite explícito) e marca
`status = ACEITO` — operação atômica em transação única (ver
[12-eventos-fluxos-regras.md §12.2](12-eventos-fluxos-regras.md)).

**Auditoria:** emissão, reenvio, revogação e aceite de convite são auditados.

**Riscos:** convite aceito duas vezes (dupla submissão) — mitigado por
`status` como guarda de idempotência: segunda tentativa de aceite encontra
`status != PENDENTE` e retorna erro idempotente, não cria segundo `Membro`.

---

## 3.7 Papel

**Finalidade.** Agrupamento nomeado de permissões — papéis de sistema
(imutáveis, compartilhados) e papéis customizados por escritório.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `escritorioId` | UUID | — | `null` | `null` = papel de sistema, compartilhado por todos os tenants |
| `nome` | Texto | ✓ | — | Texto livre se customizado; um dos valores fixos se de sistema |
| `descricao` | Texto | — | `null` | |
| `nivel` | Inteiro | ✓ | — | Hierarquia numérica (maior = mais privilegiado), usada em regras "só quem tem nível igual ou superior" |
| `ehSistema` | Booleano | ✓ | `false` | Papéis de sistema não podem ser editados/excluídos pelo escritório |
| `criadoEm` / `atualizadoEm` | Timestamptz | ✓ | `now()` | |

Papéis de sistema seedados (ver [11-prisma-migracoes-seed.md](11-prisma-migracoes-seed.md)):
`OWNER`, `ADMIN`, `SOCIO`, `ADVOGADO`, `ESTAGIARIO`, `ASSISTENTE` — reafirmando
[../08-especificacao-modulos.md §8.9](../08-especificacao-modulos.md). `CLIENTE`
segue reservado para a Fase 3 (Portal do Cliente), não seedado agora.

**FK:** `escritorioId → escritorios.id` (`CASCADE`, só relevante para papel
customizado).

**Índices:** `idx_papeis_escritorio` · `uq_papeis_sistema_nome (nome)
WHERE eh_sistema = true`.

**Regras de integridade:** papel de sistema (`ehSistema = true`) não aceita
`UPDATE`/`DELETE` da API de administração — validado no use case, não apenas na UI.

**Relacionamentos:** 1:N com `Membro`, N:N com `Permissao` via `papel_permissao`.

---

## 3.8 Permissao

**Finalidade.** Unidade atômica de autorização, no formato `recurso:acao:escopo`.

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `chave` | Texto | ✓ | — | Ex.: `case:read:all`, único global |
| `recurso` | Texto | ✓ | — | Ex.: `case` |
| `acao` | Texto | ✓ | — | Ex.: `read` |
| `escopo` | Enum `EscopoPermissao` | ✓ | — | `ALL`\|`TEAM`\|`ASSIGNED`\|`OWN` |
| `categoria` | Texto | ✓ | — | Agrupamento para exibição no admin (ex.: "Processos") |
| `descricao` | Texto | ✓ | — | |

**Tabela é global, seedada, não editável em runtime** (novas permissões chegam
por migration, nunca por cadastro no admin) — catálogo fechado.

**Tabela associativa `papel_permissao`:** `(papelId, permissaoId)` — N:N entre
`Papel` e `Permissao`.

---

## 3.9 PermissaoUsuario (Override)

**Finalidade.** Concessão ou negação de permissão específica para um `Membro`,
além do que o papel concede — reafirma [../06-modelo-dominio.md §6.2](../06-modelo-dominio.md).

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `membroId` | UUID | ✓ | — | FK → `membros.id` |
| `permissaoId` | UUID | ✓ | — | FK → `permissoes.id` |
| `efeito` | Enum `EfeitoPermissao` | ✓ | — | `CONCEDER`\|`NEGAR` |
| `concedidaPorId` | UUID | ✓ | — | FK → `membros.id` |
| `expiraEm` | Timestamptz | — | `null` | Override temporário (opcional) |
| `criadoEm` | Timestamptz | ✓ | `now()` | |

**Índices:** `uq_permissao_usuario (membro_id, permissao_id)`.

**Regra de integridade central:** `NEGAR` sempre vence `CONCEDER` na resolução
de autorização — resolvido na aplicação (camada de autorização), esta tabela
apenas persiste os dois efeitos possíveis sem hierarquia implícita de banco.

**Auditoria:** toda concessão/negação individual é auditada com o motivo
(campo livre no payload da API, não persistido como coluna — o "porquê" textual
vive no log de auditoria, não na tabela de override).

---

## 3.10 Equipe *(suporte a escopo `TEAM`)*

| Campo | Tipo | Obrigatório | Default | Notas |
|---|---|---|---|---|
| `id` | UUID v7 | ✓ | gerado na app | PK |
| `escritorioId` | UUID | ✓ | — | FK → `escritorios.id` |
| `nome` | Texto | ✓ | — | |
| `liderId` | UUID | — | `null` | FK → `membros.id` |
| `criadoEm` / `atualizadoEm` | Timestamptz | ✓ | `now()` | |

Simples por design — `Equipe` existe para dar sentido ao escopo `TEAM` de
permissão; não é um agregado rico nesta fase.

---

**Anterior:** [02-convencoes-dados.md](02-convencoes-dados.md) · **Próximo:** [04-entidades-clientes-processos.md](04-entidades-clientes-processos.md)
