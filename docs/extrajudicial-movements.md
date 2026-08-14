# Movimentações Extrajudiciais

O módulo registra fatos administrativos sem reutilizar a entidade judicial. Toda movimentação pertence a um escritório e a um Cliente; quando o usuário informa apenas Processo, o backend deriva e valida seu Cliente. Processo e Pasta são opcionais, mas uma Pasta informada deve pertencer ao Processo.

Tipos, origens e status são strings validadas pelo catálogo fornecido por `ConjuntoValores` do Configuration Engine. Na ausência de conjuntos configurados, a API oferece os valores iniciais do produto. Campos Extras usam `CampoExtra` com entidade `MOVIMENTACAO_EXTRAJUDICIAL`, inclusive obrigatoriedade no backend.

Documentos não são copiados nem armazenados em paralelo. O detalhe projeta anexos do Document Engine relacionados ao Cliente, Processo ou Pasta e direciona uploads para o módulo Documentos. Timeline é registrada no Processo quando existente; registros apenas de Cliente permanecem no histórico/auditoria porque a Timeline atual não possui escopo Cliente.

Favorito é individual por membro. CRUD, favorito e exportação são protegidos pelo Permission Engine e auditados. A Busca Universal possui grupo próprio e respeita tenant e `extrajudicial-movement:read`.

O painel de IA reutiliza Processo quando disponível e Cliente nos demais casos, citando o ID da movimentação apresentada. Nenhum provider novo foi criado.

O próximo contexto é **Pastas**; nenhuma implementação adicional de Pastas foi iniciada.
