# 11 — Testes

> Reafirma padrão geral de
> [../04-arquitetura-frontend.md §4.10](../04-arquitetura-frontend.md)
> (equivalente do lado backend) e
> [../database/11-prisma-migracoes-seed.md §11.11](../database/11-prisma-migracoes-seed.md).

## 11.1 Unitários

**Alvo:** `domain/` (entidades, Value Objects, invariantes) e
`application/use-cases/` com repositórios **mockados** (mock da interface,
nunca do Prisma). Rodam sem banco, sem rede — milissegundos por teste.
`ProcessoAcessoPolicy` e demais policies são testadas aqui exaustivamente
(matriz de papel × escopo × segredo de justiça).

## 11.2 Integração

**Alvo:** repositórios Prisma reais contra **Postgres real via
Testcontainers** (nunca mock de Prisma — reafirma
[../database/11-prisma-migracoes-seed.md §11.11](../database/11-prisma-migracoes-seed.md),
o valor destes testes está em validar RLS, FK composta e constraint que um
mock não reproduz). Suíte de isolamento de tenant
([../database/01-estrategia-multitenancy.md §1.10](../database/01-estrategia-multitenancy.md))
roda nesta categoria.

## 11.3 E2E

**Alvo:** os 8 fluxos críticos já identificados em
[../04-arquitetura-frontend.md §4.10](../04-arquitetura-frontend.md) (login,
cadastro de processo, upload, busca, resumo IA, permissão, notificação,
perfil), agora exercitados via HTTP real contra a API completa (Postgres +
Redis + storage local em Testcontainers/Docker Compose de teste) — sem
mockar nada além de provedores externos verdadeiros (IA, e-mail, OAuth),
que usam adapter de teste (`FakeMailAdapter`, `FakeAiProviderAdapter`).

## 11.4 Contract Testing (pendência resolvida)

> Fecha a pendência registrada em
> [../api/22-decisoes.md §22.5](../api/22-decisoes.md) e referenciada em
> [../api/19-openapi.md §19.9](../api/19-openapi.md).

**Ferramenta:** **Dredd** (ou `schemathesis`, ambos validam uma API HTTP
real contra um documento OpenAPI) rodando contra a API subida em ambiente de
CI (Postgres + Redis de teste via Docker Compose) com dados de seed
determinísticos.

**O que é validado, para cada endpoint documentado em `docs/api/04` a
`docs/api/16`:**
1. **Request** — o schema de entrada aceito pela API corresponde ao `body`/
   `query`/`params` declarado no OpenAPI gerado (reafirma
   [../api/19-openapi.md §19.8](../api/19-openapi.md), que por sua vez é
   gerado do mesmo Zod usado na validação — o contract test aqui é uma
   segunda camada de verificação, útil para pegar divergência introduzida
   por erro humano na composição do Controller, não apenas no DTO).
2. **Response** — corpo de resposta real corresponde ao schema declarado
   (campos obrigatórios presentes, tipos corretos, enums dentro do
   catálogo).
3. **Status HTTP** — código retornado corresponde ao catalogado em
   [../api/17-errors.md](../api/17-errors.md) para cada cenário testado
   (sucesso, validação, não encontrado, conflito).
4. **Breaking changes** — `oasdiff` (mesma ferramenta citada em
   [../api/19-openapi.md §19.9](../api/19-openapi.md)) roda como etapa
   anterior ao contract test, comparando o OpenAPI da branch contra o da
   última versão publicada; mudança incompatível sem entrada em
   `docs/api/22-decisoes.md` falha o pipeline antes mesmo do contract test
   rodar.

**Cenários gerados automaticamente por endpoint (via `schemathesis`,
baseado em property-based testing sobre o schema):** valores de fronteira
(string vazia, número negativo, UUID malformado), campo obrigatório ausente,
tipo errado — cobre casos que uma suíte de exemplos manuais tende a não
antecipar.

**Integração ao pipeline:**
```
CI:
  1. build (falha se OpenAPI não gerar)
  2. oasdiff (falha se breaking change sem decisão registrada)
  3. subir API + Postgres + Redis de teste (Docker Compose de CI)
  4. seed determinístico (docs/database/11-prisma-migracoes-seed.md §11.14)
  5. contract test (Dredd/schemathesis) contra a API subida
  6. suíte de integração e E2E
```
Falha em qualquer etapa bloqueia o merge — mesmo gate de qualidade já
aplicado a performance ([../api/20-performance.md §20.1](../api/20-performance.md))
e acessibilidade ([../ux/15-acessibilidade.md §15.8](../ux/15-acessibilidade.md)).

## 11.5 Mocks e Factories

`test/factories/` — uma factory por entidade de domínio (`ProcessoFactory.build({...})`,
sobrescrevendo apenas os campos relevantes ao teste, com os demais
preenchidos por valor padrão válido) — reafirma padrão de "objeto sempre
válido por padrão" que evita testes frágeis por dado incompleto.

## 11.6 Seed de teste

Reaproveita a mesma estratégia idempotente de
[../database/11-prisma-migracoes-seed.md §11.14](../database/11-prisma-migracoes-seed.md) —
papéis/permissões de sistema sempre semeados; dados fictícios de teste
gerados por factory, nunca dado real.

## 11.7 Cobertura

Meta: 80% em `domain/` e `application/use-cases/` de módulos com DDD
completo/parcial (`LegalCases`, `Documents`, `Identity`/autorização); 60%
nos módulos de CRUD simples (`Notifications`, `Users`) — reafirma
proporcionalidade de esforço já aplicada em
[../04-arquitetura-frontend.md §4.10](../04-arquitetura-frontend.md)
(90% em validadores, 70% geral).

---

**Anterior:** [10-observabilidade.md](10-observabilidade.md) · **Próximo:** [12-docker.md](12-docker.md)
