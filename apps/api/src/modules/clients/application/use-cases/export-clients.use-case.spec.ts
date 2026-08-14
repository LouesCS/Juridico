import { ExportClientsUseCase } from './export-clients.use-case';

function buildPrisma(clientes: unknown[] = []) {
  return {
    client: {
      cliente: { findMany: jest.fn().mockResolvedValue(clientes) },
    },
  };
}

const CLIENTE_BASE = {
  id: 'cliente-1',
  nome: 'Ana Souza',
  tipo: 'PESSOA_FISICA',
  categoriaRelacionamento: 'CLIENTE',
  cpf: '12345678900',
  cnpj: null,
  emails: ['ana@example.com'],
  telefones: ['1111-1111', '99999-9999'],
  status: 'ATIVO',
  criadoEm: new Date('2026-01-01T00:00:00.000Z'),
  atualizadoEm: new Date('2026-01-02T00:00:00.000Z'),
};

describe('ExportClientsUseCase', () => {
  it('inclui CPF/CNPJ por completo (rota já exige client:export no controller; sem gate extra de campo — Sprint "Remover mascaramento de dados do cliente em Processos")', async () => {
    const prisma = buildPrisma([CLIENTE_BASE]);

    const result = await new ExportClientsUseCase(prisma as never).execute(
      'escritorio-1',
      {} as never,
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0].documento).toBe('12345678900');
  });

  it('achata telefone/celular a partir do array telefones (índice 0/1)', async () => {
    const prisma = buildPrisma([CLIENTE_BASE]);

    const result = await new ExportClientsUseCase(prisma as never).execute(
      'escritorio-1',
      {} as never,
    );

    expect(result.items[0].telefone).toBe('1111-1111');
    expect(result.items[0].celular).toBe('99999-9999');
  });

  it('sinaliza truncado quando atinge o limite de exportação', async () => {
    const muitos = Array.from({ length: 5000 }, (_, i) => ({
      ...CLIENTE_BASE,
      id: `cliente-${i}`,
    }));
    const prisma = buildPrisma(muitos);

    const result = await new ExportClientsUseCase(prisma as never).execute(
      'escritorio-1',
      {} as never,
    );

    expect(result.truncado).toBe(true);
    expect(result.limite).toBe(5000);
  });
});
