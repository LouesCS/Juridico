# Movimentações Judiciais

O módulo explora os registros normalizados de `MovimentoJudicialCapturado`. Não consulta providers, não executa captura, não cria Processo e não duplica movimentações. A deduplicação permanece sob responsabilidade de Configurações de Captura, pela chave `escritorioId + provider + externalId`.

## Relações e estados

Processo é a relação direta existente. Cliente, Pastas e Configuração de Captura são derivados do Processo. Publicações usam a relação já existente com a movimentação. Todos esses vínculos são navegáveis; nenhum deles é criado automaticamente pela tela.

`MovimentoEstadoUsuario` armazena somente o favorito por membro, com isolamento RLS derivado do escritório da movimentação. O conteúdo jurídico normalizado permanece compartilhado e imutável. O JSON bruto nunca é devolvido pelo DTO.

## Consulta e indicadores

`GET /judicial-movements` oferece filtros, ordenação e paginação. Indicadores são calculados dos registros do escritório: total, capturadas nos últimos sete dias, movimentações ocorridas hoje, movimentações ocorridas nos últimos sete dias e última sincronização registrada. “Origem” é a captura judicial interna; “Fonte” é o provider real (`DATAJUD` ou `DJEN`).

A exportação CSV aplica os mesmos filtros e limita o resultado a 5.000 registros.

## Permissões, auditoria e Timeline

- `movement:read`: menu, listagem, detalhe e Busca Universal.
- `movement:update`: favorito individual.
- `movement:manage`: exportação.

Visualização explícita do detalhe, favorito e exportação são auditados. Visualização e favorito também geram Timeline quando há Processo relacionado. A simples listagem e execuções técnicas de sincronização não criam eventos.

## IA e próxima etapa

O AI Engine atual não possui escopo `MOVIMENTACAO_JUDICIAL`. O painel reutiliza o escopo do Processo e identifica explicitamente a movimentação apresentada como fonte contextual, sem criar provider ou resposta paralela.

O domínio permanece preparado para **Movimentações Extrajudiciais**, mas nenhuma entidade, rota ou tela extrajudicial foi iniciada nesta Sprint.
