# 00 — Resumo da Modelagem de Dados (Fase 1)

> **Escopo:** modelagem lógica/física de dados do Quilombo Dev para PostgreSQL +
> Prisma ORM, cobrindo a Fase 1: Autenticação, Escritórios, Usuários, Convites,
> Perfis e Permissões, Clientes, Processos, Participantes, Timeline, Documentos,
> Pastas, Comentários, Tags, Busca Global, Resumo por IA, Notificações, Perfil
> e Auditoria.
>
> **Este conjunto de documentos eleva para o nível de banco de dados** o que já
> estava decidido conceitualmente em [`../06-modelo-dominio.md`](../06-modelo-dominio.md)
> e operacionalmente em [`../05-arquitetura-backend.md`](../05-arquitetura-backend.md).
> Não redefine produto, escopo, módulos, stack ou papéis — **detalha como isso é
> implementado em tabelas, colunas, índices, constraints e políticas de RLS.**
>
> **O que este conjunto de documentos NÃO faz:** não implementa o `schema.prisma`
> final · não gera migrations executáveis · não implementa backend, frontend ou
> autenticação · não cria dados reais de pessoas físicas ou jurídicas.

---

## 0.1 Como ler esta pasta

| # | Arquivo | Conteúdo |
|---|---|---|
| 00 | [00-resumo-modelagem.md](00-resumo-modelagem.md) | Este documento — decisões, módulos, índice |
| 01 | [01-estrategia-multitenancy.md](01-estrategia-multitenancy.md) | Isolamento entre escritórios, RLS, IDOR, testes |
| 02 | [02-convencoes-dados.md](02-convencoes-dados.md) | Naming, tipos, chaves, enums, timezone, paginação |
| 03 | [03-entidades-identidade-escritorios.md](03-entidades-identidade-escritorios.md) | Usuario, Identidade, Sessão, Escritório, Membro, Convite, Papel, Permissão |
| 04 | [04-entidades-clientes-processos.md](04-entidades-clientes-processos.md) | Cliente, Processo, Participante, Equipe do Processo, Processo Relacionado, Prazo |
| 05 | [05-entidades-documentos-colaboracao.md](05-entidades-documentos-colaboracao.md) | Timeline, Pasta, Documento, Versão, Comentário, Tag |
| 06 | [06-entidades-ia-notificacoes-auditoria.md](06-entidades-ia-notificacoes-auditoria.md) | Resumo IA, Fonte IA, Notificação, Preferências, Auditoria |
| 07 | [07-relacionamentos-diagrama-er.md](07-relacionamentos-diagrama-er.md) | Diagrama ER completo e explicação de cada relação |
| 08 | [08-permissoes-seguranca.md](08-permissoes-seguranca.md) | Perfis, matriz de permissões, RBAC+ABAC, segurança de dados |
| 09 | [09-indices-busca-performance.md](09-indices-busca-performance.md) | Índices, busca global, paginação por cursor, N+1 |
| 10 | [10-soft-delete-retencao-lgpd.md](10-soft-delete-retencao-lgpd.md) | Soft delete, retenção, auditoria vs. histórico, LGPD |
| 11 | [11-prisma-migracoes-seed.md](11-prisma-migracoes-seed.md) | Convenções Prisma, migrations por ambiente, seed |
| 12 | [12-eventos-fluxos-regras.md](12-eventos-fluxos-regras.md) | Eventos de domínio, 12 fluxos de dados, regras de negócio, concorrência |
| 13 | [13-decisoes-riscos-proxima-etapa.md](13-decisoes-riscos-proxima-etapa.md) | NFRs, riscos, pendências, checklist, contexto para o próximo prompt |

---

## 0.2 Resumo executivo

A Fase 1 modela 22 entidades em 6 módulos de domínio sobre um único banco
PostgreSQL compartilhado entre todos os escritórios (tenants), com isolamento em
três camadas — guard de aplicação, filtro obrigatório na camada de persistência e
Row-Level Security no banco — reafirmando a decisão já registrada em
[05-arquitetura-backend.md §5.4](../05-arquitetura-backend.md).

Identificadores são UUID não sequenciais em todas as tabelas; datas são
armazenadas em UTC; exclusões de registros com valor jurídico usam soft delete;
toda ação sensível gera entrada em auditoria append-only; documentos residem em
storage externo, o banco guarda apenas metadados e referência.

A modelagem é feita para **monólito modular com Prisma** — um único `schema.prisma`
organizado por módulo (multi-file schema), sem barreira física entre módulos além
da disciplina de import, permitindo extração futura sem reescrita.

## 0.3 Decisões arquiteturais desta etapa

| # | Decisão | Referência |
|---|---|---|
| 1 | Banco compartilhado + `escritorio_id` + RLS (não banco/schema por tenant) | [01](01-estrategia-multitenancy.md) |
| 2 | UUID (v4 por padrão; v7 avaliado e recomendado como evolução) gerado na aplicação | [02](02-convencoes-dados.md) §2.3 |
| 3 | snake_case no banco, camelCase no Prisma, via `@map`/`@@map` | [02](02-convencoes-dados.md) §2.1 |
| 4 | Enums nativos do Postgres para conjuntos estáveis do domínio; texto livre para o que é customizável por escritório | [02](02-convencoes-dados.md) §2.9 |
| 5 | Soft delete padronizado (`excluido_em` + `excluido_por`) com índice parcial `WHERE excluido_em IS NULL` | [10](10-soft-delete-retencao-lgpd.md) |
| 6 | Versionamento otimista (`versao INT`) em `Processo` e `Documento` | [02](02-convencoes-dados.md) §2.10, [12](12-eventos-fluxos-regras.md) §12.11 |
| 7 | Busca híbrida FTS + trigram no MVP, com caminho de evolução para OpenSearch/pgvector já decidido em [05-arquitetura-backend.md §5.9](../05-arquitetura-backend.md) | [09](09-indices-busca-performance.md) |
| 8 | Auditoria append-only, sem `UPDATE`/`DELETE` para a role de aplicação | [06](06-entidades-ia-notificacoes-auditoria.md), [08](08-permissoes-seguranca.md) |
| 9 | Paginação por cursor em toda listagem de volume | [02](02-convencoes-dados.md) §2.12, [09](09-indices-busca-performance.md) |
| 10 | RLS operacionalizada via `SET LOCAL app.tenant_id` por transação, com atenção ao modo de pooling do PgBouncer | [01](01-estrategia-multitenancy.md) §1.7 |

### Refinamentos em relação ao modelo conceitual (não são redefinições)

O modelo conceitual de [06-modelo-dominio.md](../06-modelo-dominio.md) foi escrito
em nível de domínio; ao descer para o nível físico, quatro pontos pediram mais
detalhe do que uma lista de atributos permite. Nenhum deles altera escopo, papéis
ou tecnologia — são elaborações estruturais dentro dos módulos já decididos:

| Ponto | Antes (conceitual) | Agora (físico) | Por quê |
|---|---|---|---|
| Tags | `tags[]` como array de string embutido em Processo | Entidade `Tag` normalizada + tabelas associativas (`processo_tag`, `documento_tag`, `cliente_tag`) | Reuso entre entidades, cor/descrição próprias, filtro e contagem eficientes — array não sustenta isso |
| Fontes do resumo de IA | `fontes[]` como array/JSON embutido em `ResumoIA` | Entidade `FonteIA` normalizada (uma linha por fonte citada) | Integridade referencial com o documento/evento citado e consulta direta de "quais resumos citam este documento" |
| Participantes do processo | `ParteProcesso.tipo`: AUTOR\|REU\|TERCEIRO\|ASSISTENTE\|MP | Enum ampliado incluindo testemunha, perito, advogado externo, juiz, promotor, representante | Cobertura completa do §4.9 desta etapa; mesma entidade, mesmo agregado |
| Pastas de documentos | Não existia | Entidade `Pasta` hierárquica (auto-relacionamento) | Pedido explícito desta etapa (§4.13); Documentos já era DDD parcial — pasta é detalhe de organização, não nova regra de domínio |
| Prazo × Timeline | `Prazo` já era entidade dedicada | **Mantida** como entidade dedicada; `EventoTimeline` tipo `PRAZO` passa a ser projeção de leitura gerada a partir do Prazo | Ver nota de conflito na resposta desta etapa — resolvido a favor da arquitetura já oficial |

---

## 0.4 Módulos de domínio (organização do `schema.prisma` e do código)

```
Identity          Usuario · UserIdentity · Sessao
Offices           Escritorio
Memberships       Membro · Convite · Papel · Permissao · PermissaoUsuario · Equipe
Clients           Cliente
LegalCases        Processo · ParteProcesso · ProcessoMembro · ProcessoRelacionado · Prazo
Documents         Documento · VersaoDocumento · Pasta
Timeline          EventoTimeline
Comments          Comentario
Tags              Tag · ProcessoTag · DocumentoTag · ClienteTag
AISummaries       ResumoIA · FonteIA · Embedding · IndiceBusca
Notifications     Notificacao · PreferenciaNotificacao
Audit             LogAuditoria
```

**Regra de dependência entre módulos** (mesma disciplina de import do frontend,
aplicada ao backend — ver [05-arquitetura-backend.md §5.2](../05-arquitetura-backend.md)):

- `Identity` e `Offices` não dependem de nenhum outro módulo.
- `Memberships` depende de `Identity` e `Offices`.
- `Clients`, `LegalCases`, `Documents`, `Tags`, `Notifications` dependem de
  `Memberships` (para `escritorioId` e autoria), mas não dependem uns dos outros
  por chave estrangeira direta além de referências por ID.
- `Timeline` e `Comments` dependem de `LegalCases` e `Documents` (são conteúdo
  associado), mas nenhum outro módulo depende deles.
- `AISummaries` depende de `LegalCases` e `Documents` como fonte; nenhum módulo
  depende de `AISummaries`.
- `Audit` é observado por todos os módulos (via interceptor/listener) mas não é
  dependência de nenhum — é un fim de linha, nunca uma origem de dado de domínio.

Essa é exatamente a propriedade que permite extrair `Documents` ou `AISummaries`
como serviço separado no futuro sem reescrever `LegalCases`: a dependência é
sempre de fora para dentro do núcleo jurídico, nunca o contrário.

---

**Próximo:** [01-estrategia-multitenancy.md](01-estrategia-multitenancy.md)
