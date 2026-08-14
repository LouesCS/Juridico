# 18 — Checklists

## 18.1 Checklist de UX

- [ ] A tela responde "o que devo fazer aqui?" em <5 segundos de leitura.
- [ ] Existe exatamente uma ação primária, visualmente inconfundível.
- [ ] Nenhuma tarefa frequente exige mais de 2 cliques a partir do Dashboard.
- [ ] Cadastros permitem salvar incompleto.
- [ ] Toda ação destrutiva é confirmável e, quando possível, reversível.
- [ ] A busca global está acessível (`⌘K`) a partir desta tela.
- [ ] Estados de carregamento, vazio (≥2 variantes), erro e sem permissão
      estão todos definidos.
- [ ] Mensagens seguem o tom de voz de [14-ux-writing.md](14-ux-writing.md).

## 18.2 Checklist de UI

- [ ] Espaçamento segue a escala de 4px ([../07-design-system.md §7.4](../07-design-system.md)).
- [ ] Cores usadas são tokens semânticos, nunca cor bruta.
- [ ] Violeta (`ai`) aparece apenas em conteúdo gerado por IA.
- [ ] Tipografia usa a escala oficial, sem tamanho ad-hoc.
- [ ] Ícones vêm do conjunto Lucide já catalogado.
- [ ] Nenhuma tabela mostra mais de 8 colunas simultâneas por padrão.
- [ ] Componentes usados existem no catálogo de [13-componentes.md](13-componentes.md)
      — nenhum componente novo criado sem justificativa.

## 18.3 Checklist de Design System

- [ ] Dark e light mode verificados na tela.
- [ ] Elevação usa os 5 níveis padrão, sombra ajustada por tema.
- [ ] Motion respeita durações/easings oficiais e `prefers-reduced-motion`.
- [ ] Ilustrações de estado vazio seguem o estilo de linha simples de
      [12-design-system.md §12.10](12-design-system.md).
- [ ] Grid de layout (colunas/gutter) corresponde ao breakpoint.

## 18.4 Checklist de Acessibilidade

- [ ] Contraste ≥4.5:1 (texto normal) / ≥3:1 (texto grande, ícones, bordas).
- [ ] Toda função alcançável e operável por teclado, sem armadilha de foco.
- [ ] `focus-visible` visível em 100% dos elementos interativos.
- [ ] Nenhuma informação transmitida apenas por cor.
- [ ] ARIA correto por tipo de componente (ver [15-acessibilidade.md §15.2](15-acessibilidade.md)).
- [ ] Alvo de toque ≥44×44px em mobile, ≥36×36px em desktop.
- [ ] Testado com leitor de tela nas jornadas críticas.
- [ ] `axe-core` sem violação crítica.

## 18.5 Checklist para Desenvolvimento

- [ ] Todos os 5 estados de tela implementados (carregando, vazio×2+, erro,
      sem permissão) — reafirma [../03-fluxos-e-telas.md §3.11](../03-fluxos-e-telas.md).
- [ ] Responsivo verificado em desktop, tablet e mobile (breakpoints oficiais).
- [ ] Textos vêm literalmente de [14-ux-writing.md](14-ux-writing.md) — nenhum
      texto novo inventado ad-hoc pelo desenvolvedor.
- [ ] Permissão controla visibilidade de elemento (oculta, não desabilita
      sem explicação) — reafirma [../04-arquitetura-frontend.md §4.8](../04-arquitetura-frontend.md).
- [ ] Ação de IA sempre com selo, fonte e feedback presentes.
- [ ] Nenhum dado sensível (CPF/CNPJ completo) renderizado sem máscara fora do
      contexto autorizado.
- [ ] Atalhos de teclado da tela implementados conforme
      [04-navigation.md §4.9](04-navigation.md).

## 18.6 Checklist para QA

- [ ] Testar a tela com cada um dos 6 papéis (Owner, Admin, Sócio, Advogado,
      Assistente, Estagiário) — permissões corretas em cada um.
- [ ] Testar navegação 100% por teclado, sem mouse.
- [ ] Testar com leitor de tela (NVDA/VoiceOver) no fluxo crítico da tela.
- [ ] Testar em light e dark mode.
- [ ] Testar em desktop, tablet e mobile reais (não apenas DevTools).
- [ ] Testar estado de erro forçando falha de rede.
- [ ] Testar estado vazio (conta nova, sem dados).
- [ ] Testar ação destrutiva e confirmar reversibilidade (restaurar da
      lixeira).
- [ ] Testar `segredoJustica`/confidencialidade retornando 404 real, não 403.
- [ ] Testar performance percebida da busca (<400ms) e do streaming de IA
      (primeiro token <2s).

---

**Anterior:** [17-responsividade.md](17-responsividade.md) · **Próximo:** [19-decisoes.md](19-decisoes.md)
