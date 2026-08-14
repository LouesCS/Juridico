# Pasta Jurídica como workspace central

## Regra permanente de criação

Recursos jurídicos criados manualmente devem respeitar seu contexto de origem.
Processos Judiciais, Processos Extrajudiciais, Pedidos, Garantias, Contratos,
Documentos, Serviços, Tarefas, Financeiro, IA, Anexos e Comentários devem ser
criados a partir da Pasta Jurídica quando essa for a regra do domínio.
Configurações de Captura são criadas a partir do Cliente. Menus globais são
visões agregadas e não podem oferecer atalhos que burlem o contexto obrigatório.

O módulo global de cada recurso permanece como fonte da verdade. A Pasta guarda
somente vínculo/contexto, nunca uma cópia funcional paralela.

## Regras já suportadas

- Um Cliente pode possuir várias `PastaJuridica`.
- Uma Pasta pode possuir no máximo um `Processo` do tipo `JUDICIAL` e um do tipo
  `EXTRAJUDICIAL`.
- A criação contextual de Processo bloqueia a Pasta dentro da transação, valida
  tenant e Cliente principal e grava Processo, equipe e vínculo atomicamente.
- `MovimentacaoExtrajudicial` não é `Processo` Extrajudicial.
- Processo Judicial e Processo Extrajudicial usam a mesma entidade global
  `Processo`, diferenciada por `tipo`. Ambos são criados somente dentro da
  Pasta Jurídica; seus menus globais são visões agregadas sem criação.
- Uma `MovimentacaoExtrajudicial` recebida pode apontar por `processoId` somente
  para um `Processo` do tipo `EXTRAJUDICIAL`. Ela permanece uma entidade própria
  e não é criada ou duplicada junto com o Processo.
- Tarefas continuam no Task Engine com vínculo `PASTA_JURIDICA`.
- Documentos continuam no Document Engine.

## Regras preparadas para módulos futuros

Pedidos, Garantias, Contratos, Serviços e lançamentos Financeiros serão criados
na Pasta quando seus domínios reais forem implementados. IA, Anexos e Comentários
devem reutilizar engines contextuais; nenhum armazenamento específico da Pasta
deve ser criado antecipadamente.

## Captura por e-mail

Captura automática por e-mail: **PENDENTE**. Não existe atualmente provider
Gmail, Microsoft Graph, Outlook/IMAP, webhook, worker ou parser de e-mail que
sustente esse fluxo.
