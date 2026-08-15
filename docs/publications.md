# Publicações

## Origem das Publicações

Publicação não possui fluxo de criação manual. A página global é exclusivamente uma superfície de consulta, triagem, visualização, ocultação, vinculação e criação de Tarefas.

O fluxo de domínio esperado é:

`Cliente → Pasta Jurídica → Configuração de Captura → CNJ → Capture Engine → provider → Publicação`.

A Configuração é criada em `/configuracoes-captura` e pode estar vinculada a um Processo e a uma Pasta Jurídica. O CNJ passa obrigatoriamente por `isValidCnj`, `normalizeCnj` e `formatCnj` do domínio de Processos; Publicações não possuem uma segunda implementação de normalização.

O tenant é sempre obtido do usuário autenticado. A configuração, o Processo e a Pasta são buscados com `escritorioId`, e a persistência capturada também carrega o mesmo `escritorioId`. A extensão tenant-scoped e RLS complementam essa validação.

### Situação executável atual

- `DataJudProvider` possui contrato real para capa e movimentações processuais. A sincronização persiste `MovimentoJudicialCapturado`, não Publicações.
- `DjenProvider` declara capacidade de comunicações, mas permanece indisponível porque ainda não há contrato público estável validado. Ele não faz chamadas nem inventa dados.
- Não existe worker/scheduler executável; somente sincronização manual da Configuração.
- Consequentemente, ainda não há pipeline executável provider → `PublicacaoJudicialCapturada` neste repositório. Publicações existentes são consumidas como registros previamente importados/capturados, nunca criadas pela página global.

### Rastreabilidade e vínculos

`PublicacaoJudicialCapturada.configuracaoCapturaId` preserva a origem quando o importador oficial gravar a comunicação. `provider`, `externalId`, `numeroCnj` e `escritorioId` completam a trilha técnica sem expor IDs desnecessários na interface.

A restrição única `(escritorioId, provider, externalId)` é a estratégia oficial de deduplicação de Publicações. A mesma chave já é usada para Movimentações; a sincronização destas usa `createMany(skipDuplicates)`.

O Capture Engine atual associa deterministicamente a Configuração a um Processo de mesmo CNJ no tenant e associa uma Pasta apenas quando o Processo possui exatamente uma Pasta. Como ele ainda não persiste Publicações, não existe hoje vínculo automático executável Publicação → Processo/Pasta. Para registros importados sem esses IDs, a ação **Vincular** é o mecanismo oficial e valida Pasta, Processo Judicial, tenant e pertencimento Processo→Pasta.

O módulo de Publicações é uma projeção de leitura e organização sobre os dados normalizados por Configurações de Captura. Ele não consulta DataJud/DJEN, não executa sincronização e não interpreta payload bruto de provider.

## Fonte e persistência

- `PublicacaoJudicialCapturada` continua sendo a fonte única das comunicações capturadas.
- `configuracaoCapturaId` rastreia a Configuração de origem sem transformar Configuração, Processo ou Pasta em requisito para a existência histórica da Publicação.
- A relação opcional `movimentoRelacionadoId` conecta uma publicação a `MovimentoJudicialCapturado` sem duplicar movimentações.
- `PublicacaoEstadoUsuario` guarda leitura e favorito por membro. Essa tabela satélite evita alterar o conteúdo jurídico compartilhado e é isolada pelo escritório da publicação via RLS.
- A exclusão remove somente a publicação e seus estados em cascata. Processo, cliente, pasta, configuração de captura e movimentação não são excluídos.

## Consulta


Listagem, indicadores, filtros, ordenação e exportação usam o endpoint `/publications`. Todas as consultas aplicam `escritorioId`; estados de leitura/favorito também aplicam `membroId`. A exportação respeita os mesmos filtros e limita o resultado a 5.000 registros.

O detalhe devolve somente o DTO normalizado, vínculos navegáveis e a movimentação relacionada. O payload bruto da integração não é exposto à interface.

## Permissões e eventos

- `publication:read`: menu, listagem, detalhe e busca universal.
- `publication:update`: marcar como lida e favoritar.
- `publication:delete`: excluir a publicação normalizada.
- `publication:manage`: exportar.

Abertura explícita do detalhe, leitura, favorito e exclusão são auditáveis pelos decorators do controller. Quando existe processo relacionado, as ações relevantes também geram evento na Timeline do processo. Uma simples consulta de listagem não gera evento.

## IA, tags e próxima etapa

O painel de IA reutiliza o escopo do Processo relacionado, pois o AI Engine atual não possui escopo próprio de Publicação. Não foi criado provider, resumo ou resposta simulada específica. O sistema de Tags existente ainda não oferece vínculo com Publicação; portanto, ele não foi duplicado nesta Sprint.

A relação opcional com `MovimentoJudicialCapturado`, o DTO normalizado e a aba de movimentação no detalhe deixam o domínio preparado para o módulo **Movimentações Judiciais**, sem antecipar sua página, filtros ou regras de negócio.
