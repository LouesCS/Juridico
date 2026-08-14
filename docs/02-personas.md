# 02 — Personas

Seis personas: cinco internas (usuárias do MVP) e uma externa (Cliente,
planejada para a Fase 3, incluída aqui porque condiciona decisões de modelo de
dados e permissão desde já).

Cada persona traz: contexto, objetivos, dores, comportamento no produto,
funcionalidades críticas, métrica de sucesso pessoal e implicações arquiteturais.

---

## 2.1 Persona 1 — Ricardo Almeida · Sócio / Gestor

**44 anos · Sócio-administrador · Escritório de 18 pessoas · Cível e empresarial**

**Contexto.** Divide o dia entre advogar em causas estratégicas, gerir a equipe e
prospectar clientes. Está sempre em movimento — celular e notebook, muitas vezes
em trânsito. Não tem paciência para software.

**Objetivos**
- Saber o estado da carteira sem convocar reunião.
- Detectar risco (prazo apertado, processo parado, cliente sem retorno) cedo.
- Distribuir carga de trabalho de forma equilibrada.
- Chegar a reunião com cliente sabendo do caso sem reler os autos.

**Dores**
- "Ninguém me dá um panorama; me dão 12 planilhas."
- Descobre problema quando já virou problema.
- Perde 30 minutos antes de cada reunião relendo processo.

**Comportamento no produto**
Entra 2–3× ao dia, sessões curtas (3–8 min). Vive no Dashboard. Usa muito o
resumo por IA antes de reunião. Usa mobile/tablet com frequência acima da média
do time.

**Funcionalidades críticas:** Dashboard executivo · Resumo por IA de processo ·
Visão de carteira por responsável · Notificações de risco.

**Métrica pessoal:** "Consigo responder qualquer pergunta sobre qualquer caso em
menos de 2 minutos."

**Implicações arquiteturais**
- Dashboard precisa de *views* agregadas pré-computadas (não agregar sob demanda
  em cima da tabela de processos).
- Resumo por IA deve ter cache — Ricardo vai reabrir o mesmo resumo várias vezes.
- Responsividade real em tablet é requisito, não bônus.

---

## 2.2 Persona 2 — Camila Torres · Advogada Associada

**31 anos · Advogada plena · Gerencia ~45 processos ativos**

**Contexto.** É a usuária *power*. Passa o dia dentro do sistema: redige, peticiona,
acompanha prazos, atende clientes. É quem mais sofre com fricção de UX e quem mais
ganha com boa ferramenta. É também a maior influenciadora de adoção interna — se
Camila adota, o escritório adota.

**Objetivos**
- Nunca perder prazo.
- Achar a última versão da peça sem caçar em pasta.
- Reaproveitar teses e petições de casos anteriores.
- Registrar andamento rápido, sem interromper o raciocínio.

**Dores**
- "Petição_final_v3_REVISADO_agora_vai.docx" — controle de versão inexistente.
- Sistema atual exige 8 cliques para anexar um documento.
- Precisa abrir 4 sistemas para montar o contexto de um caso.
- Anotações do caso ficam em caderno, WhatsApp e post-it.

**Comportamento no produto**
Sessões longas (1–3h), múltiplas abas, muito teclado. Usaria atalhos se existissem.
Alterna entre Processos e Documentos o tempo todo.

**Funcionalidades críticas:** Busca global (⌘K) · Timeline do processo ·
Versionamento de documentos · Comentários internos · Prazos.

**Métrica pessoal:** "Não perco mais tempo procurando; perco tempo advogando."

**Implicações arquiteturais**
- Atalhos de teclado e command palette são requisito de primeira classe.
- Uploads múltiplos, drag-and-drop, upload em background com progresso.
- Otimistic UI em comentários e edições rápidas — não pode ter tela de espera.
- Estado de filtros da lista de processos deve persistir na URL (ela compartilha links).

---

## 2.3 Persona 3 — Lucas Ferreira · Estagiário

**22 anos · 5º semestre de Direito · 6h/dia · Rotatividade alta**

**Contexto.** Nativo digital, aprende sozinho, mas conhece pouco de processo e
menos ainda do escritório. Faz pesquisa, minuta peças simples, organiza documentos.
Tem medo de errar e de perguntar demais.

**Objetivos**
- Entender o caso rapidamente sem incomodar o advogado responsável.
- Produzir minuta correta na primeira tentativa.
- Aprender pelo próprio sistema.

**Dores**
- Não sabe onde as coisas ficam nem como o escritório organiza.
- Depende de perguntar — e sente que atrapalha.
- Não sabe se o documento que abriu é a versão vigente.

**Comportamento no produto**
Explora por navegação (não por busca, no começo). Lê muito, escreve pouco.
É o maior beneficiário do resumo por IA — usa como ferramenta de aprendizado.

**Funcionalidades críticas:** Resumo por IA · Timeline · Preview de documentos ·
Navegação previsível.

**Métrica pessoal:** "Entendo um processo novo em 10 minutos, sozinho."

**Implicações arquiteturais**
- Permissão restrita por padrão (princípio do menor privilégio) — Lucas não pode
  ver toda a carteira do escritório.
- Todas as ações destrutivas precisam de confirmação e são reversíveis (soft delete).
- Estados vazios devem ensinar, não apenas informar.
- Trilha de auditoria importa: alta rotatividade = necessidade de rastrear acesso.

---

## 2.4 Persona 4 — Sandra Nunes · Assistente Jurídica / Secretária

**38 anos · 12 anos de escritório · Não é formada em Direito**

**Contexto.** É a espinha dorsal operacional. Protocola, cadastra, organiza,
atende cliente ao telefone, controla agenda. Conhece o fluxo do escritório melhor
que muitos advogados. Tem baixa tolerância a mudança de sistema — e é quem mais
sofre com ela.

**Objetivos**
- Cadastrar processo e cliente rápido e sem erro.
- Encontrar informação para responder cliente ao telefone, em tempo real.
- Manter documentos organizados e nomeados de forma consistente.

**Dores**
- Formulários gigantes com campos que ela não sabe preencher.
- Cliente ao telefone perguntando algo e ela sem achar a resposta.
- Retrabalho de digitação: os mesmos dados em três lugares.

**Comportamento no produto**
Volume alto de operações repetitivas. Usa muito lista + filtro. Precisa de
feedback claro de sucesso/erro. É quem descobre bugs primeiro.

**Funcionalidades críticas:** Cadastro rápido de processo/cliente · Upload em lote ·
Busca por nome de cliente ou número de processo · Notificações.

**Métrica pessoal:** "Cadastro um processo em menos de 2 minutos e respondo
qualquer cliente sem colocar na espera."

**Implicações arquiteturais**
- Formulários em etapas com campos obrigatórios mínimos e salvamento de rascunho.
- Validação de número CNJ com máscara e verificação de dígito.
- Autocomplete de cliente/parte para evitar duplicidade de cadastro.
- Mensagens de erro em linguagem humana, nunca código técnico.

---

## 2.5 Persona 5 — Marcos Vieira · Administrador / TI

**36 anos · TI terceirizada ou sócio com perfil técnico · Acesso esporádico**

**Contexto.** Não usa o produto no dia a dia; entra para configurar, resolver
problema e responder auditoria. Responde pelo compliance de LGPD do escritório.

**Objetivos**
- Provisionar e desprovisionar usuários rapidamente (especialmente desligamentos).
- Garantir que cada um veja só o que deve ver.
- Ter resposta pronta para "quem acessou este documento?".
- Configurar SSO com o Google Workspace / Microsoft 365 já existente.

**Dores**
- Sistemas sem log de auditoria utilizável.
- Perfis de permissão rígidos que não refletem a realidade do escritório.
- Desligamento de funcionário sem revogação imediata de acesso.

**Comportamento no produto**
Sessões raras e objetivas. Área administrativa separada. Precisa de exportação.

**Funcionalidades críticas:** Gestão de usuários e convites · Perfis e permissões ·
Log de auditoria com filtro e exportação · Configuração de SSO · Sessões ativas.

**Métrica pessoal:** "Desligo um usuário em 30 segundos e comprovo qualquer acesso
dos últimos 12 meses."

**Implicações arquiteturais**
- RBAC com papéis padrão + permissões granulares por recurso.
- Auditoria imutável, append-only, com retenção mínima de 12 meses.
- Revogação de sessão em tempo real (blacklist de refresh token / versão de sessão).
- SCIM e SSO empresarial planejados como evolução — modelo de identidade deve
  suportar múltiplos provedores por usuário desde já.

---

## 2.6 Persona 6 — Dra. Helena Costa · Cliente do Escritório *(futura — Fase 3)*

**52 anos · Diretora jurídica de empresa cliente · Acesso externo**

**Contexto.** Contrata o escritório e quer transparência sem precisar ligar. Hoje
recebe atualização por e-mail esporádico e sente que "está no escuro".

**Objetivos:** acompanhar andamento dos seus casos, acessar documentos que lhe
dizem respeito, falar com o escritório de forma rastreável.

**Dores:** falta de transparência, precisa cobrar atualização, não sabe onde estão
os documentos que assinou.

**Funcionalidades críticas (Fase 3):** Portal do cliente · Timeline pública
(curada) · Documentos compartilhados · Mensagens.

**Implicações arquiteturais — decisivas para o MVP**
- O modelo de domínio precisa distinguir, **desde já**, `visibilidade: INTERNA |
  COMPARTILHADA` em Documentos, Comentários e eventos de Timeline. Retrofitar isso
  depois seria uma migração de risco alto em dado sigiloso.
- `Usuario` precisa de um tipo (`INTERNO | EXTERNO`) para não misturar identidade
  de equipe com identidade de cliente.
- Comentário interno **nunca** pode vazar para a timeline do cliente — isso é
  regra de negócio de nível de segurança, não de UI.

---

## 2.7 Matriz Persona × Módulo

Intensidade de uso: ●●● crítico · ●● relevante · ● eventual · — sem acesso

| Módulo | Sócio | Advogado | Estagiário | Assistente | Admin | Cliente* |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Dashboard | ●●● | ●●● | ●● | ●● | ● | ●● |
| Processos — leitura | ●●● | ●●● | ●● | ●● | ● | ●● |
| Processos — escrita | ●● | ●●● | ● | ●● | — | — |
| Documentos — leitura | ●● | ●●● | ●●● | ●● | ● | ●● |
| Documentos — upload | ● | ●●● | ●● | ●●● | — | ● |
| Busca Global | ●●● | ●●● | ●●● | ●●● | ● | ● |
| Resumo por IA | ●●● | ●●● | ●●● | ● | — | — |
| Comentários internos | ●● | ●●● | ●● | ●● | — | — |
| Notificações | ●●● | ●●● | ●● | ●●● | ● | ●● |
| Perfil | ● | ● | ● | ● | ● | ● |
| Administração | ●● | — | — | — | ●●● | — |
| Auditoria | ● | — | — | — | ●●● | — |

\* Cliente = Fase 3.

## 2.8 Anti-persona

**Quem o Quilombo Dev não atende no MVP:** departamento jurídico de grande
corporação (>200 usuários, exige workflow customizável e integração com ERP),
advogado autônomo puro (não tem dor de colaboração, o preço não fecha) e
escritórios de contencioso de massa com dezenas de milhares de processos (o
problema é automação de robô, não recuperação de conhecimento).

Declarar isso evita que o roadmap seja sequestrado por pedidos fora do centro.

---

**Anterior:** [01-visao-produto.md](01-visao-produto.md) · **Próximo:** [03-fluxos-e-telas.md](03-fluxos-e-telas.md)
