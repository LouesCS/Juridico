# Fechamento técnico de Movimentações

## Audit contextual

O Audit Engine é a fonte única do histórico contextual. A consulta usa o trio
`escritorioId + recursoTipo + recursoId`, pagina os resultados e valida tanto a
permissão de leitura do tipo quanto o acesso ao recurso concreto. A resposta de
leitura não expõe snapshots (`dadosAntes`/`dadosDepois`) nem metadata bruta.

Recursos inicialmente suportados: `PASTA_JURIDICA`, `MOVIMENTACAO_JUDICIAL` e
`MOVIMENTACAO_EXTRAJUDICIAL`.

## Tarefa contextual

O `TaskFormDialog` global recebe zero ou mais vínculos iniciais. O módulo de
origem fornece apenas IDs e labels reais; a criação continua pertencendo ao Task
Engine. O backend valida tenant e existência dos recursos e deduplica cada par
`tipoRecurso + recursoId`. A edição preserva os vínculos já persistidos.

## Pasta Jurídica

A Pasta não carrega cópias limitadas de Movimentações no DTO principal. As abas
Judicial e Extrajudicial consultam seus respectivos módulos globais por
`pastaJuridicaId`, com paginação, total real, loading e erro isolados. A troca de
página afeta somente a query da seção correspondente.

## Convenção RLS

O contexto tenant do PostgreSQL é `app.tenant_id`, definido pela camada Prisma.
As migrations pendentes de Movimentações foram normalizadas para essa convenção.
Nenhuma migration foi aplicada durante este fechamento.
