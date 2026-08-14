# Publicações

O módulo de Publicações é uma projeção de leitura e organização sobre os dados normalizados por Configurações de Captura. Ele não consulta DataJud/DJEN, não executa sincronização e não interpreta payload bruto de provider.

## Fonte e persistência

- `PublicacaoJudicialCapturada` continua sendo a fonte única das comunicações capturadas.
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
