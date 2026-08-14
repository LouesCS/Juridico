# 14 — UX Writing

---

## 14.1 Tom de voz

**Direto, humano, sério sem ser frio.** O produto lida com processos jurídicos
reais — nunca usa humor forçado, exclamações excessivas ou linguagem
"descolada de startup". Ao mesmo tempo, evita o jargão árido de software
jurídico legado.

| Fazemos | Não fazemos |
|---|---|
| "Não foi possível salvar. Tente novamente." | "Oops! Algo deu errado 😅" |
| "3 documentos enviados com sucesso." | "Parabéns! Você é incrível!" |
| "Este processo está sob segredo de justiça." | "Acesso negado. Erro 403." |
| "Gerado por IA — confira antes de usar." | "IA garante 99% de precisão!" |

Segunda pessoa, tratamento direto ("você"), sem gerúndio floreado
("Carregando..." nunca "Estamos carregando tudo para você...").

## 14.2 Mensagens de erro

Estrutura: **o que aconteceu** (sem jargão técnico) + **o que fazer** (ação
clara). Código de correlação sempre disponível, mas em texto pequeno, nunca
como parte principal da frase.

| Situação | Mensagem |
|---|---|
| Falha genérica de rede | "Não foi possível completar a ação. Verifique sua conexão e tente novamente." |
| CNJ inválido | "Este número de processo não parece válido. Confira os dígitos." |
| CNJ duplicado | "Já existe um processo com este número neste escritório. [Ver processo existente]" |
| Upload — arquivo muito grande | "Este arquivo tem mais de 100 MB. Envie um arquivo menor ou entre em contato com o suporte." |
| Upload — tipo não suportado | "Não aceitamos arquivos .exe. Formatos aceitos: PDF, Word, Excel, imagens." |
| Sessão expirada | "Sua sessão expirou. Entre novamente para continuar." |
| Sem permissão (recurso existe mas negado) | Nunca exibida como tal — reafirma 404 disfarçado por segurança |
| Recurso não encontrado | "Não encontramos o que você procurava. [Voltar ao Dashboard]" |
| IA indisponível | "Não foi possível gerar o resumo agora. Tente novamente em alguns instantes." |
| Conflito de edição concorrente | "Este processo foi atualizado por outra pessoa. Recarregue para ver a versão mais recente." |

## 14.3 Mensagens de sucesso

Curtas, sem celebração exagerada, específicas sobre o que aconteceu:

- "Processo criado."
- "3 documentos enviados."
- "Comentário adicionado."
- "Convite enviado para joao@escritorio.com."
- "Senha alterada. Suas outras sessões foram encerradas."

## 14.4 Confirmações

| Ação | Texto |
|---|---|
| Sair (logout) | "Sair da sua conta?" — botões: "Cancelar" / "Sair" |
| Arquivar processo | "Arquivar este processo? Você pode reativá-lo depois." — "Cancelar" / "Arquivar" |
| Excluir documento (soft delete, recuperável) | "Mover para a lixeira? Você pode restaurar em até 30 dias." — "Cancelar" / "Mover para a lixeira" |
| Excluir permanentemente (da lixeira) | "Esta ação não pode ser desfeita. Digite o nome do documento para confirmar." — campo de digitação + "Excluir permanentemente" |
| Encerrar escritório | "Esta ação encerra o acesso de toda a equipe. Digite o nome do escritório para confirmar." |
| Cancelar prazo fatal | "Cancelar este prazo fatal? Informe o motivo." — campo de texto obrigatório |

## 14.5 Avisos (warnings não bloqueantes)

- Documento duplicado: "Este arquivo já existe como '<nome>' em <local>. Enviar mesmo assim?" — nunca bloqueia, apenas informa.
- Cliente com documento já cadastrado: "Já existe um cliente com este CPF: <nome>. [Ver cadastro]" — segue permitindo salvar.
- Resumo de IA desatualizado: "Este processo mudou desde a geração deste resumo. [Atualizar]"
- Prazo se aproximando (nas 24h): faixa amarela sutil no topo da aba Prazos: "Você tem 1 prazo vencendo hoje."

## 14.6 Estados vazios

Reafirma variantes de [../03-fluxos-e-telas.md §3.11](../03-fluxos-e-telas.md).
Texto sempre em duas partes — título + explicação curta:

| Contexto | Título | Explicação |
|---|---|---|
| Dashboard, primeiro uso | "Vamos começar" | "Cadastre seu primeiro cliente ou processo para ver tudo em um só lugar." |
| Lista de processos vazia (com filtro) | "Nenhum processo encontrado" | "Tente ajustar os filtros ou [limpar todos]." |
| Timeline recém-criada | (sem título — mostra só o evento de criação, não é um estado vazio de fato) | — |
| Documentos de uma pasta vazia | "Esta pasta está vazia" | "Envie o primeiro documento arrastando um arquivo aqui." |
| Notificações em dia | "Você está em dia" | "Nenhuma notificação nova no momento." |
| Busca sem resultado | "Nada encontrado para '<termo>'" | "Confira a ortografia ou tente outro termo." |

## 14.7 Mensagens da IA

Reafirma requisitos inegociáveis de
[../08-especificacao-modulos.md §8.5](../08-especificacao-modulos.md):

- Selo fixo: **"Gerado por IA — confira antes de usar."**
- Rodapé de fonte: "Fonte: <documento>, página <n>" (clicável).
- Feedback: "Este resumo foi útil?" 👍 👎 — ao clicar 👎, campo opcional
  "O que faltou ou está incorreto?" (nunca obrigatório).
- Erro: "Não foi possível gerar o resumo agora. Tente novamente em alguns
  instantes." — nunca expõe erro técnico do provedor.
- Cota atingida: "Este escritório atingiu o limite de resumos de IA do mês.
  Fale com o administrador da conta." (visível a quem não é admin; admin vê
  o link direto para a tela de uso).

## 14.8 Mensagens de LGPD

- Exportação solicitada: "Estamos preparando seus dados. Você receberá um
  link por e-mail em breve."
- Exclusão de conta: "Isso vai remover suas informações pessoais. Registros
  de autoria em processos e documentos serão mantidos, sem seus dados
  pessoais associados, conforme exigido por lei."
- Consentimento (quando aplicável, fora do MVP): nunca pré-marcado.

## 14.9 Mensagens de upload

- Em progresso: "Enviando contrato.pdf... 45%"
- Concluído: sem mensagem própria — o card muda de estado (ícone de check),
  reafirma princípio de feedback inline sobre toast redundante.
- Processando: "Processando..." (badge no card, não bloqueia visualização).
- Antivírus detectou ameaça: "Este arquivo foi bloqueado por segurança e não
  pode ser baixado. Entre em contato com o suporte se acredita que isso é um
  engano."

## 14.10 Mensagens de notificação (corpo, reafirma canal e-mail sem PII)

- In-app: "Novo andamento em Ação Trabalhista — Silva."
- E-mail (nunca conteúdo sigiloso no corpo): "Há uma atualização em um dos
  seus processos. [Ver no Quilombo Dev]" — o link exige login, o conteúdo
  sensível só aparece depois da autenticação.

## 14.11 Princípios gerais de escrita

1. Frases curtas, voz ativa ("Enviamos o convite" em vez de "O convite foi
   enviado").
2. Nunca usar jargão técnico de sistema ("payload", "endpoint", "null") em
   texto voltado ao usuário.
3. Toda mensagem de erro tem uma ação sugerida — nunca termina em ponto final
   sem próximo passo, exceto quando o próximo passo é óbvio pelo contexto.
4. Números de processo, CPF/CNPJ e datas sempre em formato brasileiro
   completo, nunca abreviado de forma ambígua.
5. Confirmações de ação destrutiva nunca usam linguagem passivo-agressiva
   ("Tem certeza ABSOLUTA?") — um único "tem certeza" objetivo basta; a
   fricção certa vem da exigência de digitar o nome, não do tom do texto.

---

**Anterior:** [13-componentes.md](13-componentes.md) · **Próximo:** [15-acessibilidade.md](15-acessibilidade.md)
