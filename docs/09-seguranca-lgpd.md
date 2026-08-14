# 09 — Segurança, Privacidade e Conformidade

> Contexto agravante: dado de escritório de advocacia é dado sob **sigilo
> profissional** (Estatuto da OAB, art. 7º, II e XIX; CPP, art. 207; CPC, art. 388),
> frequentemente **dado pessoal sensível** (LGPD, art. 5º, II) e, em processos sob
> segredo de justiça, protegido por decisão judicial. O padrão de segurança aqui
> não é "boa prática de SaaS" — é requisito legal com consequência disciplinar
> para o cliente.

---

## 9.1 Modelo de ameaças (resumido)

| Ameaça | Vetor | Mitigação |
|---|---|---|
| Vazamento entre tenants | Bug de filtro, cache mal-chaveado | Tripla defesa: guard + middleware Prisma + RLS; cache prefixado |
| Roubo de sessão | XSS, token vazado | Cookie httpOnly + rotação com detecção de reuso + CSP estrita |
| Escalonamento de privilégio | Falta de checagem de recurso | Guard (ação) + autorização de recurso no use case (registro) |
| Acesso indevido interno | Ex-funcionário, curiosidade | Menor privilégio + auditoria de leitura + revogação imediata |
| Exfiltração de documentos | Download em massa | Auditoria de download, rate limit, alerta de anomalia |
| Injeção de prompt | Conteúdo malicioso em documento | Separação de instrução e conteúdo, saída tratada como texto, sem ferramentas com efeito colateral |
| Upload malicioso | Malware em anexo | Antivírus obrigatório, validação de MIME real, storage isolado sem execução |
| Enumeração | Mensagens de erro reveladoras | Erros genéricos em auth; 404 em vez de 403 em recurso sigiloso |

---

## 9.2 Autenticação

Detalhes de token, OAuth e MFA em [05-arquitetura-backend.md](05-arquitetura-backend.md) §5.5. Complementos:

- **Senhas:** Argon2id; mínimo 12 caracteres; verificação contra vazamentos
  conhecidos por k-anonymity (nenhuma senha sai do servidor).
- **Rate limiting em auth:** 5 tentativas → captcha → bloqueio progressivo.
  Limite por IP **e** por conta (evita bloqueio de conta como ataque de negação).
- **Enumeração:** resposta e tempo constantes em login e em recuperação de senha.
- **Alerta de novo dispositivo:** e-mail imediato, não desativável.
- **MFA obrigatório** para OWNER e ADMIN a partir da Fase 2; configurável como
  obrigatório para todo o escritório.

---

## 9.3 Autorização

Modelo em [05](05-arquitetura-backend.md) §5.6. Princípios inegociáveis:

1. **Negar por padrão.** Ausência de permissão = negado.
2. **Duas verificações.** Ação (guard) + recurso (use case). Nunca só uma.
3. **`NEGAR` vence `CONCEDER`.** Override de negação tem precedência absoluta.
4. **Segredo de justiça sobrepõe papel.** Nem `case:read:all` dá acesso.
5. **Frontend esconde, backend recusa.** Nenhuma decisão de segurança no cliente.
6. **Testes de autorização são obrigatórios** — cada endpoint tem teste de acesso
   negado. Isso entra no Definition of Done, não em backlog.

---

## 9.4 Proteção de dados

### Em trânsito
TLS 1.3 (mínimo 1.2), HSTS com `preload`, certificados gerenciados, `Secure` em
todos os cookies.

### Em repouso
Criptografia de disco no banco e no storage (AES-256). **Criptografia em nível de
campo** para: segredo de MFA, tokens de integração, dados bancários (fase futura).
Chaves em KMS, com rotação anual.

### Armazenamento de arquivos
Bucket privado, sem acesso público em nenhuma hipótese · URLs pré-assinadas com
TTL de 5 minutos · sem execução de conteúdo · versionamento habilitado no bucket ·
`Content-Disposition: attachment` para tipos arriscados.

### Cabeçalhos HTTP
CSP estrita (sem `unsafe-inline`; nonce por requisição) · `X-Content-Type-Options:
nosniff` · `X-Frame-Options: DENY` · `Referrer-Policy: strict-origin-when-cross-origin` ·
`Permissions-Policy` restritiva.

### Entrada e saída
Validação com Zod em **toda** entrada (body, query, params, headers) · sanitização
de HTML em rich text (allowlist) · queries parametrizadas via Prisma (sem SQL
concatenado) · saída sempre escapada no React (nada de `dangerouslySetInnerHTML`
sem sanitização prévia).

---

## 9.5 LGPD — mapeamento por finalidade

| Dado | Titular | Base legal (LGPD) | Retenção |
|---|---|---|---|
| Cadastro de usuário | Membro do escritório | Execução de contrato (art. 7º, V) | Vida do contrato + 5 anos |
| Dados de cliente do escritório | Cliente | Legítimo interesse do controlador / execução de contrato | Conforme política do escritório |
| Documentos processuais | Partes | Exercício regular de direito em processo (art. 7º, VI) | Prazo prescricional |
| Logs de auditoria | Membro | Cumprimento de obrigação legal (art. 7º, II) | 12 meses quente + 5 anos frio |
| Telemetria de uso | Membro | Legítimo interesse (art. 7º, IX) | 12 meses |
| Dados enviados à IA | Partes | Execução de contrato, com contrato de não-treinamento | Não retido pelo provedor |

### Papéis
O **escritório é o controlador** dos dados de seus clientes; o **Quilombo Dev é
operador** (LGPD, arts. 5º, VI e VII, e 39). Isso precisa estar explícito no
contrato e no DPA — define quem responde por quê e quem atende requisição de titular.

### Direitos do titular (art. 18)
| Direito | Implementação |
|---|---|
| Confirmação e acesso | Perfil → Privacidade → Exportar meus dados |
| Correção | Edição no próprio perfil; para dados de cliente, via escritório |
| Anonimização / eliminação | Exclusão de conta = anonimização (autoria e auditoria preservadas por obrigação legal — art. 16, I) |
| Portabilidade | Exportação em JSON + arquivos originais |
| Informação sobre compartilhamento | Página pública de subprocessadores |
| Revogação de consentimento | Aplicável apenas ao que se baseia em consentimento (marketing) |

### Princípios aplicados
**Minimização** — não coletar campo sem finalidade declarada. **Finalidade** —
cada coleta tem propósito registrado. **Transparência** — política de privacidade
em linguagem clara. **Privacy by default** — visibilidade `INTERNA` é o padrão em
documentos e comentários; compartilhar é ação explícita.

### Incidentes
Plano documentado: detecção → contenção → avaliação de risco → notificação à ANPD
e aos titulares em prazo razoável → post-mortem. Runbook e responsável definidos
antes do lançamento, não depois do incidente.

---

## 9.6 Auditoria e rastreabilidade

Especificação em [05](05-arquitetura-backend.md) §5.7. Pontos de conformidade:

- Log **append-only**: o usuário de banco da aplicação não tem `UPDATE` nem
  `DELETE` na tabela de auditoria.
- **Leitura de documento é auditada** — diferencial de conformidade com o sigilo
  profissional; a maioria dos concorrentes audita apenas escrita.
- Exportação de auditoria disponível ao ADMIN, para responder a questionamento
  interno, disciplinar ou judicial.
- `correlationId` conecta o evento de auditoria ao log de aplicação e ao trace —
  investigação de incidente deixa de ser arqueologia.

---

## 9.7 Sessões

Listagem de sessões ativas com dispositivo, navegador, IP aproximado e último
acesso · revogação individual ou em massa · revogação automática ao trocar senha,
ao ter permissões alteradas ou ao ser desativado · expiração por inatividade
(configurável, padrão 30 dias) · limite de sessões simultâneas por usuário
(configurável).

---

## 9.8 Segurança e privacidade na camada de IA

Esta é a área mais sensível do produto do ponto de vista contratual.

1. **Contrato de não-treinamento.** O provedor de IA não pode usar dados enviados
   para treinar modelos. Requisito de contratação, verificado antes da integração.
2. **Sem retenção de longo prazo pelo provedor.** Zero-retention data policy ou
   retenção mínima operacional documentada.
3. **Minimização de contexto.** RAG envia apenas os trechos necessários, não o
   processo inteiro — menos exposição e menor custo.
4. **Consentimento no nível do escritório.** O uso de IA é habilitável por tenant;
   escritório com política interna restritiva pode desligar o módulo por completo.
5. **Documentos marcados como confidenciais podem ser excluídos** do processamento
   por IA, por configuração.
6. **Sem PII desnecessária no prompt.** Dados de identificação são substituídos por
   referências quando não são essenciais à tarefa.
7. **Mitigação de injeção de prompt.** Conteúdo de documento entra como dado
   delimitado, nunca como instrução; a saída é tratada como texto e nunca aciona
   ferramenta com efeito colateral.
8. **Rastreabilidade total.** Toda chamada registra modelo, versão de prompt,
   tokens, custo, latência e autor.
9. **Subprocessadores declarados.** O provedor de IA aparece na lista pública de
   subprocessadores — exigência de transparência da LGPD.

---

## 9.9 Segurança no ciclo de desenvolvimento

| Prática | Ferramenta / Gate |
|---|---|
| SAST | CodeQL / Semgrep no CI |
| Dependências | Dependabot + `npm audit`; vulnerabilidade crítica bloqueia deploy |
| Secrets | Gitleaks no pre-commit e no CI; nenhum segredo em repositório |
| IaC | Revisão obrigatória de mudança de infraestrutura |
| Code review | Obrigatório; mudança em auth/autorização exige dois revisores |
| Testes de segurança | Suíte de autorização por endpoint no CI |
| Pentest | Antes do lançamento comercial e anualmente |
| Backups | Diário com PITR; **teste de restauração trimestral** documentado |
| DR | RPO 1h · RTO 4h |
| Acesso de produção | MFA, just-in-time, com log; sem acesso permanente |

---

## 9.10 Checklist de conformidade pré-lançamento

- [ ] Política de Privacidade e Termos de Uso publicados
- [ ] DPA (contrato de operador) disponível para assinatura
- [ ] Lista pública de subprocessadores
- [ ] Registro de operações de tratamento (art. 37)
- [ ] Encarregado (DPO) designado e canal de contato publicado
- [ ] Plano de resposta a incidentes documentado e testado
- [ ] Exportação e anonimização de dados funcionais em produção
- [ ] Auditoria de leitura de documento ativa
- [ ] RLS validada com teste automatizado de isolamento entre tenants
- [ ] Pentest concluído, com achados críticos e altos corrigidos
- [ ] Restauração de backup testada e documentada
- [ ] Contrato de não-treinamento com o provedor de IA assinado

---

**Anterior:** [08-especificacao-modulos.md](08-especificacao-modulos.md) · **Próximo:** [10-roadmap-e-decisoes.md](10-roadmap-e-decisoes.md)
