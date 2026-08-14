import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';

/**
 * Handlers derivados do contrato real de `apps/api/src/modules/search/`
 * (Sprint 10, reafirma docs/api/15-search.md). Usados só em teste (Vitest) —
 * fixture pequena e fixa (não mutável como Documents/Folders, já que Search
 * não tem operações de escrita a simular).
 */
const base = env.NEXT_PUBLIC_API_URL;

const GROUP_ORDER = [
  'clients',
  'legal-cases',
  'documents',
  'deadlines',
  'tasks',
  'team',
  'folders',
  'timeline',
  'tags',
  'comments',
  'publications',
  'judicial-movements',
] as const;

interface MockSearchItem {
  id: string;
  tipo: (typeof GROUP_ORDER)[number];
  titulo: string;
  subtitulo: string | null;
  snippet: string | null;
  url: string;
  score: number;
  metadata: Record<string, unknown>;
}

const FIXTURE_ITEMS: MockSearchItem[] = [
  {
    id: 'movement-1',
    tipo: 'judicial-movements',
    titulo: 'Expedição de intimação eletrônica',
    subtitulo: '1234567-19.2024.8.26.0001',
    snippet: 'Movimentação judicial capturada pelo DataJud',
    url: '/movimentacoes-judiciais?movimentacao=movement-1',
    score: 0.88,
    metadata: { tribunal: 'TJSP', origem: 'DATAJUD' },
  },
  {
    id: 'publication-1',
    tipo: 'publications',
    titulo: 'Intimação disponibilizada',
    subtitulo: '1234567-19.2024.8.26.0001',
    snippet: 'Publicação vinculada ao processo de Maria Oliveira',
    url: '/publicacoes?publicacao=publication-1',
    score: 0.85,
    metadata: { tribunal: 'TJSP', tipo: 'INTIMACAO' },
  },
  {
    id: 'case-1',
    tipo: 'legal-cases',
    titulo: 'Ação Trabalhista — Reclamante Silva',
    subtitulo: '0001234-56.2026.5.02.0001',
    snippet: null,
    url: '/processos/case-1',
    score: 1,
    metadata: { status: 'ATIVO', prioridade: 'ALTA' },
  },
  {
    id: 'client-1',
    tipo: 'clients',
    titulo: 'João Silva',
    subtitulo: 'Pessoa física',
    snippet: null,
    url: '/clientes/client-1',
    score: 0.9,
    metadata: { tipo: 'PESSOA_FISICA', documento: '123.456.789-00' },
  },
  {
    id: 'doc-1',
    tipo: 'documents',
    titulo: 'Procuração — Silva.pdf',
    subtitulo: 'Ação Trabalhista — Reclamante Silva',
    snippet: '…outorga poderes a João <mark>Silva</mark>…',
    url: '/documentos/doc-1',
    score: 0.8,
    metadata: { extensao: 'pdf' },
  },
];

export const searchHandlers = [
  http.get(`${base}/search`, ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').toLowerCase();
    const typesParam = url.searchParams.get('types');
    const requestedTypes = typesParam ? typesParam.split(',') : [...GROUP_ORDER];

    const matched = FIXTURE_ITEMS.filter((item) => item.titulo.toLowerCase().includes(q));
    const groups = GROUP_ORDER.filter((type) => requestedTypes.includes(type)).map((type) => {
      const items = matched.filter((item) => item.tipo === type);
      return {
        type,
        total: items.length,
        items,
        ...(type === 'comments' ? { disponivel: false } : {}),
      };
    });

    return HttpResponse.json({ query: q, groups });
  }),

  http.get(`${base}/search/suggestions`, () =>
    HttpResponse.json({
      sugestoes: [
        { label: 'Novo Cliente', action: 'navigate', url: '/clientes' },
      ],
    }),
  ),
];
