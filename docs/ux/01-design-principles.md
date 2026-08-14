# 01 — Filosofia do Produto e Design Principles

---

## 1.1 Princípios de filosofia — e como cada um muda uma tela

### "O Quilombo Dev não é um ERP — é um Workspace Jurídico"

Um ERP é organizado em torno de *módulos e cadastros*: você entra na tela de
"Processos" para gerenciar processos, na tela de "Documentos" para gerenciar
documentos. Um workspace é organizado em torno de *contexto e tarefa*: você
está "dentro" de um caso, e tudo relevante para aquele caso — documentos,
prazos, pessoas, IA — está a um clique, nunca a uma troca de módulo.

**Impacto concreto:** a Tela do Processo (ver [06-processos.md](06-processos.md))
não é "mais um cadastro com abas" — é o *lugar de trabalho*. Documentos e
Comentários não têm navegação própria de primeiro nível na sidebar como
destinos finais; eles têm uma biblioteca geral (para quando você não sabe de
qual processo é) mas o caminho dominante de acesso é sempre *através* do
processo.

### "O usuário deve trabalhar, e não preencher sistema"

Nenhuma tarefa do produto pode exigir, como pré-requisito, o preenchimento
completo de um cadastro. Cadastro incompleto é o estado padrão esperado, não
uma exceção tolerada.

**Impacto concreto:** o wizard de novo processo ([03-fluxos-e-telas.md §3.4.1](../03-fluxos-e-telas.md))
só exige a Etapa 1; um `Cliente` pode ser criado com apenas nome; um documento
pode ser enviado antes de o processo ter qualquer outro dado. Toda tela de
cadastro tem "salvar e completar depois" como caminho tão válido quanto
"salvar completo".

### "A busca é o centro da experiência"

Se a busca falhar, o produto falhou — não é uma funcionalidade entre outras.

**Impacto concreto:** o atalho `⌘K`/`Ctrl+K` funciona em **100% das telas**,
incluindo dentro de modais e formulários (exceto quando o foco está em um
campo de texto que intercepta a tecla — nesse caso, o ícone de busca na Topbar
continua clicável). Nenhuma tela oculta ou desabilita a busca global.

### "O processo é o contexto principal"

Quase toda entidade do produto (documento, prazo, comentário, resumo de IA)
existe *em função de* um processo. A navegação reflete isso: a URL de um
documento vinculado a um processo sempre carrega a relação
(`/processos/:id/documentos/:docId`), nunca aponta para uma ilha desconectada.

**Impacto concreto:** toda tela de detalhe de entidade satélite (documento,
comentário) mostra breadcrumb de volta ao processo-pai como primeira
informação de orientação, não como rodapé.

### "A IA é copiloto"

Copiloto ajuda, não pilota. A IA nunca aparece como a última palavra —
aparece como um colega que já leu tudo e resume, sempre com a fonte visível e
sempre editável/descartável pelo usuário.

**Impacto concreto:** detalhado em toda a experiência de IA (ver seção própria
em [06-processos.md §6.2](06-processos.md) e princípios de mensagem em
[14-ux-writing.md](14-ux-writing.md)).

### "A interface deve desaparecer"

Quanto menos o usuário percebe que está "usando um sistema", melhor. Cromo
visual (bordas decorativas, ícones sem função, telas de configuração no
caminho crítico) é tratado como custo, não como polimento.

**Impacto concreto:** nenhuma tela do fluxo crítico (login → dashboard →
processo → documento → busca) tem mais de uma decisão de navegação por tela.
Onboarding é pulável em toda etapa não essencial (reafirma
[03-fluxos-e-telas.md §3.2.1](../03-fluxos-e-telas.md)).

### "O usuário sempre deve saber qual é a próxima ação"

Toda tela tem exatamente **uma** ação primária, visualmente inconfundível
(botão `default`, cor de marca). Ações secundárias existem, mas nunca
competem visualmente com a primária.

**Impacto concreto:** regra de revisão de design aplicada a toda tela nova:
"aponte a ação primária sem ler nenhum texto". Se duas ações parecem igualmente
importantes, é erro de hierarquia visual, não característica da tela.

---

## 1.2 Design Principles oficiais

| # | Princípio | Explicação |
|---|---|---|
| 1 | **Simplicidade acima de completude** | Prefira uma tela que faz 80% do que o usuário precisa hoje a uma tela que tenta cobrir 100% dos casos e fica difícil de ler. Completude adicional entra como progressive disclosure (ver princípio 9), nunca como densidade default. |
| 2 | **Foco em uma ação principal por tela** | Ver §1.1 acima. Toda tela responde à pergunta "o que eu deveria fazer aqui?" em menos de 2 segundos de leitura. |
| 3 | **Feedback imediato** | Toda ação do usuário produz uma resposta visual em <100ms (mesmo que seja apenas o estado de loading do botão) — o sistema nunca deixa o usuário sem saber se o clique "pegou". |
| 4 | **Poucos cliques** | Tarefas frequentes (abrir processo, ver documento, marcar prazo concluído) nunca exigem mais de 2 cliques a partir do Dashboard. Tarefas raras (configuração administrativa) podem exigir mais. |
| 5 | **Busca sempre disponível** | Ver §1.1. Não negociável. |
| 6 | **Evitar tabelas gigantes** | Tabela com >8 colunas visíveis simultaneamente é sinal de que a tela está tentando fazer o trabalho de duas telas. Colunas extras vão para painel lateral, tooltip ou coluna configurável opcional, nunca todas visíveis por padrão. |
| 7 | **Interface limpa** | Espaço em branco é elemento de design, não "espaço desperdiçado". Densidade é escolha do usuário (modo Compacto/Confortável — [../07-design-system.md §7.4](../07-design-system.md)), nunca imposta por padrão apertado. |
| 8 | **Zero telas confusas** | Toda tela passa pelo teste "uma pessoa que nunca viu o produto entende o que está vendo em 5 segundos, sem tooltip". |
| 9 | **Consistência visual** | O mesmo tipo de ação (excluir, editar, confirmar) usa sempre o mesmo componente, posição e cor em todo o produto — reafirma [../07-design-system.md §7.10](../07-design-system.md) (governança do design system). |
| 10 | **Acessibilidade por padrão** | Não é uma camada adicionada depois — todo componente novo nasce com estados de foco, contraste e leitor de tela corretos (ver [15-acessibilidade.md](15-acessibilidade.md)). |
| 11 | **Progressive disclosure** | Informação avançada/rara fica atrás de um clique ("ver mais", painel lateral, aba secundária) — a tela padrão mostra o que 80% dos usuários precisam 80% do tempo. |
| 12 | **Reversibilidade** | Toda ação destrutiva é confirmável e, quando possível, desfazível (soft delete + lixeira, reafirma [../database/10-soft-delete-retencao-lgpd.md](../database/10-soft-delete-retencao-lgpd.md)) — isso permite interfaces mais diretas (menos "tem certeza?" para ações não destrutivas), porque o custo do erro é baixo. |

## 1.3 Matriz de princípio × tipo de tela

| Tipo de tela | Princípios mais críticos |
|---|---|
| Dashboard | 1, 2, 6, 8 — é a tela mais vista; qualquer ruído aqui se paga todos os dias |
| Tela do Processo | 2, 4, 7, 11 — muita informação potencial, precisa de disclosure progressivo |
| Busca Global | 3, 4, 5 — velocidade percebida é a métrica que mais importa |
| Formulário de cadastro | 1, 3, 12 — permitir incompletude, confirmar sem bloquear |
| Tela administrativa | 9, 10 — menos frequentada, mas erro aqui tem alto custo (permissão errada) |

---

**Anterior:** [00-resumo.md](00-resumo.md) · **Próximo:** [02-personas.md](02-personas.md)
