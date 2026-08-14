import { http, HttpResponse } from 'msw';
import { env } from '@/config/env';
import { LEGAL_FOLDER_EXTRA_FIELDS } from './configuration';

const base = env.NEXT_PUBLIC_API_URL;
export const legalFolderMock = {
  id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  nome: 'MARIA OLIVEIRA/1',
  prefixo: 'MARIA OLIVEIRA',
  sequencial: 1,
  numeroInterno: 'PJ-2026-001',
  assunto: 'Responsabilidade civil',
  categoria: 'Cível',
  etapa: 'CADASTRAMENTO',
  situacao: 'EM_ANDAMENTO',
  confidencial: false,
  clientePrincipal: { id: '11111111-1111-4111-8111-111111111111', nome: 'Maria Oliveira' },
  parteContrariaPrincipal: { id: '22222222-2222-4222-8222-222222222222', nome: 'Empresa XYZ' },
  encarregadoId: 'member-demo-1',
  encarregado: {
    id: 'member-demo-1',
    nome: 'João Silva',
    numeroOab: 'SP 123456',
    cargo: 'ADVOGADO',
  },
  observacoes: 'Dossiê jurídico de demonstração.',
  camposExtrasValores: {},
  dataConclusao: null,
  criadoEm: '2026-08-01T12:00:00.000Z',
  atualizadoEm: '2026-08-09T12:00:00.000Z',
  arquivadoEm: null,
  processos: [
    {
      processo: {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        titulo: 'Ação de indenização por danos morais e materiais decorrentes de acidente',
        numeroCnj: '1234567-19.2024.8.26.0001',
        tipo: 'JUDICIAL',
        assunto: 'Responsabilidade civil',
        status: 'ATIVO',
        configuracoesCaptura: [
          {
            id: 'capture-folder-1',
            numeroCnj: '1234567-19.2024.8.26.0001',
            status: 'ATIVA',
            ultimaSincronizacaoEm: '2026-08-09T12:00:00.000Z',
            novidadesUltimaCaptura: 2,
          },
        ],
        publicacoesCapturadas: [
          {
            id: 'publication-folder-1',
            dataPublicacao: '2026-08-08T12:00:00.000Z',
            conteudo: 'Intimação publicada no diário oficial.',
          },
        ],
        movimentosCapturados: [
          {
            id: 'movement-folder-1',
            dataMovimento: '2026-08-09T12:00:00.000Z',
            tipo: 'DESPACHO',
            descricao: 'Despacho de mero expediente.',
          },
        ],
        documentos: [
          {
            id: 'document-folder-1',
            nome: 'Petição inicial.pdf',
            extensao: 'pdf',
            atualizadoEm: '2026-08-09T12:00:00.000Z',
          },
        ],
        partes: [
          {
            id: 'party-client-2',
            nome: 'José Oliveira',
            tipo: 'AUTOR',
            natureza: 'PESSOA_FISICA',
            ehNossoCliente: true,
            clienteId: '33333333-3333-4333-8333-333333333333',
          },
          {
            id: 'party-opposing-2',
            nome: 'Seguradora ABC',
            tipo: 'REU',
            natureza: 'PESSOA_JURIDICA',
            ehNossoCliente: false,
            clienteId: null,
          },
        ],
        equipe: [],
      },
    },
    {
      processo: {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        titulo:
          'Procedimento administrativo previdenciário para concessão e revisão de benefício continuado',
        numeroCnj: null,
        tipo: 'EXTRAJUDICIAL',
        assunto: 'Benefício previdenciário',
        status: 'ATIVO',
        configuracoesCaptura: [],
        publicacoesCapturadas: [],
        movimentosCapturados: [],
        documentos: [],
        partes: [],
        equipe: [],
      },
    },
  ],
  configuracoesCaptura: [],
  vinculosClientes: [],
  _count: { processos: 2, configuracoesCaptura: 0 },
};

export const legalFoldersHandlers = [
  http.get(`${base}/legal-folders/options`, () =>
    HttpResponse.json({
      categorias: [
        'Administrativa',
        'Cível',
        'Núcleo Bancário',
        'Previdência Pública',
        'Trabalhista',
        'Tributária',
      ].map((valor) => ({ valor, label: valor })),
      situacoes: [
        ['BAIXADO', 'Baixado'],
        ['CONTRARIO', 'Contrário'],
        ['DESISTENCIA', 'Desistência'],
        ['ANDAMENTO_FAVORAVEL', 'Andamento Favorável'],
        ['INVIAVEL', 'Inviável'],
        ['SUBSTABELECIDO', 'Substabelecido'],
        ['SUSPENSO', 'Suspenso'],
      ].map(([valor, label]) => ({ valor, label })),
      etapaInicial: 'CADASTRAMENTO',
      camposExtras: LEGAL_FOLDER_EXTRA_FIELDS,
    }),
  ),
  http.get(`${base}/legal-folders`, () =>
    HttpResponse.json({ items: [legalFolderMock], total: 1, page: 1, limit: 20 }),
  ),
  http.get(`${base}/legal-folders/:id`, ({ params }) =>
    params.id === legalFolderMock.id
      ? HttpResponse.json(legalFolderMock)
      : new HttpResponse(null, { status: 404 }),
  ),
  http.post(`${base}/legal-folders`, async ({ request }) => {
    const input = (await request.json()) as { clientePrincipalId: string };
    return HttpResponse.json(
      { id: 'legal-folder-created-2', nome: input.clientePrincipalId ? 'MARIAOLIVEIRA/2' : '' },
      { status: 201 },
    );
  }),
  http.patch(`${base}/legal-folders/:id`, ({ params }) => HttpResponse.json({ id: params.id })),
  http.post(`${base}/legal-folders/:id/complete`, ({ params }) =>
    HttpResponse.json({ id: params.id, dataConclusao: new Date().toISOString() }),
  ),
  http.post(`${base}/legal-folders/:id/copy`, () =>
    HttpResponse.json({ id: 'legal-folder-copy-2', nome: 'MARIAOLIVEIRA/2' }, { status: 201 }),
  ),
  http.post(`${base}/legal-folders/:id/archive`, () => new HttpResponse(null, { status: 204 })),
];
