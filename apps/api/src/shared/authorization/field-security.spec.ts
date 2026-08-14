import {
  DataClassification,
  type FieldRule,
  hasFullFieldAccess,
  redactFields,
} from './field-security';

interface ClienteFixture {
  id: string;
  nome: string;
  cpf: string | null;
  observacoes: string | null;
}

const RULES: ReadonlyArray<FieldRule> = [
  {
    field: 'cpf',
    classification: DataClassification.SIGILOSO,
    requiredPermission: 'client:read:sensitive',
  },
];

describe('redactFields', () => {
  const cliente: ClienteFixture = {
    id: 'c1',
    nome: 'João da Silva',
    cpf: '52998224725',
    observacoes: 'Cliente antigo',
  };

  it('redige (null) o campo sensível quando falta a permissão exigida', () => {
    const result = redactFields(cliente, RULES, []);
    expect(result.cpf).toBeNull();
    expect(result.nome).toBe('João da Silva'); // campo não regido, intocado
    expect(result.observacoes).toBe('Cliente antigo');
  });

  it('mantém o campo quando a permissão está presente', () => {
    const result = redactFields(cliente, RULES, ['client:read:sensitive']);
    expect(result.cpf).toBe('52998224725');
  });

  it('respeita a regra "recurso:acao:all" cobrindo o escopo exigido', () => {
    const result = redactFields(cliente, RULES, ['client:read:sensitive']);
    expect(result.cpf).toBe('52998224725');
  });

  it('não muta o objeto original', () => {
    redactFields(cliente, RULES, []);
    expect(cliente.cpf).toBe('52998224725');
  });
});

describe('hasFullFieldAccess', () => {
  it('true quando todas as regras estão satisfeitas', () => {
    expect(hasFullFieldAccess(RULES, ['client:read:sensitive'])).toBe(true);
  });

  it('false quando falta qualquer uma', () => {
    expect(hasFullFieldAccess(RULES, [])).toBe(false);
  });
});
