import { Result } from '../../../../shared/domain/result';
import { AiChatUseCase } from './ai-chat.use-case';

const user = { membroId: 'm1', permissions: [] } as never;

function buildDeps() {
  const caseContextBuilder = {
    build: jest.fn().mockResolvedValue(
      Result.ok({
        promptContext: {
          campos: { Título: 'Ação X' },
          listas: { 'Próximos prazos': ['Contestação em 2026-08-10'] },
        },
        fontes: [
          {
            sourceType: 'PROCESSO',
            processoId: 'processo-1',
            trechoOuReferencia: 'Ação X',
            hashFonte: 'h',
          },
        ],
      }),
    ),
  };
  const documentContextBuilder = { build: jest.fn() };
  const universalSearch = {
    execute: jest.fn().mockResolvedValue({
      query: 'roberto',
      groups: [
        {
          type: 'clients',
          total: 1,
          items: [
            {
              id: 'cliente-1',
              tipo: 'clients',
              titulo: 'Roberto Almeida',
              subtitulo: null,
              url: '/clientes/cliente-1',
            },
          ],
        },
        { type: 'documents', total: 0, items: [] },
      ],
    }),
  };
  const registry = {
    getActive: jest.fn().mockReturnValue({
      generate: jest.fn().mockResolvedValue({
        content: 'Resposta gerada.',
        modelo: 'mock-v1',
        tokensEntrada: 5,
        tokensSaida: 3,
        latenciaMs: 2,
      }),
    }),
  };
  const quota = {
    checkQuota: jest.fn().mockResolvedValue({ permitido: true, resumosGerados: 0, cotaMensal: 20 }),
  };

  return {
    caseContextBuilder,
    documentContextBuilder,
    universalSearch,
    registry,
    quota,
    useCase: new AiChatUseCase(
      caseContextBuilder as never,
      documentContextBuilder as never,
      universalSearch as never,
      registry as never,
      quota as never,
    ),
  };
}

describe('AiChatUseCase', () => {
  it('rejeita pergunta com menos de 2 caracteres', async () => {
    const { useCase } = buildDeps();
    const result = await useCase.execute(
      'escritorio-1',
      { escopo: { tipo: 'GLOBAL' }, pergunta: 'a' },
      user,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MALFORMED_REQUEST');
  });

  it('bloqueia com AI_QUOTA_EXCEEDED quando a cota foi atingida', async () => {
    const { useCase, quota } = buildDeps();
    quota.checkQuota.mockResolvedValue({ permitido: false, resumosGerados: 20, cotaMensal: 20 });
    const result = await useCase.execute(
      'escritorio-1',
      { escopo: { tipo: 'GLOBAL' }, pergunta: 'algo válido' },
      user,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('AI_QUOTA_EXCEEDED');
  });

  it('escopo PROCESSO usa o CaseContextBuilder e nunca chama a Busca Global', async () => {
    const { useCase, caseContextBuilder, universalSearch } = buildDeps();
    const result = await useCase.execute(
      'escritorio-1',
      { escopo: { tipo: 'PROCESSO', id: 'processo-1' }, pergunta: 'Quando é o próximo prazo?' },
      user,
    );
    expect(result.ok).toBe(true);
    expect(caseContextBuilder.build).toHaveBeenCalledWith('escritorio-1', 'processo-1', user);
    expect(universalSearch.execute).not.toHaveBeenCalled();
    if (result.ok) {
      expect(result.value.fontes).toEqual([
        { tipo: 'PROCESSO', id: 'processo-1', titulo: 'Ação X', url: '/processos/processo-1' },
      ]);
    }
  });

  it('escopo PROCESSO/DOCUMENTO sem id é MALFORMED_REQUEST', async () => {
    const { useCase } = buildDeps();
    const result = await useCase.execute(
      'escritorio-1',
      { escopo: { tipo: 'PROCESSO' }, pergunta: 'pergunta válida' },
      user,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('MALFORMED_REQUEST');
  });

  it('escopo GLOBAL reaproveita a Busca Global (Sprint 10) como fonte, nunca duplica indexação', async () => {
    const { useCase, universalSearch, caseContextBuilder } = buildDeps();
    const result = await useCase.execute(
      'escritorio-1',
      { escopo: { tipo: 'GLOBAL' }, pergunta: 'roberto' },
      user,
    );

    expect(result.ok).toBe(true);
    expect(universalSearch.execute).toHaveBeenCalledWith(
      'escritorio-1',
      user,
      expect.objectContaining({ q: 'roberto' }),
    );
    expect(caseContextBuilder.build).not.toHaveBeenCalled();
    if (result.ok) {
      expect(result.value.fontes).toEqual([
        { tipo: 'clients', id: 'cliente-1', titulo: 'Roberto Almeida', url: '/clientes/cliente-1' },
      ]);
    }
  });
});
