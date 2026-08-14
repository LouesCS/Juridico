# 27 — Testes

## 27.1 Vitest, não Jest — justificativa

`docs/04-arquitetura-frontend.md` já havia decidido Vitest; esta etapa
confirma e justifica, como o Prompt 6A exige explicitamente. Motivos:

1. **Pipeline de transformação compatível.** Vitest usa esbuild/Vite por
   baixo — mesmo modelo de compilação rápida que o Next.js já usa
   (SWC/Turbopack), evitando manter um segundo pipeline de transform
   (Babel, no caso do Jest) só para teste.
2. **ESM nativo.** MSW v2 e várias dependências modernas do ecossistema
   React são ESM-first; Jest ainda exige configuração adicional
   (`transformIgnorePatterns`, `moduleNameMapper`) para interoperar bem,
   Vitest não.
3. **Velocidade de watch mode** — relevante para um catálogo de ~35
   componentes com teste próprio cada.
4. **Ambiente por arquivo** (`jsdom`/`happy-dom`) configurável por
   `// @vitest-environment` quando um teste específico precisa de DOM
   mais leve.

**Nota de inconsistência reconhecida, não um erro:** o backend
(`apps/api/`) usa Jest — decisão independente e correta para aquele
contexto (`ts-jest`, ecossistema NestJS oficialmente documentado com
Jest). Forçar o mesmo runner nos dois apps não reduziria complexidade
real, só uniformizaria o nome do arquivo de configuração; cada app já usa
o runner mais alinhado ao próprio ecossistema. Registrado em
[31-decisions.md §31.10](31-decisions.md).

## 27.2 Unitário

Alvo: `lib/validators/` (CPF, CNPJ, CNJ, moeda), `features/*/schemas/`
(Zod), `features/*/utils/`, formatadores (`Money`, `DateTime`,
`RelativeTime`), `stores/*` (Zustand — testado como função pura, sem
render), hooks puros sem dependência de rede (`use-debounce`,
`use-hotkey`). Sem DOM, sem MSW — a categoria mais rápida e mais barata
de manter.

## 27.3 Componente

React Testing Library + Vitest. Alvo: formulários (validação, mapeamento
de `fieldErrors`), `DataTable` (ordenação, seleção, paginação),
modais/`ConfirmDialog` (foco, `Esc`, digitação de nome em ação perigosa),
`PermissionGate`/`RoleGate` (renderiza/não renderiza conforme permissão
mockada), `FileDropzone` (progresso, erro por arquivo, alternativa de
teclado), `Timeline`/`TimelineItem` (agrupamento por dia, marcador por
tipo), `NotificationItem`/badge (lido/não lido). Usa `test/render.tsx`
(wrapper com `QueryProvider`+tema+MSW) — nenhum teste monta um componente
sem os providers reais que ele espera em produção.

## 27.4 Integração

Vitest + MSW (`mocks/server.ts`) + Testing Library, um nível acima do
componente isolado: página inteira ou feature completa, incluindo
TanStack Query de verdade (não mockado) contra handlers MSW — cobre fluxo
(preencher formulário → mutation → invalidação → nova renderização),
paginação por cursor, e os estados de erro definidos em
[23-errors.md](23-errors.md) (simulados via cenários MSW, ver
[28-mocks.md §28.4](28-mocks.md)).

## 27.5 E2E (Playwright)

Lista consolidada — reafirma as 8 jornadas já em
`docs/04-arquitetura-frontend.md §4.10` e adiciona as jornadas
adicionais explicitamente pedidas nesta etapa (nenhuma removida):

1. Login (com e sem MFA)
2. Logout
3. Troca de escritório
4. Cadastro de cliente
5. Cadastro de processo
6. Segredo de justiça (usuário sem acesso recebe 404, nunca 403 — teste
   de regressão direto sobre a regra mais sensível do produto)
7. Prazo (criar, concluir, cancelar com motivo)
8. Documento (metadados, preview, versão)
9. Upload (multi-arquivo, uma falha não cancela o resto)
10. Busca global
11. Notificações (leitura, tempo real via SSE mockado)
12. Resumo por IA (streaming mockado)
13. Permissões (ação escondida para papel sem permissão; 403 tratado se
    forçado via chamada direta)
14. Perfil (dados pessoais, sessões, MFA)

Cada jornada roda contra **MSW no modo Playwright** (`mocks/server.ts`
reaproveitado, não um ambiente de backend real — ver
[28-mocks.md §28.5](28-mocks.md)), exceto quando o CI tiver um ambiente de
staging real disponível para smoke test (fora do escopo desta etapa).

## 27.6 Acessibilidade

`@axe-core/playwright` como parte da suíte E2E (zero violação crítica) +
navegação por teclado explicitamente roteirizada nas jornadas 1, 5 e 9
(login, cadastro de processo, upload — os três fluxos mais longos) +
verificação de foco/label em modais como parte do teste de componente
(§27.3), não uma suíte separada.

## 27.7 Cobertura

Reafirma `docs/04 §4.10`: **70% global**, **90% em `lib/validators` e
`features/*/schemas`** — validação errada em software jurídico é dado
errado em processo real, o mesmo raciocínio já registrado na etapa 1.

---

**Anterior:** [26-performance.md](26-performance.md) · **Próximo:** [28-mocks.md](28-mocks.md)
