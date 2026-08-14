import { Prisma } from '@prisma/client';

export const LEGAL_FOLDER_CATEGORIES = [
  'Administrativa',
  'Cível',
  'Núcleo Bancário',
  'Previdência Pública',
  'Trabalhista',
  'Tributária',
] as const;

export const LEGAL_FOLDER_SITUATIONS = [
  ['BAIXADO', 'Baixado'],
  ['CONTRARIO', 'Contrário'],
  ['DESISTENCIA', 'Desistência'],
  ['ANDAMENTO_FAVORAVEL', 'Andamento Favorável'],
  ['INVIAVEL', 'Inviável'],
  ['SUBSTABELECIDO', 'Substabelecido'],
  ['SUSPENSO', 'Suspenso'],
] as const;

export const LEGAL_FOLDER_EXTRA_FIELDS = [
  {
    chave: 'data_atendimento',
    nome: 'Data do Atendimento',
    tipo: 'DATA',
    obrigatorio: true,
    opcoes: [],
  },
  {
    chave: 'tipo_atendimento',
    nome: 'Tipo de Atendimento',
    tipo: 'SELECT',
    obrigatorio: true,
    opcoes: ['Online', 'Outros', 'Presencial', 'Em Sindicato'],
  },
  {
    chave: 'advogado_atendente',
    nome: 'Advogado Atendente',
    tipo: 'TEXTO',
    obrigatorio: true,
    opcoes: [],
  },
  {
    chave: 'sub_area',
    nome: 'Sub Área',
    tipo: 'SELECT',
    obrigatorio: true,
    opcoes: [
      'Acidentária',
      'Acidente de Trabalho',
      'Aposentadoria',
      'Auxílio-Doença',
      'Cível',
      'Consumo',
      'Criminal',
      'Defesa da Multa',
      'FGTS',
      'Outros Benefícios Previdenciários',
      'Previdenciária Bancária',
      'Público',
      'Responsabilidade Civil',
      'Seguro',
    ],
  },
  {
    chave: 'setor_comercial',
    nome: 'Setor Comercial',
    tipo: 'BOOLEANO',
    obrigatorio: true,
    opcoes: [],
  },
  {
    chave: 'quem_indicou',
    nome: 'Quem indicou?',
    tipo: 'SELECT',
    obrigatorio: true,
    opcoes: [
      'Advogados Externos',
      'Área Cível',
      'Asseio',
      'Indicado por Cliente',
      'Já é Cliente',
      'Mídias Sociais',
      'Parceiro',
      'Pós-venda',
      'Prospecção',
    ],
  },
  { chave: 'parceiro_quem', nome: 'Parceiro Quem?', tipo: 'TEXTO', obrigatorio: false, opcoes: [] },
  {
    chave: 'nucleos',
    nome: 'Núcleos',
    tipo: 'SELECT',
    obrigatorio: false,
    opcoes: ['Bancário', 'Civil', 'Concorde', 'FAP'],
  },
  {
    chave: 'numero_pasta_fisica',
    nome: 'Nº da Pasta Física - Migração',
    tipo: 'NUMERO',
    obrigatorio: false,
    opcoes: [],
  },
  {
    chave: 'assistente_tecnico',
    nome: 'Assistente Técnico',
    tipo: 'TEXTO',
    obrigatorio: false,
    opcoes: [],
  },
  { chave: 'high_ticket', nome: 'High Ticket', tipo: 'BOOLEANO', obrigatorio: true, opcoes: [] },
  {
    chave: 'outras_anotacoes',
    nome: 'Outras Anotações',
    tipo: 'TEXTAREA',
    obrigatorio: false,
    opcoes: [],
  },
] as const;

type LegalFolderDefaultsClient = {
  opcaoPastaJuridica: {
    upsert(args: Prisma.OpcaoPastaJuridicaUpsertArgs): Promise<unknown>;
  };
  campoExtra: {
    upsert(args: Prisma.CampoExtraUpsertArgs): Promise<unknown>;
  };
};

export async function provisionLegalFolderDefaults(
  prisma: LegalFolderDefaultsClient,
  escritorioId: string,
) {
  await Promise.all([
    ...LEGAL_FOLDER_CATEGORIES.map((label, ordem) =>
      prisma.opcaoPastaJuridica.upsert({
        where: { escritorioId_tipo_valor: { escritorioId, tipo: 'CATEGORIA', valor: label } },
        create: { escritorioId, tipo: 'CATEGORIA', valor: label, label, ordem: ordem + 1 },
        update: {},
      }),
    ),
    ...LEGAL_FOLDER_SITUATIONS.map(([valor, label], ordem) =>
      prisma.opcaoPastaJuridica.upsert({
        where: { escritorioId_tipo_valor: { escritorioId, tipo: 'SITUACAO', valor } },
        create: { escritorioId, tipo: 'SITUACAO', valor, label, ordem: ordem + 1 },
        update: {},
      }),
    ),
    ...LEGAL_FOLDER_EXTRA_FIELDS.map((field, index) =>
      prisma.campoExtra.upsert({
        where: {
          escritorioId_entidade_chave: {
            escritorioId,
            entidade: 'PASTA_JURIDICA',
            chave: field.chave,
          },
        },
        create: {
          escritorioId,
          entidade: 'PASTA_JURIDICA',
          ...field,
          opcoes: [...field.opcoes],
          ordem: index + 1,
        },
        update: {},
      }),
    ),
  ]);
}

export function identifierPrefix(clientName: string) {
  return clientName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 40);
}
