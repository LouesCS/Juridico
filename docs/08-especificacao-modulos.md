# 08 — Especificação Funcional dos Módulos do MVP

> Para cada módulo: objetivo, regras de negócio, comportamento de tela, endpoints
> principais, eventos, permissões e critérios de aceite.

---

## 8.1 Dashboard

**Objetivo.** Responder, em uma tela e em menos de 5 segundos: *o que exige minha
atenção hoje?*

### Composição por papel

| Bloco | Sócio | Advogado | Estagiário | Assistente |
|---|:--:|:--:|:--:|:--:|
| Prazos críticos | Do escritório | Meus | Atribuídos a mim | Do escritório |
| Meus processos | Carteira + favoritos | Meus ativos | Atribuídos | Recentes |
| Atividade recente | Escritório | Meus processos | Meus processos | Escritório |
| Notificações não lidas | ✓ | ✓ | ✓ | ✓ |
| Métricas | ✓ | Pessoais | — | — |
| Documentos recentes | ✓ | ✓ | ✓ | ✓ |
| Atalhos rápidos | ✓ | ✓ | ✓ | ✓ |

### Regras
- Prazos críticos: janela de 30 dias, ordenados por vencimento, máximo 8 itens,
  link "ver todos".
- Métricas do sócio: processos ativos, novos no mês, encerrados no mês, prazos em
  risco, distribuição por responsável, valor total da carteira.
- Cada bloco carrega de forma independente (Suspense) e falha de forma isolada
  (Error Boundary próprio).
- Blocos alimentados por *views* agregadas, atualizadas por evento — jamais por
  agregação síncrona sobre a tabela de processos.

### Endpoints
`GET /v1/dashboard/summary` · `/deadlines` · `/activity` · `/metrics`

### Critérios de aceite
Carrega em <1,5s (p95) · zero agregação síncrona pesada · respeita permissões ·
estado vazio educativo no primeiro acesso · responsivo em tablet.

---

## 8.2 Processos

**Objetivo.** Ser a fonte única de verdade sobre cada caso.

### Regras de negócio
1. Número CNJ validado (dígito verificador) e único por escritório.
2. Detecção de duplicidade obrigatória no cadastro.
3. Todo processo tem exatamente um responsável ativo.
4. Mudança de responsável gera evento na timeline e notifica ambos.
5. `segredoJustica` restringe acesso a responsável, equipe e SOCIO/OWNER —
   sobrepõe-se a `case:read:all`.
6. Arquivamento é reversível; exclusão é soft delete com lixeira de 30 dias.
7. Processo `ARQUIVADO` não aceita novos prazos.
8. Toda alteração de campo relevante gera entrada na timeline e na auditoria.
9. `ultimaAtualizacaoEm` alimenta o alerta de "processo parado" (>60 dias sem evento).

### Lista
Filtros: status, responsável, cliente, área, tribunal, fase, tags, faixa de data,
"só os meus", "com prazo em N dias". Estado na URL. Visões salvas por usuário.
Ações em lote: atribuir responsável, adicionar tag, arquivar (com permissão).

### Detalhe
Abas conforme [03](03-fluxos-e-telas.md) §3.4.2. Header fixo com número CNJ, título,
cliente, status, responsável, próximo prazo e ações (editar, resumir com IA,
adicionar documento, adicionar prazo, comentar, arquivar).

### Endpoints
```
GET    /v1/cases                     Lista com filtros e cursor
POST   /v1/cases                     Criar
GET    /v1/cases/:id                 Detalhe
PATCH  /v1/cases/:id                 Atualizar
DELETE /v1/cases/:id                 Soft delete
POST   /v1/cases/:id/archive
POST   /v1/cases/:id/assign
GET    /v1/cases/:id/timeline        Cursor
POST   /v1/cases/:id/timeline        Andamento manual
GET    /v1/cases/:id/documents
GET    /v1/cases/:id/deadlines
GET    /v1/cases/:id/parties
POST   /v1/cases/:id/parties
GET    /v1/cases/:id/audit
```

### Permissões
`case:create` · `case:read:{all|team|assigned}` · `case:update` · `case:delete` ·
`case:archive` · `case:assign` · `case:read:confidential`

### Critérios de aceite
Cadastro completo em <2 min · CNJ inválido bloqueado com mensagem clara ·
duplicidade detectada · timeline pagina 10k+ eventos sem degradar · filtros
compartilháveis por link · segredo de justiça respeitado em lista, busca e detalhe.

---

## 8.3 Documentos

**Objetivo.** Eliminar a pasta de rede e o versionamento por nome de arquivo.

### Regras de negócio
1. Formatos aceitos: PDF, DOCX, DOC, XLSX, PPTX, TXT, RTF, ODT, JPG, PNG, TIFF, EML, MSG.
2. Limite: 100 MB por arquivo (configurável por plano).
3. Upload direto ao storage por URL pré-assinada — arquivo não passa pela API.
4. Antivírus obrigatório antes de disponibilizar para download.
5. Nova versão nunca sobrescreve; versão anterior permanece acessível.
6. Versão é imutável após criada.
7. Deduplicação por SHA-256 dentro do tenant (mesmo arquivo → aviso, não bloqueio).
8. **Toda visualização e download gera evento de auditoria** — sigilo profissional.
9. Soft delete com lixeira de 30 dias; exclusão do processo não exclui documentos.
10. Documento em `PROCESSANDO` é visível e baixável, mas ainda não buscável por conteúdo.

### Pipeline de processamento
```
Upload → Antivírus → Extração de texto → [OCR se necessário]
       → Thumbnail → Indexação léxica → Embeddings → PRONTO
```
Cada etapa é um job com retry e DLQ. Falha em etapa não-crítica (thumbnail) não
impede o estado `PRONTO`; falha em antivírus bloqueia o documento.

### Biblioteca
Visão em grid ou lista · filtros por tipo, processo, cliente, período, autor,
tags · agrupamento por processo ou tipo · preview inline (PDF nativo, imagem
nativa, Office via conversão) · upload múltiplo com progresso individual.

### Endpoints
```
POST   /v1/documents/presign         URL de upload
POST   /v1/documents                 Confirmar upload + metadados
GET    /v1/documents
GET    /v1/documents/:id
PATCH  /v1/documents/:id
DELETE /v1/documents/:id
GET    /v1/documents/:id/download    URL assinada de curta duração (5 min)
GET    /v1/documents/:id/preview
POST   /v1/documents/:id/versions
GET    /v1/documents/:id/versions
POST   /v1/documents/:id/restore     Da lixeira
```

### Permissões
`document:create` · `document:read:{all|team|assigned}` · `document:update` ·
`document:delete` · `document:download` · `document:share`

### Critérios de aceite
Upload de 10 arquivos simultâneos com progresso por arquivo · documento buscável
por conteúdo em <60s após upload · versão anterior sempre recuperável · todo
download auditado · falha de upload com mensagem específica por arquivo.

---

## 8.4 Busca Global

**Objetivo.** A funcionalidade âncora — encontrar qualquer coisa em segundos.

### Escopo indexado
Processos (número, título, partes, tags, assunto) · Documentos (título + **conteúdo
extraído**) · Clientes (nome, documento, contatos) · Pessoas (membros) ·
Comentários · Ações do aplicativo.

### Regras
1. Filtro de permissão aplicado **na query do banco**, nunca no cliente.
2. Processos em segredo de justiça só aparecem para quem tem acesso.
3. Busca híbrida: léxica (full-text + trigram para typo) + semântica (pgvector),
   fundidas por Reciprocal Rank Fusion.
4. Debounce de 200ms; resultados parciais renderizados progressivamente.
5. Destaque do trecho relevante no resultado (snippet com termo em evidência).
6. Prefixos de escopo: `p:` processos · `d:` documentos · `c:` clientes · `>` ações.
7. Histórico de busca por usuário (últimas 10), limpável.
8. Busca vazia mostra recentes + sugestões, não tela em branco.

### Endpoints
`GET /v1/search?q=&types=&limit=` · `GET /v1/search/suggestions` ·
`GET /v1/search/recent` · `POST /v1/search/reindex` *(admin)*

### Critérios de aceite
p95 < 400ms · zero resultado fora da permissão (teste automatizado obrigatório) ·
navegação 100% por teclado · conteúdo interno de PDF encontrável · tolerância a
erro de digitação em nome de cliente.

---

## 8.5 Resumo por IA

**Objetivo.** Entregar compreensão, não texto.

### Tipos de resumo

| Tipo | Entrada | Saída |
|---|---|---|
| Resumo geral do processo | Metadados + timeline + documentos-chave | 3–5 parágrafos: do que se trata, onde está, o que vem |
| Resumo executivo | Idem | 5 bullets para o sócio antes de reunião |
| Cronologia | Timeline + datas dos documentos | Linha do tempo narrada |
| Pontos-chave | Documentos selecionados | Lista de fatos, pedidos, valores e decisões |
| Resumo de documento | Um documento | 1–3 parágrafos + pontos principais |

### Regras — as mais rígidas do produto
1. **Toda saída exibe o selo "Gerado por IA — confira antes de usar".** Sem exceção.
2. **Toda afirmação relevante cita a fonte** (documento + página/trecho), clicável.
3. Streaming obrigatório (SSE) — o texto aparece enquanto é gerado.
4. Cache por `hashContexto`; invalidado quando o processo muda.
5. Cota por tenant e por usuário; aviso ao aproximar do limite.
6. RAG: para contexto longo, recuperar os trechos mais relevantes por embedding.
7. Feedback 👍/👎 obrigatório na interface e registrado — é o dado que orienta a
   evolução dos prompts.
8. Falha da IA nunca quebra a tela: mensagem clara + botão tentar novamente.
9. Prompts versionados; `promptVersao` gravada em cada saída.
10. Dados enviados ao provedor sob contrato de **não-treinamento**; nenhum dado de
    documento é usado para treinar modelo. Ver [09](09-seguranca-lgpd.md) §9.8.
11. Resumo salvo na timeline é marcado como origem `IA` e não se mistura com
    conteúdo humano.

### Endpoints
```
POST /v1/ai/summaries              Gerar (SSE)
GET  /v1/ai/summaries/:id
GET  /v1/ai/summaries?entityId=
POST /v1/ai/summaries/:id/feedback
POST /v1/ai/summaries/:id/regenerate
GET  /v1/ai/usage                  Consumo e cota do tenant
```

### Permissões
`ai:summarize:case` · `ai:summarize:document` · `ai:usage:read` *(admin)*

### Critérios de aceite
Primeiro token em <2s · resumo completo de processo médio em <15s · 100% das
saídas com selo e com ≥1 fonte citada · custo por chamada registrado · queda do
provedor não afeta módulos não-IA.

---

## 8.6 Notificações

**Objetivo.** Informar sem virar ruído — o principal risco deste módulo.

### Catálogo de eventos

| Evento | Padrão in-app | Padrão e-mail | Desativável |
|---|:--:|:--:|:--:|
| Prazo D-7 / D-3 / D-1 | ✓ | ✓ | ✓ |
| Prazo vencido | ✓ | ✓ | ✓ |
| Processo atribuído a mim | ✓ | ✓ | ✓ |
| Novo andamento em meu processo | ✓ | digest | ✓ |
| Documento adicionado | ✓ | digest | ✓ |
| @menção em comentário | ✓ | ✓ | ✓ |
| Resumo de IA concluído | ✓ | — | ✓ |
| Convite aceito | ✓ | — | ✓ |
| Novo login em dispositivo novo | ✓ | ✓ | **Não** |
| Senha alterada | ✓ | ✓ | **Não** |
| Permissão alterada | ✓ | ✓ | **Não** |

### Regras
1. Preferência granular por tipo × canal.
2. Agrupamento em digest para eventos de alta frequência.
3. Alertas de segurança não são desativáveis.
4. E-mail nunca contém dado sigiloso — apenas contexto mínimo e link autenticado.
5. Entrega in-app em tempo real via SSE.
6. Idempotência: mesmo evento não gera notificação duplicada.
7. Retenção: 90 dias in-app; arquivamento automático depois.

### Endpoints
`GET /v1/notifications` · `GET /v1/notifications/unread-count` ·
`POST /v1/notifications/:id/read` · `POST /v1/notifications/read-all` ·
`GET|PATCH /v1/notifications/preferences` · `GET /v1/notifications/stream` (SSE)

### Critérios de aceite
Notificação chega em <5s do evento · badge preciso · preferências respeitadas ·
zero duplicata · e-mail sem conteúdo sigiloso.

---

## 8.7 Perfil e Conta

### Seções
**Dados pessoais** — nome, avatar, cargo, OAB, telefone, e-mail (alteração exige
verificação do novo endereço).
**Preferências** — tema, idioma, fuso, densidade, página inicial, notificações.
**Segurança** — alterar senha (invalida todas as sessões), MFA (ativar/desativar
com códigos de recuperação), sessões ativas com dispositivo/IP/último acesso e
revogação individual ou total, contas vinculadas (Google/Microsoft).
**Privacidade (LGPD)** — exportar meus dados (JSON + arquivos, assíncrono, link
com TTL), histórico do meu acesso, solicitar exclusão da conta.

### Regras
1. Alteração de senha requer a senha atual e revoga todas as demais sessões.
2. Alteração de e-mail requer confirmação nos dois endereços.
3. Não é possível desvincular a última forma de autenticação.
4. Exclusão de conta é **anonimização**, não remoção física — registros de
   auditoria e autoria de atos processuais precisam permanecer íntegros
   (obrigação legal que se sobrepõe ao direito de eliminação — LGPD art. 16, I).
5. Exportação de dados entregue em até 15 dias (na prática, minutos).

### Endpoints
`GET|PATCH /v1/me` · `PATCH /v1/me/preferences` · `POST /v1/me/password` ·
`POST /v1/me/mfa/enable|verify|disable` · `GET /v1/me/sessions` ·
`DELETE /v1/me/sessions/:id` · `POST /v1/me/export` · `POST /v1/me/delete-request`

---

## 8.8 Administração *(ADMIN / OWNER)*

**Usuários:** lista com status e último acesso · convidar (e-mail + papel) ·
reenviar/revogar convite · alterar papel · desativar (revogação imediata de sessão) ·
transferir carteira ao desativar.

**Perfis e permissões:** papéis do sistema (somente leitura) · papéis customizados ·
matriz de permissões com visualização clara · overrides por usuário · simulação
("o que este usuário consegue ver?").

**Auditoria:** filtro por período, ator, ação, recurso, resultado · exportação CSV ·
detalhe com antes/depois · retenção de 12 meses quente.

**Escritório:** dados, logo, cor primária, áreas de atuação, configurações
(MFA obrigatório, domínios de SSO, política de retenção).

**Integrações:** Google Workspace, Microsoft 365, provedores de e-mail.

**Faturamento:** plano, uso de armazenamento, cota de IA, usuários ativos.

---

## 8.9 Matriz consolidada de permissões

| Permissão | OWNER | ADMIN | SOCIO | ADVOGADO | ESTAGIARIO | ASSISTENTE |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| `case:create` | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| `case:read` | all | all | all | team | assigned | all |
| `case:update` | ✓ | ✓ | ✓ | ✓ (seus) | — | ✓ (campos básicos) |
| `case:delete` | ✓ | ✓ | ✓ | — | — | — |
| `case:read:confidential` | ✓ | — | ✓ | ✓ (seus) | — | — |
| `document:create` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `document:download` | ✓ | ✓ | ✓ | ✓ | ✓ (seus) | ✓ |
| `document:delete` | ✓ | ✓ | ✓ | ✓ (seus) | — | — |
| `client:manage` | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| `ai:summarize` | ✓ | — | ✓ | ✓ | ✓ | — |
| `user:invite` | ✓ | ✓ | ✓ | — | — | — |
| `user:manage` | ✓ | ✓ | — | — | — | — |
| `role:manage` | ✓ | ✓ | — | — | — | — |
| `audit:read` | ✓ | ✓ | ✓ (limitado) | — | — | — |
| `billing:manage` | ✓ | — | — | — | — | — |

> `ADMIN` não recebe `case:read:confidential` por padrão: administrar o sistema
> não é motivo legítimo para ler autos sob segredo de justiça. Separação entre
> poder administrativo e acesso a conteúdo é boa prática de segurança e reduz
> superfície de risco em auditoria.

---

**Anterior:** [07-design-system.md](07-design-system.md) · **Próximo:** [09-seguranca-lgpd.md](09-seguranca-lgpd.md)
