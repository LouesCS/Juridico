# 01 — Estratégia de Multi-tenancy

> Reafirma e detalha em nível de banco a decisão já registrada em
> [05-arquitetura-backend.md §5.4](../05-arquitetura-backend.md): **banco
> compartilhado, schema compartilhado, `escritorio_id` como discriminador, com
> três camadas de defesa.** Este documento explica o "como", não redecide o "quê".

---

## 1.1 Comparação de estratégias

| Estratégia | Isolamento | Custo operacional | Onboarding de tenant | Escala para milhares de escritórios | Backup/restore por tenant |
|---|---|---|---|---|---|
| **Banco separado por escritório** | Máximo (físico) | Altíssimo — N bancos para migrar, monitorar, escalar | Provisionar banco novo por cadastro (lento, operacional) | Ruim — milhares de bancos é inviável de operar com o time desta fase | Trivial |
| **Schema separado por escritório** | Alto (lógico forte) | Alto — migrations rodam N vezes; connection pooling por schema é complexo | Criar schema + rodar migration por cadastro | Ruim — Postgres degrada com milhares de schemas no mesmo catálogo | Possível, mas manual |
| **Banco compartilhado + coluna `escritorio_id` (+ RLS)** ✅ | Alto (lógico + reforço físico via RLS) | Baixo — uma migration serve todos os tenants | Cadastro é uma linha em `escritorios`, imediato | Ótimo — é o padrão que sustenta milhares de tenants em uma única instância | Requer filtro por tenant no dump; viável com `pg_dump` + `--where` ou export lógico |

**Escolha para o MVP e para a Fase 1: banco compartilhado com `escritorio_id` +
RLS.** Justificativa: o produto precisa de onboarding instantâneo (persona
Sócio cadastra o escritório e já usa), o time é pequeno para operar N bancos, e
a premissa 19 desta etapa ("suportar crescimento para milhares de escritórios")
elimina banco/schema por tenant como opção viável — ambos degradam exatamente na
faixa de volume que o produto precisa atingir. Isolamento físico total (banco
próprio) fica reservado como oferta específica de plano Enterprise no futuro
(gatilho já registrado em [10-roadmap-e-decisoes.md §10.5](../10-roadmap-e-decisoes.md)),
não como padrão.

---

## 1.2 Como o escritório é identificado

- Toda tabela de domínio (exceto as globais de identidade — `usuario`,
  `user_identity`) tem a coluna `escritorio_id UUID NOT NULL`.
- O identificador **nunca** vem de header ou body controlado pelo cliente. Vem
  exclusivamente da claim `tenantId` do access token JWT, verificada na
  assinatura do token (ver [05-arquitetura-backend.md §5.5](../05-arquitetura-backend.md)).
- Em fluxos públicos (login, aceite de convite, onboarding), o escritório é
  resolvido pelo `slug` da URL ou pelo token do convite — nunca por um campo
  livre enviado pelo cliente.

## 1.3 Como o escritório ativo é selecionado

Um usuário pode ter `Membro` em N escritórios (premissas 3 e 4). A sessão grava
um `escritorioAtivoId`. No login:

1. Se o usuário tem exatamente um `Membro` ativo → escritório ativo é definido
   automaticamente.
2. Se tem mais de um → tela de seleção de escritório antes do Dashboard (já
   especificada em [03-fluxos-e-telas.md §3.2.2](../03-fluxos-e-telas.md)).
3. O access token é emitido **por escritório ativo** — a claim `tenantId` e as
   `permissions` do token refletem o `Membro` daquele escritório, não uma união
   de todos.

## 1.4 Como o backend aplica o filtro obrigatório

Duas camadas cooperam, nenhuma substitui a outra:

**a) Prisma Client Extension (`withTenantContext`)** — todo repositório usa um
`PrismaClient` estendido que intercepta `findMany`, `findFirst`, `update`,
`updateMany`, `delete`, `deleteMany`, `count` sobre modelos marcados como
tenant-scoped (via convenção de nome de campo `escritorioId` presente no model) e
injeta automaticamente `where: { escritorioId: tenantContext.id, ...args.where }`.
O `tenantContext` vem de `AsyncLocalStorage`, populado pelo `TenantGuard` no
início da requisição.

**b) Row-Level Security no Postgres** — última barreira, independente da
aplicação lembrar de filtrar. Ver §1.7.

Conceitualmente (não é o schema final, apenas ilustrativo da regra):

```
// shared/infrastructure/database/tenant-scoped.extension.ts
const tenantScopedModels = new Set(['processo','documento','cliente', ...]);

prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (tenantScopedModels.has(model) && isReadOrWriteOp(operation)) {
          const tenantId = tenantContextStorage.getStore()?.tenantId;
          if (!tenantId) throw new MissingTenantContextError(model, operation);
          args.where = { ...args.where, escritorioId: tenantId };
        }
        return query(args);
      },
    },
  },
});
```

## 1.5 Como impedir consultas sem `escritorioId`

- A extensão acima **lança exceção** (`MissingTenantContextError`) em vez de
  silenciosamente executar sem filtro — falha ruidosa é a única opção aceitável
  aqui; um filtro ausente que "funciona por acaso" é o pior cenário possível.
- Regra de lint customizada (`no-raw-prisma-in-usecase`) proíbe uso do
  `PrismaClient` não estendido fora da camada de infraestrutura.
- Repositórios concretos (`Prisma*Repository`) recebem o client estendido por
  injeção — não existe caminho de código que acesse o client "cru" a partir de
  um use case.
- Todo repository base (`BaseTenantRepository<T>`) exige `escritorioId` como
  primeiro parâmetro de qualquer método de leitura — impossível compilar uma
  chamada sem ele.
- Teste automatizado de arquitetura (dependency-cruiser ou eslint) falha o CI se
  qualquer import de `@prisma/client` aparecer fora de `infrastructure/`.

## 1.6 Como evitar IDOR (Insecure Direct Object Reference)

1. **Nunca buscar por `id` isolado.** Todo `findUnique`/`findFirst` de recurso de
   domínio usa a chave composta `(id, escritorioId)` — mesmo sabendo o `id` de um
   processo de outro tenant, a query com `escritorioId` errado retorna vazio.
2. **404, não 403, para recurso fora do tenant.** Retornar 403 confirma a
   existência do recurso; 404 não revela nada (ver também segredo de justiça em
   [08-permissoes-seguranca.md](08-permissoes-seguranca.md)).
3. **Autorização de recurso no use case**, além do guard de ação — reafirmando
   [05-arquitetura-backend.md §5.6](../05-arquitetura-backend.md): o guard confirma
   que o papel pode fazer a ação; o use case confirma que o registro pertence ao
   tenant e ao escopo (responsável/equipe) do usuário.
4. **IDs não sequenciais** (premissa 14) — UUID elimina enumeração por
   incremento, mas isso é defesa em profundidade, não substitui os itens 1–3
   (um UUID vazado ainda precisa do filtro de tenant para não ser acessível).

## 1.7 Row-Level Security — preparação

RLS é a última linha de defesa: mesmo com um bug na extensão do Prisma ou uma
query manual esquecida, o banco recusa.

**Mecanismo:**
```sql
ALTER TABLE processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE processos FORCE ROW LEVEL SECURITY; -- vale até para o dono da tabela

CREATE POLICY tenant_isolation ON processos
  USING (escritorio_id = current_setting('app.tenant_id', true)::uuid);
```

A aplicação define a variável de sessão **no início de cada transação**:
```sql
SET LOCAL app.tenant_id = '5f2b...';
```

**Papéis de banco:**
- `app_runtime` — role usada pela API em produção; sujeita a RLS; **sem**
  `BYPASSRLS`.
- `app_migration` — role usada apenas por Prisma Migrate/seed em pipeline
  controlado; `BYPASSRLS`, nunca usada por request de usuário.
- `app_readonly` — role para BI/relatórios futuros, sujeita a RLS, apenas `SELECT`.

**Atenção operacional — PgBouncer em modo `transaction pooling`:** `SET LOCAL`
só vale dentro da transação corrente, o que é compatível com pooling em modo
transação **desde que** toda operação de banco do request aconteça dentro de uma
única transação Prisma (`$transaction`) que abra com o `SET LOCAL` como primeiro
comando. Se o pooling estiver em modo `session`, `SET` simples basta, mas o
número de conexões físicas necessárias sobe. **Decisão:** modo `transaction` +
`SET LOCAL` dentro de `$transaction`, por ser o que escala para milhares de
tenants com menos conexões físicas — trade-off registrado como risco em
[13-decisoes-riscos-proxima-etapa.md](13-decisoes-riscos-proxima-etapa.md).

RLS é tratada como rede de segurança para **isolamento de tenant**, não como
substituto da autorização fina (papel, escopo, segredo de justiça) — essa
permanece inteiramente na aplicação, pois depende de regras dinâmicas (overrides
de permissão, equipe do processo) que RLS estática não expressa bem.

## 1.8 Usuários vinculados a vários escritórios

- `Usuario` é global (sem `escritorioId`); `Membro` é o vínculo por escritório,
  com `(usuarioId, escritorioId)` único.
- Papel, permissões e status são propriedades do `Membro`, nunca do `Usuario` —
  a mesma pessoa pode ser `SOCIO` no Escritório A e `ESTAGIARIO` no Escritório B.
- Toda entidade de domínio referencia `responsavelId`/`autorId` como
  `Membro.id`, não `Usuario.id` diretamente — isso torna a pergunta "este membro
  pertence a este escritório" uma tautologia estrutural, não uma checagem
  adicional.

## 1.9 Como alternar entre escritórios

`POST /v1/auth/switch-office { escritorioId }` — valida que existe `Membro`
ativo do usuário autenticado naquele escritório, emite novo par de tokens com a
claim `tenantId` do novo escritório, atualiza `Sessao.escritorioAtivoId`,
invalida (não revoga globalmente) o par anterior. Front-end limpa todo o cache de
`TanStack Query` ao trocar — nenhum dado do escritório anterior pode sobreviver
na memória do cliente (ver [04-arquitetura-frontend.md](../04-arquitetura-frontend.md)).

## 1.10 Como testar isolamento de dados

Obrigatório no CI, não opcional:

1. **Teste de integração parametrizado**: para cada endpoint de leitura/escrita
   de recurso tenant-scoped, criar fixtures em dois tenants, autenticar como
   usuário do tenant A, tentar acessar/alterar recurso do tenant B por ID
   conhecido → esperar 404 (ou 401/403 conforme a camada).
2. **Teste de RLS isolado**: conectar diretamente ao Postgres com a role
   `app_runtime`, `SET LOCAL app.tenant_id` do tenant A, tentar `SELECT` de linha
   do tenant B → esperar zero linhas, independente de qualquer código de
   aplicação.
3. **Teste negativo da extensão Prisma**: chamar um repositório sem
   `AsyncLocalStorage` populado → esperar `MissingTenantContextError`, nunca uma
   query sem filtro.
4. **Fuzzing leve**: gerar IDs aleatórios (não apenas os de fixtures) e
   confirmar que nenhuma combinação retorna dado de outro tenant.
5. Esses testes rodam como **gate de merge** em qualquer PR que toque
   `infrastructure/database` ou módulos de domínio — não é suíte "quando der tempo".

---

**Anterior:** [00-resumo-modelagem.md](00-resumo-modelagem.md) · **Próximo:** [02-convencoes-dados.md](02-convencoes-dados.md)
