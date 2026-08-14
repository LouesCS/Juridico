import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';

/**
 * Handlers derivados do contrato real de `apps/api/src/modules/documents/`
 * (módulo real desde a Sprint 09 — reafirma docs/api/10-documents.md).
 * Usados só em teste (Vitest). O PUT do binário para a URL assinada aponta
 * para `/storage/mock/upload/:id` (também interceptado aqui) — em teste não
 * existe storage real, mas o fluxo completo (presign → PUT → confirm)
 * precisa funcionar de ponta a ponta sem stubs no componente.
 */
const base = env.NEXT_PUBLIC_API_URL;

function problem(status: number, code: string, detail: string) {
  return HttpResponse.json(
    {
      type: 'about:blank',
      title: code,
      status,
      detail,
      code,
      correlationId: 'mock-correlation-id',
      timestamp: new Date(0).toISOString(),
    },
    { status },
  );
}

export interface MockDocument {
  id: string;
  nome: string;
  nomeOriginal: string;
  extensao: string;
  mimeType: string;
  tamanhoBytes: string;
  tipo: string;
  categoria: string | null;
  descricao: string | null;
  confidencialidade: 'PADRAO' | 'CONFIDENCIAL';
  visibilidade: string;
  statusUpload: string;
  statusProcessamento: string;
  statusAntivirus: string;
  versaoAtual: number;
  totalVersoes: number;
  dataDocumento: string | null;
  pasta: { id: string; nome: string } | null;
  processo: { id: string; titulo: string } | null;
  cliente: { id: string; nome: string } | null;
  autor: { id: string; nome: string; avatarUrl: string | null } | null;
  tags: Array<{ id: string; nome: string; cor: string }>;
  favorito: boolean;
  criadoEm: string;
  atualizadoEm: string;
  excluidoEm: string | null;
  legalFolderIds?: string[];
}

let documents: MockDocument[] = [];
let pendingUploads: Record<string, {
  nome: string;
  processoId?: string;
  pastaId?: string;
  clienteId?: string;
  resourceType?: 'PASTA_JURIDICA';
  resourceId?: string;
}> = {};

function seed() {
  documents = [
    {
      id: 'doc-1',
      nome: 'Contrato de honorários.pdf',
      nomeOriginal: 'contrato-honorarios.pdf',
      extensao: 'pdf',
      mimeType: 'application/pdf',
      tamanhoBytes: '204800',
      tipo: 'CONTRATO',
      categoria: 'Contratual',
      descricao: 'Contrato assinado pelas partes.',
      confidencialidade: 'PADRAO',
      visibilidade: 'INTERNA',
      statusUpload: 'CONCLUIDO',
      statusProcessamento: 'PRONTO',
      statusAntivirus: 'LIMPO',
      versaoAtual: 1,
      totalVersoes: 1,
      dataDocumento: null,
      pasta: null,
      processo: { id: 'case-1', titulo: 'Ação de cobrança — Silva vs. Acme' },
      cliente: { id: 'client-1', nome: 'João da Silva' },
      autor: { id: 'mock-membro-1', nome: 'Usuária', avatarUrl: null },
      tags: [{ id: 'tag-1', nome: 'Urgente', cor: '#ef4444' }],
      favorito: true,
      criadoEm: '2026-07-01T10:00:00.000Z',
      atualizadoEm: '2026-07-20T10:00:00.000Z',
      excluidoEm: null,
    },
    {
      id: 'doc-2',
      nome: 'Procuração.docx',
      nomeOriginal: 'procuracao.docx',
      extensao: 'docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      tamanhoBytes: '51200',
      tipo: 'PROCURACAO',
      categoria: null,
      descricao: null,
      confidencialidade: 'PADRAO',
      visibilidade: 'INTERNA',
      statusUpload: 'CONCLUIDO',
      statusProcessamento: 'PRONTO',
      statusAntivirus: 'LIMPO',
      versaoAtual: 2,
      totalVersoes: 2,
      dataDocumento: null,
      pasta: null,
      processo: { id: 'case-1', titulo: 'Ação de cobrança — Silva vs. Acme' },
      cliente: { id: 'client-1', nome: 'João da Silva' },
      autor: { id: 'mock-membro-1', nome: 'Usuária', avatarUrl: null },
      tags: [],
      favorito: false,
      criadoEm: '2026-06-01T10:00:00.000Z',
      atualizadoEm: '2026-07-18T10:00:00.000Z',
      excluidoEm: null,
    },
    {
      id: 'doc-3',
      nome: 'Comprovante antigo.jpg',
      nomeOriginal: 'comprovante.jpg',
      extensao: 'jpg',
      mimeType: 'image/jpeg',
      tamanhoBytes: '102400',
      tipo: 'COMPROVANTE',
      categoria: null,
      descricao: null,
      confidencialidade: 'PADRAO',
      visibilidade: 'INTERNA',
      statusUpload: 'CONCLUIDO',
      statusProcessamento: 'PRONTO',
      statusAntivirus: 'LIMPO',
      versaoAtual: 1,
      totalVersoes: 1,
      dataDocumento: null,
      pasta: null,
      processo: null,
      cliente: null,
      autor: { id: 'mock-membro-1', nome: 'Usuária', avatarUrl: null },
      tags: [],
      favorito: false,
      criadoEm: '2026-05-01T10:00:00.000Z',
      atualizadoEm: '2026-05-01T10:00:00.000Z',
      excluidoEm: '2026-07-10T10:00:00.000Z',
    },
  ];
  pendingUploads = {};
}
seed();

export function resetDocumentsMocks() {
  seed();
}

export const documentsHandlers = [
  http.get(`${base}/documents/dashboard-summary`, () => {
    const ativos = documents.filter((d) => !d.excluidoEm);
    return HttpResponse.json({
      recentes: ativos.slice(0, 5).map((d) => ({ id: d.id, nome: d.nome, extensao: d.extensao, tipo: d.tipo, atualizadoEm: d.atualizadoEm })),
      favoritos: ativos.filter((d) => d.favorito).map((d) => ({ id: d.id, nome: d.nome, extensao: d.extensao, tipo: d.tipo, atualizadoEm: d.atualizadoEm })),
      totalDocumentos: ativos.length,
      armazenamento: { bytesUsados: '358400', bytesQuota: '21474836480', percentualUsado: 0 },
    });
  }),

  http.get(`${base}/documents`, ({ request }) => {
    const url = new URL(request.url);
    const visao = url.searchParams.get('visao') ?? 'todos';
    const q = url.searchParams.get('q')?.toLowerCase();
    const pastaId = url.searchParams.get('pastaId');
    const processoId = url.searchParams.get('processoId');
    const clienteId = url.searchParams.get('clienteId');
    const resourceType = url.searchParams.get('resourceType');

    if (visao === 'compartilhados') {
      return HttpResponse.json({ items: [], nextCursor: null, total: 0, disponivel: false });
    }

    let items = documents.filter((d) => (visao === 'lixeira' ? d.excluidoEm : !d.excluidoEm));
    if (visao === 'favoritos') items = items.filter((d) => d.favorito);
    if (visao === 'versionados') items = items.filter((d) => d.totalVersoes > 1);
    if (q) items = items.filter((d) => d.nome.toLowerCase().includes(q));
    if (pastaId) items = items.filter((d) => d.pasta?.id === pastaId);
    if (processoId) items = items.filter((d) => d.processo?.id === processoId);
    if (clienteId) items = items.filter((d) => d.cliente?.id === clienteId);
    // A fixture global não possui vínculos contextuais. A Pasta Jurídica
    // começa vazia e só recebe documentos pelo fluxo oficial de upload.
    if (resourceType === 'PASTA_JURIDICA') {
      const resourceId = url.searchParams.get('resourceId');
      items = items.filter((document) =>
        resourceId ? document.legalFolderIds?.includes(resourceId) : false,
      );
    }

    return HttpResponse.json({ items, nextCursor: null, total: items.length, disponivel: true });
  }),

  http.post(`${base}/documents/presign`, async ({ request }) => {
    const body = (await request.json()) as {
      nomeArquivo: string;
      processoId?: string;
      pastaId?: string;
      clienteId?: string;
      resourceType?: 'PASTA_JURIDICA';
      resourceId?: string;
    };
    const id = `doc-novo-${documents.length + 1}`;
    pendingUploads[id] = {
      nome: body.nomeArquivo,
      processoId: body.processoId,
      pastaId: body.pastaId,
      clienteId: body.clienteId,
      resourceType: body.resourceType,
      resourceId: body.resourceId,
    };
    return HttpResponse.json(
      { documentoId: id, uploadUrl: `${base}/storage/mock/upload/${id}`, expiraEm: new Date(Date.now() + 900_000).toISOString() },
      { status: 201 },
    );
  }),

  http.put(`${base}/storage/mock/upload/:id`, () => new HttpResponse(null, { status: 201 })),

  http.post(`${base}/documents/:id/confirm`, ({ params }) => {
    const id = params.id as string;
    const pending = pendingUploads[id];
    if (!pending) return problem(404, 'NOT_FOUND', 'Upload não encontrado.');
    delete pendingUploads[id];

    const novo: MockDocument = {
      id,
      nome: pending.nome,
      nomeOriginal: pending.nome,
      extensao: pending.nome.split('.').pop() ?? '',
      mimeType: 'application/octet-stream',
      tamanhoBytes: '1024',
      tipo: 'OUTRO',
      categoria: null,
      descricao: null,
      confidencialidade: 'PADRAO',
      visibilidade: 'INTERNA',
      statusUpload: 'CONCLUIDO',
      statusProcessamento: 'PRONTO',
      statusAntivirus: 'LIMPO',
      versaoAtual: 1,
      totalVersoes: 1,
      dataDocumento: null,
      pasta: pending.pastaId ? { id: pending.pastaId, nome: 'Pasta' } : null,
      processo: pending.processoId ? { id: pending.processoId, titulo: 'Ação de cobrança — Silva vs. Acme' } : null,
      cliente: pending.clienteId ? { id: pending.clienteId, nome: 'João da Silva' } : null,
      autor: { id: 'mock-membro-1', nome: 'Usuária', avatarUrl: null },
      tags: [],
      favorito: false,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      excluidoEm: null,
      legalFolderIds:
        pending.resourceType === 'PASTA_JURIDICA' && pending.resourceId
          ? [pending.resourceId]
          : [],
    };
    documents = [novo, ...documents];
    return HttpResponse.json({ id, avisoDuplicidade: null }, { status: 201 });
  }),

  http.get(`${base}/documents/:id`, ({ params }) => {
    const doc = documents.find((d) => d.id === params.id);
    if (!doc) return problem(404, 'NOT_FOUND', 'Documento não encontrado.');
    return HttpResponse.json(doc);
  }),

  http.patch(`${base}/documents/:id`, async ({ params, request }) => {
    const doc = documents.find((d) => d.id === params.id);
    if (!doc) return problem(404, 'NOT_FOUND', 'Documento não encontrado.');
    const body = (await request.json()) as Partial<MockDocument>;
    Object.assign(doc, body);
    doc.atualizadoEm = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/documents/:id`, ({ params }) => {
    const doc = documents.find((d) => d.id === params.id);
    if (!doc) return problem(404, 'NOT_FOUND', 'Documento não encontrado.');
    doc.excluidoEm = new Date().toISOString();
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${base}/documents/:id/links/legal-folder/:folderId`, ({ params }) => {
    const doc = documents.find((d) => d.id === params.id);
    if (!doc) return problem(404, 'NOT_FOUND', 'Documento não encontrado.');
    doc.legalFolderIds = (doc.legalFolderIds ?? []).filter((id) => id !== params.folderId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/documents/:id/restore`, ({ params }) => {
    const doc = documents.find((d) => d.id === params.id);
    if (!doc) return problem(404, 'NOT_FOUND', 'Documento não encontrado.');
    doc.excluidoEm = null;
    return new HttpResponse(null, { status: 201 });
  }),

  http.post(`${base}/documents/:id/duplicate`, ({ params }) => {
    const doc = documents.find((d) => d.id === params.id);
    if (!doc) return problem(404, 'NOT_FOUND', 'Documento não encontrado.');
    const copia: MockDocument = { ...doc, id: `${doc.id}-copia`, nome: `${doc.nome} (cópia)` };
    documents = [copia, ...documents];
    return HttpResponse.json({ id: copia.id }, { status: 201 });
  }),

  http.patch(`${base}/documents/:id/move`, async ({ params, request }) => {
    const doc = documents.find((d) => d.id === params.id);
    if (!doc) return problem(404, 'NOT_FOUND', 'Documento não encontrado.');
    const body = (await request.json()) as { pastaId?: string | null; processoId?: string | null };
    if (body.pastaId !== undefined) doc.pasta = body.pastaId ? { id: body.pastaId, nome: 'Pasta' } : null;
    if (body.processoId !== undefined) doc.processo = body.processoId ? { id: body.processoId, titulo: 'Processo' } : null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${base}/documents/:id/favorite`, ({ params }) => {
    const doc = documents.find((d) => d.id === params.id);
    if (!doc) return problem(404, 'NOT_FOUND', 'Documento não encontrado.');
    doc.favorito = !doc.favorito;
    return HttpResponse.json({ favorito: doc.favorito });
  }),

  http.get(`${base}/documents/:id/download`, ({ params }) => {
    const doc = documents.find((d) => d.id === params.id);
    if (!doc) return problem(404, 'NOT_FOUND', 'Documento não encontrado.');
    if (doc.statusAntivirus === 'INFECTADO') return problem(423, 'FILE_INFECTED', 'Arquivo bloqueado.');
    return HttpResponse.json({ url: `https://mock-storage.invalid/${doc.id}`, expiraEm: new Date(Date.now() + 300_000).toISOString() });
  }),

  http.get(`${base}/documents/:id/preview`, ({ params }) => {
    const doc = documents.find((d) => d.id === params.id);
    if (!doc) return problem(404, 'NOT_FOUND', 'Documento não encontrado.');
    return HttpResponse.json({
      url: `https://mock-storage.invalid/${doc.id}`,
      expiraEm: new Date(Date.now() + 300_000).toISOString(),
      mimeType: doc.mimeType,
    });
  }),

  http.get(`${base}/documents/:id/versions`, ({ params }) => {
    const doc = documents.find((d) => d.id === params.id);
    if (!doc) return problem(404, 'NOT_FOUND', 'Documento não encontrado.');
    return HttpResponse.json(
      Array.from({ length: doc.totalVersoes }, (_, i) => ({
        id: `versao-${doc.id}-${doc.totalVersoes - i}`,
        numero: doc.totalVersoes - i,
        tamanhoBytes: doc.tamanhoBytes,
        comentarioVersao: i === 0 ? null : 'Correção de cláusula',
        vigente: i === 0,
        autor: doc.autor,
        criadoEm: doc.atualizadoEm,
      })),
    );
  }),

  http.get(`${base}/documents/:id/versions/:versaoId/download`, ({ params }) => {
    const doc = documents.find((d) => d.id === params.id);
    if (!doc) return problem(404, 'NOT_FOUND', 'Documento não encontrado.');
    return HttpResponse.json({ url: `https://mock-storage.invalid/${params.versaoId}`, expiraEm: new Date(Date.now() + 300_000).toISOString() });
  }),

  http.post(`${base}/documents/:id/versions/presign`, ({ params }) => {
    const doc = documents.find((d) => d.id === params.id);
    if (!doc) return problem(404, 'NOT_FOUND', 'Documento não encontrado.');
    return HttpResponse.json({
      uploadUrl: `${base}/storage/mock/upload/${doc.id}-nova-versao`,
      expiraEm: new Date(Date.now() + 900_000).toISOString(),
      proximoNumero: doc.totalVersoes + 1,
      versionToken: `mock-token-${doc.id}`,
    });
  }),

  http.post(`${base}/documents/:id/versions/confirm`, ({ params }) => {
    const doc = documents.find((d) => d.id === params.id);
    if (!doc) return problem(404, 'NOT_FOUND', 'Documento não encontrado.');
    doc.totalVersoes += 1;
    doc.versaoAtual += 1;
    return HttpResponse.json({ id: `versao-${doc.id}-${doc.totalVersoes}`, numero: doc.totalVersoes }, { status: 201 });
  }),

  http.get(`${base}/tags`, () => HttpResponse.json([{ id: 'tag-1', nome: 'Urgente', cor: '#ef4444' }])),
  http.post(`${base}/tags`, async ({ request }) => {
    const body = (await request.json()) as { nome: string; cor?: string };
    return HttpResponse.json({ id: `tag-${Date.now()}`, nome: body.nome, cor: body.cor ?? '#6366f1' }, { status: 201 });
  }),
];
