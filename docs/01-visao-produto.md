# 01 — Visão de Produto, Proposta de Valor e Diferenciais

> **Produto:** Quilombo Dev — Workspace Jurídico Inteligente
> **Versão do documento:** 1.0 | **Status:** Baseline arquitetural do MVP

---

## 1.1 O problema

Escritórios de advocacia pequenos e médios (3 a 50 pessoas) operam com o
conhecimento fragmentado em seis lugares ao mesmo tempo: o sistema de
gerenciamento processual, o e-mail, o WhatsApp, a pasta de rede, o Google Drive e
a cabeça do sócio responsável. O custo disso não é abstrato:

| Sintoma observado | Consequência econômica |
|---|---|
| Advogado gasta 20–40 min localizando a última petição de um caso | Hora técnica consumida em tarefa não faturável |
| Estagiário refaz pesquisa que já existia em outro processo | Retrabalho puro |
| Sócio precisa perguntar "como está o caso X?" em reunião | Ausência de visão consolidada de carteira |
| Prazo descoberto tarde porque estava só no e-mail de alguém | Risco de perda de prazo → risco de responsabilidade civil |
| Onboarding de novo advogado leva semanas | Custo de ramp-up alto |

O software jurídico tradicional resolveu o *registro* (cadastrar processo,
cadastrar andamento) e ignorou a *recuperação* (encontrar, entender, decidir).
A interface desses sistemas é densa, cheia de abas, formulários de 40 campos e
tabelas que exigem treinamento. O usuário aprende a conviver com a ferramenta em
vez de ser servido por ela.

## 1.2 Visão do produto

> **Quilombo Dev é o lugar onde o escritório guarda o que sabe — e onde qualquer
> pessoa da equipe encontra, entende e age sobre esse conhecimento em segundos.**

Não é mais um sistema de gestão processual. É um **workspace**: um ambiente único
onde processos, documentos, pessoas e prazos convivem, e onde a camada de
inteligência artificial trabalha como um assistente que já leu todos os autos.

Horizonte de 3 anos: tornar-se a primeira tela que o advogado abre pela manhã e
a última que fecha à noite, substituindo a planilha de controle, o grupo de
WhatsApp de prazos e a pasta de rede.

## 1.3 Proposta de valor

**Para** escritórios de advocacia de pequeno e médio porte
**que** perdem tempo produtivo procurando informação dispersa,
**o Quilombo Dev** é um workspace jurídico inteligente
**que** centraliza processos e documentos e devolve a informação certa em
segundos, com resumos gerados por IA.
**Diferente de** sistemas jurídicos legados (densos, orientados a cadastro),
**nosso produto** é orientado a *recuperação e compreensão*: busca global
instantânea, interface limpa e IA nativa — não um plugin cobrado à parte.

### Declaração de valor por papel

| Papel | Ganho concreto |
|---|---|
| Sócio | Visão de carteira em uma tela; sabe o status sem perguntar |
| Advogado | Encontra a peça certa em <10s; entra em audiência com resumo do caso |
| Estagiário | Autonomia sem depender de tutor para achar arquivo |
| Assistente | Cadastro rápido, sem formulários intermináveis |
| Administrador | Controle de acesso e trilha de auditoria sem planilha paralela |

## 1.4 Diferenciais competitivos

1. **Busca global universal (⌘K / Ctrl+K)**
   Um único campo pesquisa processos, documentos, clientes, pessoas e conteúdo
   *dentro* dos PDFs. É a funcionalidade âncora do produto — todo o resto orbita
   em torno dela.

2. **IA nativa, contextual e rastreável**
   Resumo de processo, resumo de documento e extração de pontos-chave. Toda
   saída de IA cita a fonte (documento + página) e exibe selo *"Gerado por IA —
   confira antes de usar"*. IA não é módulo separado: é um botão dentro do
   contexto onde a pergunta nasce.

3. **Interface limpa como requisito de produto, não como estética**
   Densidade informacional controlada, tipografia legível, hierarquia visual
   explícita, dark/light mode. Meta declarada: qualquer pessoa do escritório usa
   sem treinamento formal.

4. **Timeline unificada do processo**
   Andamentos, documentos, comentários internos e eventos de IA em uma linha do
   tempo única e filtrável — a "história do caso" contada uma vez só.

5. **Multi-tenant com isolamento rígido**
   Cada escritório é um tenant. Isolamento aplicado na camada de dados, não só na
   de aplicação. Requisito inegociável para dado sob sigilo profissional.

6. **LGPD e sigilo profissional como arquitetura, não como checkbox**
   Auditoria de acesso, minimização de dados, base legal declarada por finalidade
   e política explícita de não-treinamento de modelos com dados do cliente.

## 1.5 Escopo do MVP

**Dentro do MVP (v1.0):**

| # | Módulo | Essência |
|---|---|---|
| 1 | Autenticação | E-mail/senha + Google + Microsoft, MFA opcional |
| 2 | Dashboard | Prazos, meus processos, atividade recente, atalhos |
| 3 | Processos | Lista, detalhe, timeline, partes, prazos, documentos |
| 4 | Documentos | Upload, versionamento, preview, vínculo com processo |
| 5 | Busca Global | Command palette, busca full-text + semântica |
| 6 | Resumo por IA | Resumo de processo e de documento, com citação de fonte |
| 7 | Perfil | Dados pessoais, preferências, sessões ativas, segurança |
| 8 | Notificações | Central in-app + e-mail, preferências por tipo |

**Fora do MVP (declarado explicitamente para evitar escopo difuso):**
Portal do cliente, financeiro/faturamento, timesheet, peticionamento eletrônico,
integração com tribunais (PJe/Projudi/e-SAJ), assinatura digital ICP-Brasil,
app mobile nativo, chat interno, workflows customizáveis, BI avançado.

> **Nota arquitetural:** ainda que fora do MVP, o modelo de domínio e a
> modularização do backend foram desenhados prevendo Portal do Cliente e
> Integração com Tribunais — são as duas evoluções de maior impacto e as que mais
> distorceriam o modelo se fossem ignoradas agora. Ver [06-modelo-dominio.md](06-modelo-dominio.md).

## 1.6 Métricas de sucesso do MVP

| Métrica | Alvo | Como medimos |
|---|---|---|
| Tempo até encontrar um documento | < 15s (mediana) | Telemetria: abertura da busca → clique no resultado |
| Adoção da busca global | ≥ 60% dos usuários ativos/semana | Evento `search.opened` |
| Uso de resumo por IA | ≥ 40% dos processos ativos com ≥1 resumo | Evento `ai.summary.generated` |
| Utilidade percebida da IA | ≥ 70% de 👍 | Feedback inline por resumo |
| Retenção semanal (WAU/MAU) | ≥ 55% | Analytics |
| Tempo de onboarding de novo usuário | < 30 min até primeira ação relevante | Funil de ativação |
| p95 de latência da busca | < 400 ms | APM |

## 1.7 Princípios de produto (regras de decisão)

Quando houver conflito de prioridade, estas regras decidem:

1. **Recuperar > Registrar.** Se um campo de cadastro não melhora a recuperação
   posterior, ele é candidato a ser cortado.
2. **Zero telas de treinamento.** Se a tela precisa de manual, a tela está errada.
3. **A IA sugere, o advogado decide.** Nenhuma saída de IA é apresentada como
   verdade jurídica; sempre com fonte e sempre editável.
4. **Sigilo primeiro.** Em dúvida entre conveniência e isolamento de dados,
   isolamento vence.
5. **Rápido é uma funcionalidade.** Percepção de lentidão na busca invalida a
   proposta de valor inteira.
6. **Um caminho por tarefa.** Evitar múltiplas formas de fazer a mesma coisa —
   isso é o que torna software jurídico confuso.

---

**Próximo:** [02-personas.md](02-personas.md)
