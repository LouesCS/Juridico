import {
  LEGAL_FOLDER_EXTRA_FIELDS,
  identifierPrefix,
  provisionLegalFolderDefaults,
} from './legal-folder-defaults';

describe('defaults da Pasta Jurídica', () => {
  it('normaliza o Cliente de forma determinística para o Identificador', () => {
    expect(identifierPrefix('  Maria de Oliveira  ')).toBe('MARIADEOLIVEIRA');
    expect(identifierPrefix('João & Filhos')).toBe('JOAOFILHOS');
  });

  it('provisiona os 12 Campos Extras por chave sem sobrescrever personalizações', async () => {
    const prisma = {
      opcaoPastaJuridica: { upsert: jest.fn().mockResolvedValue({}) },
      campoExtra: { upsert: jest.fn().mockResolvedValue({}) },
    };
    await provisionLegalFolderDefaults(prisma as never, 'office-1');
    await provisionLegalFolderDefaults(prisma as never, 'office-1');

    expect(LEGAL_FOLDER_EXTRA_FIELDS).toHaveLength(12);
    expect(prisma.campoExtra.upsert).toHaveBeenCalledTimes(24);
    expect(prisma.campoExtra.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          escritorioId_entidade_chave: {
            escritorioId: 'office-1',
            entidade: 'PASTA_JURIDICA',
            chave: 'data_atendimento',
          },
        },
        update: {},
      }),
    );
  });
});
