# 03 — Jornadas do Usuário

> Complementa [../03-fluxos-e-telas.md](../03-fluxos-e-telas.md) com a ótica de
> experiência (o que o usuário vê, sente e decide em cada passo), não apenas a
> lógica de sistema.

---

## 3.1 Cadastro

```mermaid
flowchart TD
    A[Landing] --> B[Formulário: nome, e-mail, senha<br/>ou botão Google/Microsoft]
    B --> C{Método}
    C -->|E-mail| D[Verificação de e-mail<br/>estado: 'confira sua caixa de entrada']
    C -->|OAuth| E[Redirecionamento ao provedor]
    D --> F[Criar Escritório<br/>1 campo obrigatório: nome]
    E --> F
    F --> G[Tour de 4 passos, pulável a qualquer momento]
    G --> H[Dashboard em estado vazio educativo]
```
**Sensação-alvo:** "isso foi rápido" — nenhuma tela pede mais de 3 campos.
**Ponto de atenção de UX:** o botão "Pular" do tour tem o mesmo peso visual do
"Próximo" — pular não pode parecer punição.

## 3.2 Login

```mermaid
flowchart TD
    A[Tela de login] --> B{Método lembrado?}
    B -->|Sim| C[E-mail pré-preenchido]
    B -->|Não| D[Campo em branco]
    C --> E[Senha ou OAuth]
    D --> E
    E --> F{MFA ativo?}
    F -->|Sim| G[Código de 6 dígitos, auto-submit]
    F -->|Não| H[Dashboard]
    G --> H
```
**Sensação-alvo:** familiaridade — layout idêntico a cada visita, campo de
e-mail já focado ao carregar a tela.

## 3.3 Escolha do escritório

```mermaid
flowchart TD
    A[Login bem-sucedido] --> B{Quantos escritórios ativos?}
    B -->|1| C[Vai direto ao Dashboard]
    B -->|Mais de 1| D[Tela de seleção: cards com logo/nome/papel]
    D --> E[Clique no card]
    E --> C
```
**Sensação-alvo:** nunca ambíguo sobre qual escritório está ativo — o nome do
escritório aparece no topo da Sidebar em todas as telas seguintes, sempre
clicável para trocar.

## 3.4 Primeiro acesso (pós-onboarding)

```mermaid
flowchart TD
    A[Dashboard, primeira vez] --> B[3 cartões de ação:<br/>Cadastrar cliente · Criar processo · Convidar equipe]
    B --> C{Usuário clica em qual?}
    C -->|Cadastrar cliente| D[Ver 3.5]
    C -->|Criar processo| E[Ver 3.6]
    C -->|Convidar equipe| F[Modal de convite por e-mail]
```
**Sensação-alvo:** o Dashboard vazio não parece "quebrado" — parece um convite
claro a agir, nunca uma tela sem conteúdo sem explicação.

## 3.5 Primeiro cliente

```mermaid
flowchart TD
    A[Clientes > Novo] --> B[Nome + tipo PF/PJ<br/>único campo obrigatório]
    B --> C[Salvar]
    C --> D[Perfil do cliente criado<br/>estado: 'adicione mais informações quando quiser']
    D --> E{Ação sugerida}
    E --> F[Criar processo para este cliente]
```
**Sensação-alvo:** nenhuma fricção — de "Novo" a "salvo" em menos de 20 segundos.

## 3.6 Primeiro processo

```mermaid
flowchart TD
    A[Processos > Novo] --> B[Etapa 1: nº CNJ opcional + título]
    B --> C{Tem CNJ agora?}
    C -->|Não| D[Pular para título + cliente]
    C -->|Sim| E[Validação em tempo real do dígito verificador]
    D --> F[Salvar rascunho]
    E --> F
    F --> G[Tela do Processo, com aviso sutil:<br/>'complete os dados quando puder']
```
**Sensação-alvo:** o usuário nunca é bloqueado por um campo que não tem à mão
naquele momento.

## 3.7 Primeiro documento

```mermaid
flowchart TD
    A[Dentro do processo > aba Documentos] --> B[Arrasta arquivo para a área pontilhada]
    B --> C[Barra de progresso por arquivo]
    C --> D[Card do documento aparece<br/>estado: PROCESSANDO]
    D --> E[Ícone muda para PRONTO<br/>~segundos depois, sem reload]
    E --> F[Clique abre preview inline]
```
**Sensação-alvo:** "já posso ver o documento antes mesmo do processamento
terminar" — nunca uma tela de espera bloqueante.

## 3.8 Primeiro resumo por IA

```mermaid
flowchart TD
    A[Dentro do processo > botão 'Resumir com IA'] --> B[Painel abre com esqueleto de texto]
    B --> C[Texto aparece em streaming, palavra a palavra]
    C --> D[Selo: 'Gerado por IA — confira antes de usar']
    D --> E[Fontes citadas, clicáveis, abrem o trecho de origem]
    E --> F[👍 / 👎 ao final]
```
**Sensação-alvo:** confiança calibrada — o usuário sente que pode verificar
cada afirmação, nunca que precisa "confiar cegamente".

## 3.9 Primeira busca

```mermaid
flowchart TD
    A[Usuário pressiona Ctrl+K de qualquer tela] --> B[Overlay abre com foco automático no input]
    B --> C[Digita 2-3 letras]
    C --> D[Resultados aparecem agrupados por tipo,<br/>ainda digitando]
    D --> E[Seta para baixo navega, Enter abre]
```
**Sensação-alvo:** "achei antes de terminar de digitar" — ver
[09-busca-global.md](09-busca-global.md) para a engenharia de percepção de
velocidade.

## 3.10 Primeira notificação

```mermaid
flowchart TD
    A[Evento relevante ocorre] --> B[Badge no sino da Topbar incrementa,<br/>sem reload de página]
    B --> C[Clique no sino abre painel lateral]
    C --> D[Notificação com ícone por tipo + tempo relativo]
    D --> E[Clique navega ao contexto exato,<br/>marca como lida automaticamente]
```
**Sensação-alvo:** o clique na notificação sempre leva ao lugar certo — nunca
a uma tela genérica onde o usuário precisa procurar de novo.

## 3.11 Primeiro comentário

```mermaid
flowchart TD
    A[Dentro do processo/documento > aba Comentários] --> B[Campo de texto sempre visível no rodapé,<br/>sem precisar clicar 'novo comentário']
    B --> C[Digita e pressiona Enter ou clica Enviar]
    C --> D[Comentário aparece imediatamente<br/>otimistic UI, antes da confirmação do servidor]
    D --> E{Falhou no servidor?}
    E -->|Sim| F[Marca discreta de erro + botão 'tentar novamente']
    E -->|Não| G[Estado normal permanece]
```
**Sensação-alvo:** comentar parece tão rápido quanto mandar mensagem de
WhatsApp — nunca há espera perceptível.

## 3.12 Encerramento da sessão

```mermaid
flowchart TD
    A[Menu do usuário > Sair] --> B[Confirmação leve, não bloqueante:<br/>'Tem certeza?' com Cancelar destacado]
    B --> C[Sessão revogada no servidor]
    C --> D[Redireciona ao Login]
    D --> E[Campo de e-mail já preenchido<br/>para próximo acesso mais rápido]
```
**Sensação-alvo:** sair é tão simples quanto entrar — sem etapas extras, sem
perguntas desnecessárias ("por que está saindo?").

---

## 3.13 Princípio transversal de todas as jornadas

Nenhuma jornada acima tem mais de 6 passos entre a intenção e a conclusão.
Onde uma jornada real do produto (ex.: configurar SSO, Fase 2) exigir mais
passos, ela é quebrada em uma jornada guiada com indicador de progresso — nunca
apresentada como uma lista única de 10+ itens.

---

**Anterior:** [02-personas.md](02-personas.md) · **Próximo:** [04-navigation.md](04-navigation.md)
