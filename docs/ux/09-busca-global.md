# 09 — Busca Global

> **A funcionalidade mais importante do produto.** Reafirma
> [../03-fluxos-e-telas.md §3.6](../03-fluxos-e-telas.md),
> [../08-especificacao-modulos.md §8.4](../08-especificacao-modulos.md) e a
> estratégia de índice de [../database/09-indices-busca-performance.md](../database/09-indices-busca-performance.md).

## 9.1 Comportamento

Abre como overlay centralizado (`Command Palette`) sobre qualquer tela, sem
navegar para longe do contexto atual — fechar a busca (Esc) devolve exatamente
ao estado anterior, scroll incluído. Nunca é uma página própria como
destino principal (existe uma página de "busca avançada" para resultados
extensos, mas o modo primário é sempre o overlay).

## 9.2 Atalhos

| Atalho | Ação |
|---|---|
| `Ctrl+K` / `⌘K` | Abrir de qualquer tela |
| `↑` `↓` | Navegar resultados |
| `Enter` | Abrir resultado selecionado |
| `Tab` | Alternar filtro de escopo (Todos → Processos → Documentos → Clientes → Ações) |
| `Esc` | Fechar, sem alterar a tela de fundo |
| Prefixos de digitação | `p:` processos · `d:` documentos · `c:` clientes · `>` ações — digitados diretamente no campo |

## 9.3 Ranking

Ordem de exibição por grupo, dentro do grupo por relevância (`ts_rank_cd` +
fusão com trigram, reafirma
[../database/09-indices-busca-performance.md §9.3.3](../database/09-indices-busca-performance.md)):

1. Correspondência exata de número (CNJ, número interno, CPF/CNPJ) sobe ao
   topo absoluto, acima de qualquer relevância textual — usuário que digita um
   número está buscando *aquele* registro, não uma lista.
2. Título/nome com o termo no início pontua mais que termo no meio.
3. Processos/documentos recentemente acessados pelo usuário ganham leve boost
   (empate é resolvido por recência, não por ordem alfabética).

## 9.4 Autocomplete

Ao digitar, sugestões aparecem **antes** de pressionar Enter — a busca reage a
cada caractere (debounce de 200ms, reafirma
[../04-arquitetura-frontend.md §4.7](../04-arquitetura-frontend.md)). Campo
vazio mostra "Recentes" (últimas 5 aberturas) + "Sugestões" (atalhos comuns:
"Novo Processo", "Novo Cliente").

## 9.5 Filtros

Chips de escopo no topo do painel de resultados: `Todos` `Processos`
`Documentos` `Clientes` `Tags` `Comentários` — clique ou `Tab` alterna. Filtro
persiste durante a sessão de busca (reabrir `⌘K` mantém o último escopo usado).

## 9.6 Busca por tipo de entidade

| Tipo | O que é buscado |
|---|---|
| Processos | Número CNJ, número interno, título, nome de partes, tags |
| Clientes | Nome, razão social, CPF/CNPJ (mascarado no resultado) |
| Documentos | Nome do arquivo, **conteúdo extraído do PDF** (reafirma diferencial do produto) |
| Tags | Nome da tag — resultado leva à lista filtrada por aquela tag |
| Comentários | Conteúdo do comentário — resultado leva ao contexto (processo/documento) com o comentário destacado |

## 9.7 Resultados recentes

Sem digitar nada, o campo mostra os últimos 5 itens abertos pelo usuário
(qualquer tipo), com ícone de "relógio" — permite reabrir o que se estava
vendo antes sem lembrar o nome exato.

## 9.8 Favoritos

Processos/clientes podem ser marcados como favorito (estrela no header);
favoritos aparecem no topo do grupo correspondente mesmo com relevância
textual ligeiramente menor — pequeno boost de ranking, nunca sobrepõe
correspondência exata de número (regra 1 do §9.3).

## 9.9 Histórico

Histórico de busca (últimos 10 termos digitados, não itens abertos — distinto
de "recentes") acessível por scroll para baixo no estado vazio do campo;
limpável por botão "Limpar histórico".

## 9.10 Teclado

100% navegável sem mouse: abrir (`⌘K`) → digitar → `↓`/`↑` para escolher →
`Enter` para abrir → `Esc` para cancelar em qualquer ponto. Foco visível
(anel de 2px) sempre no item ativo, nunca implícito.

## 9.11 Mobile

Ícone de lupa na Topbar abre a busca em tela cheia (não overlay flutuante —
em telas pequenas, overlay parcial reduz demais o espaço de resultado).
Teclado virtual abre automaticamente com foco no campo. Prefixos de escopo
(`p:`, `d:`) substituídos por chips tocáveis acima do teclado, já que digitar
prefixo em teclado virtual é mais lento que em desktop.

## 9.12 Desktop

Overlay centralizado, 640px de largura, máximo 8 resultados visíveis por
grupo com "ver mais neste grupo" expandindo inline sem fechar o overlay.

## 9.13 Como tornar a busca extremamente rápida (percepção + real)

| Técnica | Efeito |
|---|---|
| Debounce de 200ms, não mais | Resposta parece instantânea sem sobrecarregar o backend a cada tecla |
| Busca em paralelo (léxica + semântica) com fusão no backend | Um resultado nunca espera o outro terminar |
| Renderização progressiva por grupo | Grupo "Processos" aparece assim que pronto, sem esperar "Comentários" |
| Filtro de permissão na query, nunca pós-processamento | Elimina uma etapa inteira de filtragem no cliente |
| Prefetch de rota no hover do resultado | Ao clicar, a tela de destino já começou a carregar |
| Cache de resultado recente (mesma sessão, mesmo termo) | Reabrir a mesma busca é instantâneo |
| Orçamento de latência p95 < 400ms como gate de CI | Regressão de performance é pega antes de chegar ao usuário (reafirma [../database/09-indices-busca-performance.md](../database/09-indices-busca-performance.md)) |
| Skeleton nunca aparece para busca — usa-se o estado "buscando..." discreto no rodapé do painel | Uma busca de 400ms não justifica skeleton (que é feito para operações >1s); skeleton aqui pareceria mais lento do que é |

## 9.14 Estados

| Estado | Comportamento |
|---|---|
| Vazio (sem digitar) | Recentes + Sugestões |
| Buscando | Resultados anteriores permanecem visíveis, esmaecidos, com indicador discreto de atualização — nunca limpa a tela para mostrar um spinner |
| Sem resultado | Mensagem curta + sugestão de checar ortografia + botão "Buscar em toda a busca avançada" |
| Erro (backend indisponível) | "Busca temporariamente indisponível" — nunca trava o overlay, `Esc` sempre funciona |

---

**Anterior:** [08-clientes.md](08-clientes.md) · **Próximo:** [10-perfil.md](10-perfil.md)
