# 13 — Requisitos Não Funcionais, Riscos, Pendências e Checklist

---

## 13.1 Requisitos não funcionais do banco (metas de MVP, com trilha de crescimento)

| Requisito | Meta MVP | Trilha de crescimento |
|---|---|---|
| Disponibilidade | 99.5% | 99.9% com réplica de leitura + failover automático |
| Consistência | Forte (transacional) em todo o núcleo jurídico | Mantida — nenhuma parte do domínio migra para consistência eventual nesta fase |
| Latência de leitura (p95) | < 150ms em queries de listagem indexadas | < 100ms com cache de views agregadas |
| Latência de busca (p95) | < 400ms (reafirma [../01-visao-produto.md §1.6](../01-visao-produto.md)) | Gatilho de OpenSearch em [09](09-indices-busca-performance.md) §9.3 |
| Volume inicial | Dezenas de escritórios, milhares de processos | Milhares de escritórios (premissa 19) — arquitetura já preparada, não requer redesenho |
| Conexões simultâneas | Pool de 20–50 por instância de API via PgBouncer | PgBouncer em modo transaction pooling desde o início (ver §13.2) |
| Backup | Diário completo + WAL contínuo (PITR) | Mesmo esquema, maior retenção |
| RPO (Recovery Point Objective) | 1 hora | Redução conforme criticidade do cliente justificar |
| RTO (Recovery Time Objective) | 4 horas | Redução com réplica quente |
| Monitoramento | Métricas de query lenta, bloat de índice, replicação (se houver), uso de conexão | Alertas automatizados por limiar |
| Integridade | Garantida por FK, `CHECK`, constraints únicas — nunca apenas por validação de aplicação em dado crítico | — |
| Segurança | RLS + criptografia em coluna para segredo/token + TLS em trânsito | Auditoria externa (pentest) antes de comercialização, já previsto em [../09-seguranca-lgpd.md §9.9](../09-seguranca-lgpd.md) |
| Escalabilidade | Vertical (instância maior) | Réplicas de leitura → particionamento seletivo (`log_auditoria` já particionada; `eventos_timeline` sob gatilho) |
| Crescimento de storage (arquivos) | Elástico por natureza (S3-compatible) | Sem impacto no banco — só metadado cresce, não o binário |
| Retenção de logs (auditoria) | 12 meses quente + 5 anos frio | Ver [10](10-soft-delete-retencao-lgpd.md) §10.4 |
| Recuperação de desastre | Backup em região distinta da primária | Réplica ativa em segunda região, se exigido por cliente Enterprise |

## 13.2 Riscos técnicos identificados nesta etapa

| Risco | Probabilidade | Impacto | Mitigação |
|---|:--:|:--:|---|
| `SET LOCAL` de RLS incompatível com PgBouncer em modo `session` (exige `transaction`) | Média | Alto — isolamento de tenant depende disso | Definir modo `transaction` desde o primeiro deploy de infraestrutura; testar explicitamente com Testcontainers + PgBouncer no CI, não assumir |
| Enum nativo do Postgres exige migration para novo valor | Alta (é esperado) | Baixo | Aceito conscientemente (§2.9); processo de release já prevê janela de migration |
| `EventoTimeline` como tabela de altíssimo volume sem particionamento inicial | Média (depende da adoção) | Médio | Gatilho de particionamento por `criado_em` já registrado; monitorar tamanho de tabela/índice mensalmente |
| FK composta `(id, escritorioId)` aumenta tamanho de índice e complexidade de `schema.prisma` | Alta (é o trade-off aceito) | Baixo | Aceito — o ganho de segurança estrutural supera o custo de espaço |
| CPF/CNPJ sem criptografia de coluna (apenas RLS + controle de acesso) | Baixa/Média | Médio | Pendência explícita — decidir após parecer de segurança/pentest se criptografia de coluna é necessária além do controle de acesso já modelado |
| `camposCustomizados`/JSONB sem governança de schema pode virar "gaveta de tudo" | Média | Médio | Validação Zod por `area` na aplicação; revisão de PR para qualquer novo uso de campo customizado |
| UUID v7 depende de biblioteca de aplicação até Postgres 18 nativo | Baixa | Baixo | Biblioteca madura (`uuidv7` no npm); caminho de migração para `DEFAULT` nativo já documentado (§2.3) |
| Outbox de eventos adiciona uma tabela e um worker de publicação | Baixa | Baixo | Padrão bem estabelecido; simplicidade preferida a perda de evento |
| Volume de `log_auditoria` mesmo particionado pode pressionar storage a longo prazo | Média (a longo prazo) | Médio | Partições frias exportadas para storage de objeto (Parquet) após 12 meses, mantendo apenas ponteiro |

## 13.3 Decisões pendentes para a próxima etapa

1. **Criptografia de coluna para CPF/CNPJ** — decidir com base em avaliação de
   risco/pentest se o controle de acesso + RLS já modelados são suficientes ou
   se criptografia adicional em coluna se justifica (custo de indexação/busca
   por documento seria impactado).
2. **`schema.prisma` completo** — esta etapa modelou entidades e regras, não o
   arquivo final; é o primeiro entregável técnico da próxima etapa.
3. **Migrations executáveis e ordem de aplicação** — incluindo o SQL de RLS,
   roles de banco e a partição inicial de `log_auditoria`, hoje descritos
   apenas conceitualmente.
4. **Dimensionamento de infraestrutura** (tamanho de instância Postgres, número
   de réplicas, configuração de PgBouncer) — não é objeto de modelagem de
   dados, mas depende dela (ver §13.1).
5. **Parecer jurídico formal sobre retenção e exclusão** — as hipóteses de
   prazo prescricional e limites de exclusão em §10.12 (
   [10-soft-delete-retencao-lgpd.md](10-soft-delete-retencao-lgpd.md)) são
   técnicas, não jurídicas, e precisam de validação por profissional do
   Direito antes de virar política publicada.
6. **Governança de `camposCustomizados`** — definir por área jurídica quais
   campos são oferecidos como sugestão estruturada na UI, para conter o risco
   do item 13.2.
7. **Critério definitivo de particionamento de `EventoTimeline`** — hoje é
   "gatilho por volume"; a próxima etapa deve definir o limiar numérico exato
   e o processo de migração online.

## 13.4 Checklist de validação desta etapa

- [x] Todas as 22 entidades da Fase 1 modeladas com campos, tipos, PK/FK,
      índices, constraints, integridade, soft delete, auditoria, acesso,
      riscos e escalabilidade.
- [x] Estratégia multiempresa comparada e justificada, com identificação,
      seleção e troca de escritório ativo detalhadas.
- [x] RLS preparada (mecanismo, papéis de banco, ressalva de PgBouncer).
- [x] Convenções de nomenclatura, tipos, chaves, enums e formatação
      registradas e aplicadas de forma consistente em todos os arquivos.
- [x] Diagrama ER em Mermaid cobrindo todas as entidades da Fase 1.
- [x] Matriz de permissões para os seis papéis ativos + modelo de autorização
      justificado (RBAC com regras contextuais).
- [x] Índices e estratégia de busca global (FTS + trigram) especificados.
- [x] Soft delete, retenção e diretrizes de LGPD documentados (com ressalva
      explícita de que não substituem parecer jurídico).
- [x] Auditoria diferenciada de histórico funcional e de observabilidade.
- [x] Segurança de dados detalhada (hash, criptografia, IDOR, mass
      assignment, rate limiting).
- [x] Estratégia de migrations por ambiente e política de seed sem dados
      reais.
- [x] Convenções Prisma (extensions, transações, paginação, N+1) descritas
      sem gerar schema final.
- [x] Módulos de domínio delimitados com regras de dependência entre eles.
- [x] Eventos de domínio catalogados com payload, consumidores e
      idempotência.
- [x] 12 fluxos de dados detalhados com validação, transação, eventos,
      auditoria, falhas e permissões.
- [x] Regras de negócio críticas listadas (20 originais + 7 identificadas
      nesta etapa).
- [x] Concorrência e integridade tratadas cenário a cenário.
- [x] Conflito com a arquitetura oficial (Prazo vs. tipo de evento de
      timeline) identificado, explicado e resolvido a favor da arquitetura
      já documentada.
- [x] Nenhum código de aplicação, endpoint ou schema Prisma final gerado —
      escopo desta etapa respeitado.

---

## CONTEXTO OFICIAL PARA O PRÓXIMO PROMPT

**Stack.** PostgreSQL 16 + Prisma ORM, monólito modular em NestJS/Next.js
(inalterado da arquitetura oficial). Modelagem física em `docs/database/`
(14 arquivos), complementar — não substitui — `docs/00` a `docs/10`.

**Estratégia multiempresa.** Banco compartilhado único, coluna `escritorio_id`
em toda tabela de domínio, isolamento em três camadas: guard de aplicação
(JWT `tenantId`) → Prisma Client Extension (`AsyncLocalStorage` + filtro
automático, lança exceção se ausente) → Row-Level Security no Postgres
(`SET LOCAL app.tenant_id` por transação; `FORCE ROW LEVEL SECURITY`; roles
`app_runtime` sem bypass, `app_migration` com bypass). Ressalva operacional:
exige PgBouncer em modo `transaction pooling`. Usuário é global; `Membro` é o
vínculo por escritório (um usuário, N escritórios, papéis independentes).

**Entidades (22, em 6 módulos).**
`Identity`: Usuario, UserIdentity, Sessao.
`Offices`: Escritorio.
`Memberships`: Membro, Convite, Papel, Permissao, PermissaoUsuario, Equipe.
`Clients`: Cliente.
`LegalCases`: Processo (DDD completo), ParteProcesso, ProcessoMembro,
ProcessoRelacionado, Prazo (mantido como entidade dedicada, não absorvido pela
timeline).
`Documents`: Documento (DDD parcial), VersaoDocumento, Pasta.
`Timeline`: EventoTimeline (referências polimórficas sem FK física).
`Comments`: Comentario.
`Tags`: Tag + tabelas associativas (processo_tag, documento_tag, cliente_tag).
`AISummaries`: ResumoIA, FonteIA, Embedding, IndiceBusca.
`Notifications` (CRUD simples): Notificacao, PreferenciaNotificacao.
`Audit`: LogAuditoria (append-only, particionada por mês, sem `UPDATE`/`DELETE`
para a role de aplicação).

**Relacionamentos.** FK composta `(id, escritorioId)` em toda relação crítica
entre entidades de domínio, tornando vazamento cross-tenant estruturalmente
impossível mesmo sem RLS. `ON DELETE`: `CASCADE` só para satélites sem sentido
próprio (versão, parte, tabela associativa); `RESTRICT` como padrão em relações
de negócio (cliente↔processo, membro↔processo); `SET NULL` onde "ficar órfão"
é estado válido (documento sem processo/pasta). Três referências polimórficas
sem FK física, mitigadas por transação atômica na escrita: timeline↔entidade,
notificação↔entidade, fonte-IA↔documento/evento.

**Permissões.** RBAC com regras contextuais (papel resolve a ação; escopo
`ALL|TEAM|ASSIGNED|OWN` + atributos do recurso — segredo de justiça,
confidencialidade — resolvem o registro). Seis papéis ativos na Fase 1: OWNER,
ADMIN, SOCIO, ADVOGADO, ASSISTENTE, ESTAGIARIO (CLIENTE segue reservado à Fase
3). OWNER mantido distinto de ADMIN para sustentar o invariante "sempre ≥1
OWNER ativo por escritório".

**Regras críticas.** 27 regras de negócio consolidadas em
[12-eventos-fluxos-regras.md §12.4](12-eventos-fluxos-regras.md), incluindo as
20 do escopo original mais 7 identificadas na modelagem física (imutabilidade
de `escritorio_id`, papel de sistema não editável, prazo fatal não excluível,
pasta não excluível com conteúdo sem confirmação, vedação de auto-escalonamento
de privilégio, precedência de `NEGAR`, bloqueio de documento infectado).

**Decisões de segurança.** Argon2id para senha; SHA-256 para refresh token e
token de convite (nunca o valor em claro persistido); AES-256-GCM em coluna
para segredo de MFA e tokens OAuth externos; anti-IDOR via busca sempre por
`(id, escritorioId)` e resposta 404 (não 403) fora do tenant; prevenção de mass
assignment via DTOs explícitos; SQL injection eliminado estruturalmente por
queries parametrizadas do Prisma.

**Decisões de auditoria.** `LogAuditoria` append-only (privilégio de banco
revogado para `UPDATE`/`DELETE`, não apenas checagem de aplicação),
particionada por mês desde o início, retenção 12 meses quente + 5 anos frio.
Diferenciada estruturalmente de `EventoTimeline` (histórico funcional/produto)
e de logs de observabilidade (infraestrutura, fora do Postgres transacional).
Toda visualização e download de documento é auditada.

**Decisões de IA.** `ResumoIA` versionado (nova linha a cada regeneração,
nunca `UPDATE` de conteúdo já gerado), com `hashContexto` para invalidação de
cache e `promptVersion`/modelo/custo/latência rastreados por chamada. Fontes
normalizadas em tabela própria (`FonteIA`), com regra dura de que todo resumo
`PRONTO` tem ao menos uma fonte. IA nunca acessa dado fora do `escritorioId` do
processo solicitado — mesma barreira estrutural de qualquer outra leitura.

**Pendências para a próxima etapa** (detalhadas em §13.3): decidir
criptografia de coluna para CPF/CNPJ · escrever o `schema.prisma` completo ·
escrever migrations executáveis (incluindo SQL de RLS, roles e partição
inicial de auditoria) · dimensionar infraestrutura de banco · obter parecer
jurídico formal sobre retenção/exclusão · definir governança de
`camposCustomizados` · definir limiar numérico de particionamento de
`EventoTimeline`.

---

**Anterior:** [12-eventos-fluxos-regras.md](12-eventos-fluxos-regras.md) · **Início:** [00-resumo-modelagem.md](00-resumo-modelagem.md)
