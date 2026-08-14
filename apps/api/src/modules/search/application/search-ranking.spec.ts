import {
  buildSnippet,
  computeScore,
  isNumericQuery,
  normalizeText,
  onlyDigits,
  textRank,
} from './search-ranking';

describe('search-ranking', () => {
  describe('normalizeText', () => {
    it('remove acentos e normaliza caixa', () => {
      expect(normalizeText('Processo')).toBe('processo');
      expect(normalizeText('ação')).toBe('acao');
    });
  });

  describe('onlyDigits / isNumericQuery', () => {
    it('extrai apenas dígitos', () => {
      expect(onlyDigits('123.456.789-00')).toBe('12345678900');
    });

    it('reconhece query numérica a partir de 4 dígitos', () => {
      expect(isNumericQuery('123')).toBe(false);
      expect(isNumericQuery('1234')).toBe(true);
      expect(isNumericQuery('proc')).toBe(false);
    });
  });

  describe('textRank', () => {
    it('rank 0 para correspondência exata de campo alternativo', () => {
      expect(textRank('12345678900', 'João Silva', ['12345678900'])).toBe(0);
    });

    it('rank 0 quando o campo primário é idêntico à query', () => {
      expect(textRank('silva', 'Silva')).toBe(0);
    });

    it('rank 1 quando o campo primário começa com a query', () => {
      expect(textRank('proc', 'Processo Trabalhista')).toBe(1);
    });

    it('rank 2 quando o campo primário contém a query no meio', () => {
      expect(textRank('trabalhista', 'Processo Trabalhista')).toBe(2);
    });

    it('rank 3 quando não há campo primário', () => {
      expect(textRank('x', null)).toBe(3);
    });
  });

  describe('computeScore', () => {
    it('rank 0 sempre no topo, mesmo sem data', () => {
      expect(computeScore(0)).toBe(1);
    });

    it('aplica leve boost de recência sem ultrapassar 1', () => {
      const hoje = new Date();
      expect(computeScore(0, hoje)).toBe(1);
      expect(computeScore(1, hoje)).toBeGreaterThan(0.85);
    });

    it('sem boost para atualização antiga', () => {
      const antigo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365);
      expect(computeScore(2, antigo)).toBe(0.6);
    });
  });

  describe('buildSnippet', () => {
    it('retorna null para texto vazio', () => {
      expect(buildSnippet(null, 'x')).toBeNull();
      expect(buildSnippet(undefined, 'x')).toBeNull();
    });

    it('envolve o termo encontrado com <mark>', () => {
      const snippet = buildSnippet('Procuração outorgada a João Silva', 'silva');
      expect(snippet).toContain('<mark>Silva</mark>');
    });

    it('escapa HTML do texto ao redor do termo', () => {
      const snippet = buildSnippet('<script>alert(1)</script> Silva', 'silva');
      expect(snippet).not.toContain('<script>');
      expect(snippet).toContain('&lt;script&gt;');
    });

    it('trunca sem termo encontrado', () => {
      const textoLongo = 'a'.repeat(200);
      const snippet = buildSnippet(textoLongo, 'zzz', 50);
      expect(snippet?.endsWith('…')).toBe(true);
      expect(snippet?.length).toBeLessThan(60);
    });
  });
});
