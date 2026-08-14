import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';

/**
 * Handlers derivados do contrato real de `apps/api/src/modules/ai/`
 * (Sprint 11, reafirma docs/api/14-ai.md). Usados só em teste (Vitest).
 * `POST .../ai-summaries` já devolve `status: 'PRONTO'` diretamente (em vez
 * de simular a fase `GERANDO` com espera real) — o `MockAiProvider` real do
 * backend é quase instantâneo, e a máquina de estados
 * `PENDENTE→GERANDO→PRONTO` já é testada diretamente em
 * `ai-summary.service.spec.ts` no backend; testes de frontend não precisam
 * repetir essa coreografia de tempo real.
 */
const base = env.NEXT_PUBLIC_API_URL;

interface MockSummary {
  id: string;
  escopoTipo: 'PROCESSO' | 'DOCUMENTO' | 'CLIENTE';
  processoId: string | null;
  documentoId: string | null;
  clienteId: string | null;
  tipoResumo: string;
  versaoResumo: number;
  status: string;
  conteudo: string | null;
  estruturaJson: null;
  modelo: string;
  promptVersion: string;
  erro: string | null;
  feedback: string | null;
  comentarioFeedback: string | null;
  vigente: boolean;
  geradoEm: string | null;
  criadoEm: string;
  streamUrl: string;
}

let summaries: MockSummary[] = [];
let nextId = 1;

function problem(status: number, code: string, detail: string) {
  return HttpResponse.json(
    { type: 'about:blank', title: code, status, detail, code, correlationId: 'mock-correlation-id', timestamp: new Date(0).toISOString() },
    { status },
  );
}

function scopeMatch(summary: MockSummary, escopoTipo: string, escopoId: string) {
  if (escopoTipo === 'DOCUMENTO') return summary.documentoId === escopoId;
  if (escopoTipo === 'CLIENTE') return summary.clienteId === escopoId;
  return summary.processoId === escopoId;
}

function defaultTipoResumo(escopoTipo: string): string {
  if (escopoTipo === 'DOCUMENTO') return 'RESUMO_DOCUMENTO';
  if (escopoTipo === 'CLIENTE') return 'HISTORICO_CLIENTE';
  return 'GERAL';
}

function conteudoFor(escopoTipo: string, tipoResumo: string): string {
  if (escopoTipo === 'DOCUMENTO') return 'Resumo do documento: metadados analisados, sem conteúdo extraído do arquivo ainda.';
  if (escopoTipo === 'CLIENTE') return 'Histórico do cliente: 2 processos ativos, nenhuma pendência crítica identificada.';
  return `Resumo (${tipoResumo}) do processo: situação estável, próximo prazo em 5 dias.`;
}

function createSummary(escopoTipo: 'PROCESSO' | 'DOCUMENTO' | 'CLIENTE', escopoId: string, tipoResumo: string): MockSummary {
  const vigenteAnterior = summaries.find((s) => scopeMatch(s, escopoTipo, escopoId) && s.tipoResumo === tipoResumo && s.vigente);
  if (vigenteAnterior) vigenteAnterior.vigente = false;

  const id = `resumo-mock-${nextId++}`;
  const summary: MockSummary = {
    id,
    escopoTipo,
    processoId: escopoTipo === 'PROCESSO' ? escopoId : null,
    documentoId: escopoTipo === 'DOCUMENTO' ? escopoId : null,
    clienteId: escopoTipo === 'CLIENTE' ? escopoId : null,
    tipoResumo,
    versaoResumo: (vigenteAnterior?.versaoResumo ?? 0) + 1,
    status: 'PRONTO',
    conteudo: conteudoFor(escopoTipo, tipoResumo),
    estruturaJson: null,
    modelo: 'mock-v1',
    promptVersion: 'mock@v1',
    erro: null,
    feedback: null,
    comentarioFeedback: null,
    vigente: true,
    geradoEm: new Date().toISOString(),
    criadoEm: new Date().toISOString(),
    streamUrl: `/ai-summaries/${id}/stream`,
  };
  summaries.push(summary);
  return summary;
}

function requestHandler(escopoTipo: 'PROCESSO' | 'DOCUMENTO' | 'CLIENTE') {
  return http.post(`${base}/${escopoTipo === 'DOCUMENTO' ? 'documents' : escopoTipo === 'CLIENTE' ? 'clients' : 'legal-cases'}/:id/ai-summaries`, async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as { tipoResumo?: string };
    const tipoResumo = body.tipoResumo ?? defaultTipoResumo(escopoTipo);
    const summary = createSummary(escopoTipo, params.id as string, tipoResumo);
    return HttpResponse.json({ id: summary.id, status: summary.status, streamUrl: summary.streamUrl }, { status: 202 });
  });
}

function listHandler(escopoTipo: 'PROCESSO' | 'DOCUMENTO' | 'CLIENTE') {
  return http.get(`${base}/${escopoTipo === 'DOCUMENTO' ? 'documents' : escopoTipo === 'CLIENTE' ? 'clients' : 'legal-cases'}/:id/ai-summaries`, ({ params }) => {
    const items = summaries.filter((s) => scopeMatch(s, escopoTipo, params.id as string));
    return HttpResponse.json(items);
  });
}

export const aiHandlers = [
  requestHandler('PROCESSO'),
  requestHandler('DOCUMENTO'),
  requestHandler('CLIENTE'),
  listHandler('PROCESSO'),
  listHandler('DOCUMENTO'),
  listHandler('CLIENTE'),

  http.get(`${base}/ai-summaries/:id`, ({ params }) => {
    const summary = summaries.find((s) => s.id === params.id);
    if (!summary) return problem(404, 'NOT_FOUND', 'Resumo não encontrado.');
    return HttpResponse.json(summary);
  }),

  http.get(`${base}/ai-summaries/:id/sources`, ({ params }) => {
    const summary = summaries.find((s) => s.id === params.id);
    if (!summary) return problem(404, 'NOT_FOUND', 'Resumo não encontrado.');
    return HttpResponse.json([
      {
        id: 'fonte-mock-1',
        sourceType: summary.escopoTipo === 'DOCUMENTO' ? 'DOCUMENTO' : summary.escopoTipo === 'CLIENTE' ? 'CLIENTE' : 'METADADO_PROCESSO',
        documentoId: summary.documentoId,
        eventoTimelineId: null,
        processoId: summary.processoId,
        clienteId: summary.clienteId,
        ordem: 1,
        trechoOuReferencia: 'Metadados analisados',
      },
    ]);
  }),

  http.post(`${base}/ai-summaries/:id/regenerate`, ({ params }) => {
    const anterior = summaries.find((s) => s.id === params.id);
    if (!anterior) return problem(404, 'NOT_FOUND', 'Resumo não encontrado.');
    const novo = createSummary(anterior.escopoTipo, (anterior.processoId ?? anterior.documentoId ?? anterior.clienteId)!, anterior.tipoResumo);
    return HttpResponse.json({ id: novo.id, status: novo.status, streamUrl: novo.streamUrl }, { status: 202 });
  }),

  http.post(`${base}/ai-summaries/:id/cancel`, ({ params }) => {
    const summary = summaries.find((s) => s.id === params.id);
    if (summary) {
      summary.status = 'FALHA';
      summary.erro = 'Cancelado pelo usuário';
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/ai-summaries/:id/feedback`, async ({ params, request }) => {
    const summary = summaries.find((s) => s.id === params.id);
    const body = (await request.json()) as { feedback: string; comentarioFeedback?: string };
    if (summary) {
      summary.feedback = body.feedback;
      summary.comentarioFeedback = body.comentarioFeedback ?? null;
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/ai/chat`, async ({ request }) => {
    const body = (await request.json()) as { escopo: { tipo: string; id?: string }; pergunta: string };
    return HttpResponse.json({
      resposta: `Resposta simulada para "${body.pergunta}" (escopo ${body.escopo.tipo}).`,
      fontes: [{ tipo: 'documents', id: 'doc-1', titulo: 'Procuração.pdf', url: '/documentos/doc-1' }],
      modelo: 'mock-v1',
      tempoGeracaoMs: 12,
    });
  }),

  http.get(`${base}/ai/dashboard-insights`, () =>
    HttpResponse.json({ insights: ['Hoje existem 2 prazos críticos vencendo nos próximos 3 dias.'] }),
  ),

  http.get(`${base}/office/ai-usage`, () =>
    HttpResponse.json({
      mesReferencia: '2026-08',
      resumosGerados: 12,
      cotaMensal: 100,
      custoEstimadoCentavosTotal: 340,
      porTipo: { GERAL: 8, RESUMO_DOCUMENTO: 4 },
    }),
  ),
];

export function resetAiMocks() {
  summaries = [];
  nextId = 1;
}
