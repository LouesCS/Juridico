# 19 — Decisões, Conflitos e Riscos desta Etapa

## 19.1 Conflitos identificados e resolução

### Persona "Owner" ausente do documento original

**Conflito:** [../02-personas.md](../02-personas.md) não descreve uma persona
"Owner" separada; a documentação de produto original tratava Ricardo como
"Sócio-administrador" acumulando o que o banco de dados formaliza como papel
`OWNER`.

**Impacto:** nenhum — não há divergência de comportamento, apenas ausência de
uma lente de UX dedicada para as ações exclusivas de titularidade (encerrar
escritório, transferir titularidade).

**Resolução aplicada:** documentada como nota de reconciliação em
[02-personas.md §2.1](02-personas.md) desta pasta — Owner e Sócio tratados
como o mesmo indivíduo com dois conjuntos de ações, sem criar uma sétima
persona nova nem alterar as personas oficiais.

## 19.2 Nenhum outro conflito de arquitetura, banco ou permissão

Revisão cruzada contra [../03-fluxos-e-telas.md](../03-fluxos-e-telas.md),
[../07-design-system.md](../07-design-system.md),
[../08-especificacao-modulos.md](../08-especificacao-modulos.md) e
[../database/](../database/00-resumo-modelagem.md) não encontrou divergência
que exigisse alteração de entidade, permissão ou regra de negócio. Esta etapa
é estritamente aditiva: wireframes, componentes, UX writing e acessibilidade
elaboram o que já era arquitetura oficial, sem redefini-la.

## 19.3 Decisões de UX tomadas nesta etapa (sem correspondente explícito anterior)

| Decisão | Racional |
|---|---|
| Bottom navigation de 4 itens em mobile, substituindo a Sidebar | Alcance de polegar mais rápido que menu deslizante em telas pequenas |
| Ação primária de tela vira botão fixo no rodapé em formulários longos de mobile | Evita rolar até o topo/fim para agir — thumb zone |
| Streaming de IA não anuncia token a token para leitor de tela, só ao final | Anúncio por token seria leitura fragmentada e inutilizável |
| Command Palette em mobile abre em tela cheia, não overlay flutuante | Overlay parcial reduziria demais o espaço de resultado em telas pequenas |
| Documento confidencial sem permissão aparece na lista (título visível) mas bloqueia o preview | Preserva contagem/organização da lista sem vazar conteúdo |
| Atalhos de tecla única seguem padrão de sequência (`G` então `D`) em vez de tecla isolada | Reduz conflito com teclas de navegação de leitores de tela |

## 19.4 Riscos desta etapa

| Risco | Mitigação |
|---|---|
| Volume de componentes (~35) pode gerar inconsistência se implementados por desenvolvedores diferentes sem revisão central | Governança de design system já prevista em [../07-design-system.md §7.10](../07-design-system.md); nenhum componente novo entra sem passar pelo checklist de [18-checklists.md §18.3](18-checklists.md) |
| Wireframes ASCII têm menor fidelidade que um protótipo Figma real | Este documento é a especificação de comportamento e conteúdo; a etapa de design visual em Figma consome este documento como input, não o substitui |
| Streaming de IA e resumo com fontes clicáveis dependem de latência real da API (ainda não especificada) | A especificação de API (Prompt 4) precisa confirmar SSE e tempo de primeiro token compatíveis com as metas de [09-busca-global.md §9.13](09-busca-global.md) e [06-processos.md §6.2.1](06-processos.md) |

## 19.5 Pendências explícitas para a próxima etapa

1. Confirmar, na especificação de API, os contratos de streaming (SSE) para
   resumo de IA e para atualização de notificação em tempo real, que esta
   etapa assume mas não define em nível de payload.
2. Confirmar payload de busca global (formato de resultado agrupado por tipo)
   compatível com a experiência descrita em [09-busca-global.md](09-busca-global.md).
3. Protótipo de alta fidelidade em Figma — fora do escopo desta etapa
   (documentação, não ferramenta de design).

---

**Anterior:** [18-checklists.md](18-checklists.md) · **Próximo:** [20-contexto-proxima-etapa.md](20-contexto-proxima-etapa.md)
