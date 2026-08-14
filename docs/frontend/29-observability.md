# 29 — Observabilidade Frontend

## 29.1 Captura de erro

`global-error.tsx` e todo `ErrorBoundary` (por bloco de Dashboard, por
widget) reportam a um serviço de captura de erro (Sentry ou equivalente —
escolha de fornecedor fica para a implementação, não uma decisão
arquitetural desta etapa) com: `correlationId` da operação, `code` do
`ApiError` quando aplicável, rota, papel do usuário (não o nome/e-mail),
`escritorioId` (identificador, não nome do escritório). Nenhum erro é só
`console.error` em produção sem também ser reportado.

## 29.2 Web Vitals

`useReportWebVitals` do Next.js envia LCP/INP/CLS/TTFB para o mesmo
pipeline — reafirma [26-performance.md §26.4](26-performance.md). Métricas
agregadas por rota (não por usuário individual), para identificar
regressão por tela.

## 29.3 `correlationId` ponta a ponta

Gerado no cliente HTTP na origem de cada operação de negócio (não por
requisição HTTP isolada, reafirma [08-http-client.md §8.2](08-http-client.md)),
propagado em toda chamada relacionada e incluído em todo evento de
observabilidade — é a chave que permite correlacionar um erro relatado
pelo usuário com o log correspondente no backend
(`docs/api/01-convencoes.md §1.10`).

## 29.4 O que nunca é enviado a uma ferramenta de telemetria

Lista fechada, reafirma [25-security.md §25.7](25-security.md):

- Conteúdo de processo, documento, comentário, cliente (nome, CPF/CNPJ,
  endereço, número CNJ completo — mesmo mascarado parcialmente, para não
  depender de mascaramento correto em todo ponto de captura).
- Corpo de requisição/resposta HTTP completo.
- `fieldErrors[].message` quando ele ecoa um valor digitado pelo usuário.
- Qualquer token, `mfaChallengeToken`, cookie.
- Query de busca digitada pelo usuário (pode conter nome de cliente/parte).

O que **é** enviado: `code` de erro, status HTTP, rota (padrão, não
interpolada — `/processos/[id]`, nunca `/processos/abc-123-real`),
`correlationId`, papel do usuário, `escritorioId` (identificador opaco),
duração da operação.

## 29.5 Breadcrumbs de produto

Eventos de navegação e ação relevante (login, troca de escritório,
criação de processo — só o **tipo** de ação e o `code` de resultado,
nunca o conteúdo) alimentam trilha de breadcrumb do serviço de captura de
erro, para reconstruir "o que o usuário fez antes do erro" sem reconstruir
"o que o usuário estava vendo".

## 29.6 Falhas monitoradas especificamente

- **API:** taxa de erro por endpoint/`code`, latência p95 (cruzado com a
  meta de `docs/api/20-performance.md`).
- **SSE:** taxa de reconexão, tempo até `TOKEN_EXPIRED` ser tratado,
  eventos duplicados descartados (ver
  [20-notifications-sse.md §20.2](20-notifications-sse.md)).
- **Upload:** taxa de falha por causa (`FILE_TOO_LARGE`,
  `MIME_NOT_ALLOWED`, falha de rede no `PUT` direto ao storage).

## 29.7 Eventos de segurança

Tentativa de acesso a rota administrativa sem permissão, múltiplas
falhas de login, uso do fallback de proxy SSE (§20.2, pode indicar
ambiente de rede atípico do cliente) — registrados com o mesmo cuidado
de sanitização do §29.4, nunca com dado de conteúdo jurídico anexado.

---

**Anterior:** [28-mocks.md](28-mocks.md) · **Próximo:** [30-ci.md](30-ci.md)
