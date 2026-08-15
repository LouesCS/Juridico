# Captura judicial

## Escopo e arquitetura

`ConfiguracaoCaptura` acompanha um número CNJ dentro de um escritório. Ela não substitui `Processo`: quando o mesmo CNJ já existe no tenant, a configuração reutiliza a relação opcional com `Processo`, de onde Cliente e Pasta são derivados.

Fluxo: Configuração → `JudicialCaptureService` → provider → DTO normalizado → deduplicação/persistência → Timeline apenas quando há novidade jurídica. Execuções técnicas ficam no histórico da configuração e no Audit Interceptor.

O contrato `JudicialCaptureProvider` declara capacidades por provider. Isso permite acrescentar um fornecedor ou tribunal sem levar payloads externos ao domínio.

## Fontes oficiais avaliadas em 9 de agosto de 2026

### DataJud

- Portal oficial: https://www.cnj.jus.br/sistemas/datajud/api-publica/
- Wiki oficial: https://datajud-wiki.cnj.jus.br/api-publica/
- Acesso/autenticação: https://datajud-wiki.cnj.jus.br/api-publica/acesso/
- Endpoints por tribunal: https://datajud-wiki.cnj.jus.br/api-publica/endpoints/
- Consulta por número: https://datajud-wiki.cnj.jus.br/api-publica/exemplos/exemplo1/
- Glossário: https://datajud-wiki.cnj.jus.br/api-publica/glossario/

Capacidades confirmadas: capa pública do processo e movimentos. A consulta é `POST /api_publica_{alias}/_search`, usa Query DSL sobre `numeroProcesso` sem máscara e exige `Authorization: APIKey ...`. O alias é derivado do segmento/tribunal do CNJ. Campos consumidos: identificador, número, tribunal, classe, órgão julgador e movimentos (`codigo`, `nome`, `dataHora`). Processos sigilosos e dados protegidos não estão cobertos.

A chave é lida exclusivamente de `DATAJUD_API_KEY` no backend. A chave pública vigente não foi copiada para código ou enviada ao frontend. `DATAJUD_BASE_URL` e `JUDICIAL_CAPTURE_TIMEOUT_MS` são configuráveis.

### Comunicações Processuais / DJEN

- Página oficial: https://www.cnj.jus.br/programas-e-acoes/processo-judicial-eletronico-pje/comunicacoes-processuais/
- Portal/API oficial: https://hcomunica.cnj.jus.br/api

A página oficial da API exige execução de JavaScript e, nas fontes oficiais consultadas, não foi possível validar um contrato público estável completo (endpoint, autenticação, filtros, paginação e erros) adequado a consumo server-to-server nesta Sprint. `DjenProvider` foi preparado com a capacidade `COMMUNICATIONS`, mas retorna indisponível e não realiza chamadas. Nenhuma publicação é inventada.

## Normalização e deduplicação

Movimentos são convertidos para `CapturedJudicialMovement`. A chave externa DataJud é SHA-256 de identificador oficial do processo + código + data + nome + posição. A restrição única `(escritorioId, provider, externalId)` e `createMany(skipDuplicates)` evitam importação repetida. O payload bruto mínimo do movimento pode ser guardado em JSON para suporte/reprocessamento, mas nunca é usado diretamente pela UI.

`PublicacaoJudicialCapturada` usa a chave única `(escritorioId, provider, externalId)` e possui rastreabilidade opcional para `ConfiguracaoCaptura`. O fluxo DataJud executável ainda produz apenas Movimentações; o provider DJEN não possui contrato estável validado e, portanto, nenhuma Publicação é fabricada. A página de Publicações apenas consome registros capturados/importados por infraestrutura oficial.

## Tenant, permissões e exclusão

Todas as tabelas possuem `escritorioId`, filtro da extensão Prisma e políticas RLS na migration. O mesmo CNJ pode existir em escritórios diferentes. As rotas usam `capture:read`, `capture:create`, `capture:update`, `capture:delete` e `capture:sync`; `capture:manage` fica disponível para composição administrativa. A Sidebar exige `capture:read`.

Excluir uma configuração usa `ON DELETE CASCADE` somente no histórico técnico. Processo, Cliente, movimentos e publicações capturados usam relação independente/`SET NULL` e são preservados.

## Sincronização e scheduler

A sincronização manual está implementada com timeout, tratamento de indisponibilidade, rate limit, resposta inválida e erro público sem stack trace. Não há worker/scheduler BullMQ executável no projeto; portanto, captura automática não é anunciada como ativa. `capturaAtiva` deixa o agregado elegível para um futuro executor periódico, enquanto configurações pausadas permanecem armazenadas.

## Situação de testes externos

O adapter foi testado com respostas HTTP controladas nos testes unitários e mocks MSW. Nenhuma chamada ao DataJud real foi executada nesta Sprint porque `DATAJUD_API_KEY` não está configurada no ambiente. DJEN foi somente avaliado e preparado.
