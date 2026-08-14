# 10 — Perfil

> Reafirma [../03-fluxos-e-telas.md §3.9](../03-fluxos-e-telas.md) e
> [../08-especificacao-modulos.md §8.7](../08-especificacao-modulos.md).

## 10.1 Layout geral

```
┌───────────┬──────────────────────────────────────────────────┐
│ Dados     │  DADOS PESSOAIS                                    │
│ pessoais  │  Nome: [___________]  Sobrenome: [___________]     │
│ Preferên. │  Foto: [avatar] [Alterar]                           │
│ Segurança │  Cargo: [___________]  OAB: [___________]           │
│ Privacid. │                                    [Salvar]          │
└───────────┴──────────────────────────────────────────────────┘
```
Navegação lateral secundária dentro da tela (não a Sidebar principal) — 4
seções, sempre visíveis simultaneamente na lista, conteúdo troca à direita.

## 10.2 Preferências

Tema (Claro/Escuro/Sistema, aplicado instantaneamente ao clicar, sem "Salvar")
· Idioma · Fuso horário · Densidade (Confortável/Compacto) · Página inicial
padrão · Notificações (atalho que leva à seção detalhada, ver
[11-notificacoes.md](11-notificacoes.md) §11.6).

## 10.3 Idioma e Tema

Ambos são exemplos do princípio "feedback imediato": mudar o tema não tem
botão "Aplicar" — a interface muda instantaneamente, e a persistência acontece
em segundo plano (otimistic, com reversão silenciosa em caso de falha de rede,
sem interromper o usuário com erro para uma preferência de baixo risco).

## 10.4 Sessões

Lista de sessões ativas: dispositivo (ícone + nome inferido do user agent),
localização aproximada por IP, último acesso, badge "Este dispositivo" na
sessão atual. Botão "Encerrar" por linha + "Encerrar todas as outras" — ação
imediata, sem modal de confirmação (reversível: o usuário só precisa logar de
novo, custo baixo, reafirma princípio de reversibilidade).

## 10.5 Integrações

Contas vinculadas (Google, Microsoft) com botão "Desvincular" — desabilitado
com tooltip explicativo se for o único método de autenticação restante
(nunca permite ficar sem nenhum método de login).

## 10.6 Segurança

Alterar senha (exige senha atual; ao salvar, aviso "Todas as outras sessões
serão encerradas" antes de confirmar) · Ativar/Desativar MFA (fluxo guiado:
QR code → código de confirmação → 10 códigos de recuperação para download/
cópia, com aviso de que não serão mostrados novamente).

## 10.7 Dados pessoais e Privacidade (LGPD)

"Exportar meus dados" (gera job assíncrono, notificação quando pronto, link
com validade) · "Solicitar exclusão da conta" (fluxo de confirmação em duas
etapas, texto explicando que é anonimização, não remoção de autoria histórica
— reafirma [../database/10-soft-delete-retencao-lgpd.md §10.11](../database/10-soft-delete-retencao-lgpd.md)).

## 10.8 Estados

Salvamento de campo de texto: indicador discreto "Salvando..." → "Salvo" ao
lado do campo, nunca um toast por campo individual (isso seria ruidoso demais
para um formulário com muitos campos editáveis independentemente).

## 10.9 Permissões

Toda a tela de Perfil é sobre o próprio usuário — não há variação de
permissão por papel (todo mundo edita o próprio perfil). Único ponto de
variação: seção "Segurança" pode exigir MFA obrigatório conforme configuração
do escritório (`Escritorio.configuracoes.mfaObrigatorio`), caso em que o
toggle de MFA aparece travado como "ativo, obrigatório pelo escritório".

## 10.10 Responsividade

Mobile: navegação lateral secundária vira abas horizontais com scroll, mesma
lógica de colapso de [17-responsividade.md](17-responsividade.md).

---

**Anterior:** [09-busca-global.md](09-busca-global.md) · **Próximo:** [11-notificacoes.md](11-notificacoes.md)
