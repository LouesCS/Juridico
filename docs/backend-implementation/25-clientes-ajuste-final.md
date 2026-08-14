# 25 — Ajuste final de Clientes

## Estratégia de compatibilidade

O módulo público passa a se chamar apenas **Clientes**. As colunas legadas
`categoria_relacionamento` e `status` permanecem no banco para compatibilidade
e preservação de histórico, mas não fazem mais parte dos DTOs de criação,
atualização, listagem, exportação ou visualização. Registros antigos
`CONTATO`/`CLIENTE_E_CONTATO` são apresentados como Clientes, sem alteração ou
exclusão destrutiva; novos registros recebem os defaults físicos `CLIENTE` e
`ATIVO` do Prisma.

## Matriz auditada

| Campo/funcionalidade | Banco | Create | Update | Consulta | Visualização | Filtros |
|---|---|---|---|---|---|---|
| Tipo PF/PJ | `tipo` | sim | preservado | sim | sim | sim |
| Nome/nome social/razão social | colunas próprias | sim | sim | sim | sim | nome |
| CPF/CNPJ | colunas próprias | sim | sim | sim | completo | sim |
| RG | `rg` (aditivo) | sim | sim | sim | PF | busca global |
| E-mails | `emails[]` | principal + adicional | sim | sim | sim | e-mail |
| Telefones/celular | `telefones[]` | sim | sim | sim | sim | telefone/celular |
| Telefone residencial | coluna aditiva | PF | PF | sim | PF | não |
| Responsável/telefone | colunas aditivas | PJ | PJ | sim | PJ | não |
| Endereço/Bairro | colunas existentes | sim | sim | sim | sim | filtros existentes |
| Campos Extras | JSON existente | sim | sim | sim | sim | não |
| Campos Obrigatórios | configuração por escritório | valida | valida | n/a | n/a | n/a |
| Categoria Cliente/Contato | preservada apenas como legado | removida | removida | removida | removida | removida |
| Status do cliente | preservado apenas como legado | removido | removido | removido | removido | removido |

## Integrações reutilizadas

- Anexos: Document Engine filtrado por `clienteId`.
- Pastas: pastas reais dos documentos relacionados ao Cliente; não foi criada relação ou engine paralelo.
- Prompts de IA: `AiSummaryPanel`/Client AI existente e `ai:summarize`.
- Auditoria: timeline agregada existente, separada em atividades recentes e antigas.
- Busca universal: tenant + `client:read`, incluindo nome, razão social, CPF/CNPJ, RG, e-mail e telefone.
- Permissões: `client:read/create/update/delete/export`, sem mascaramento para usuários autorizados.

Inscrição estadual/municipal e país não foram adicionados porque o modelo atual
não os suporta e o requisito os condiciona a suporte prévio.
