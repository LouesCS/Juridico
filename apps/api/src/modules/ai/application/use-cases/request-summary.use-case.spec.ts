import { Result } from '../../../../shared/domain/result';
import { RequestSummaryUseCase } from './request-summary.use-case';

const contextoOk = Result.ok({ promptContext: { campos: {} }, fontes: [] });
const user = { membroId: 'm1', permissions: [] } as never;

function buildDeps() {
  const caseContextBuilder = { build: jest.fn().mockResolvedValue(contextoOk) };
  const documentContextBuilder = { build: jest.fn().mockResolvedValue(contextoOk) };
  const clientContextBuilder = { build: jest.fn().mockResolvedValue(contextoOk) };
  const taskContextBuilder = { build: jest.fn().mockResolvedValue(contextoOk) };
  const aiSummaryService = {
    requestSummary: jest.fn().mockResolvedValue(Result.ok({ id: 'r1', status: 'GERANDO' })),
  };
  const useCase = new RequestSummaryUseCase(
    caseContextBuilder as never,
    documentContextBuilder as never,
    clientContextBuilder as never,
    taskContextBuilder as never,
    aiSummaryService as never,
  );
  return {
    caseContextBuilder,
    documentContextBuilder,
    clientContextBuilder,
    taskContextBuilder,
    aiSummaryService,
    useCase,
  };
}

describe('RequestSummaryUseCase', () => {
  it.each([
    ['GERAL', 'resumo-processo-geral'],
    ['EXECUTIVO', 'resumo-processo-executivo'],
    ['CRONOLOGICO', 'resumo-processo-cronologico'],
    ['PONTOS_CHAVE', 'resumo-processo-pontoschave'],
    ['RISCOS', 'resumo-processo-riscos'],
  ])('mapeia tipoResumo=%s para o template %s (PROCESSO)', async (tipoResumo, templateId) => {
    const { useCase, aiSummaryService } = buildDeps();
    await useCase.execute('escritorio-1', 'PROCESSO', 'processo-1', tipoResumo as never, user);
    expect(aiSummaryService.requestSummary).toHaveBeenCalledWith(
      expect.objectContaining({ templateId, tipoResumo }),
    );
  });

  it('DOCUMENTO sempre usa tipoResumo=RESUMO_DOCUMENTO independente do parâmetro', async () => {
    const { useCase, aiSummaryService, documentContextBuilder } = buildDeps();
    await useCase.execute('escritorio-1', 'DOCUMENTO', 'doc-1', undefined, user);
    expect(documentContextBuilder.build).toHaveBeenCalledWith('escritorio-1', 'doc-1', user);
    expect(aiSummaryService.requestSummary).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: 'resumo-documento', tipoResumo: 'RESUMO_DOCUMENTO' }),
    );
  });

  it('CLIENTE sempre usa tipoResumo=HISTORICO_CLIENTE', async () => {
    const { useCase, aiSummaryService, clientContextBuilder } = buildDeps();
    await useCase.execute('escritorio-1', 'CLIENTE', 'cliente-1', undefined, user);
    expect(clientContextBuilder.build).toHaveBeenCalledWith('escritorio-1', 'cliente-1', user);
    expect(aiSummaryService.requestSummary).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: 'resumo-cliente', tipoResumo: 'HISTORICO_CLIENTE' }),
    );
  });

  it('TAREFA usa tipoResumo=TAREFA_RESUMO por padrão (Prompt 14)', async () => {
    const { useCase, aiSummaryService, taskContextBuilder } = buildDeps();
    await useCase.execute('escritorio-1', 'TAREFA', 'tarefa-1', undefined, user);
    expect(taskContextBuilder.build).toHaveBeenCalledWith('escritorio-1', 'tarefa-1', user);
    expect(aiSummaryService.requestSummary).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: 'tarefa-resumo', tipoResumo: 'TAREFA_RESUMO' }),
    );
  });

  it('TAREFA respeita o tipoResumo explícito (ex.: gerar checklist)', async () => {
    const { useCase, aiSummaryService } = buildDeps();
    await useCase.execute('escritorio-1', 'TAREFA', 'tarefa-1', 'TAREFA_CHECKLIST', user);
    expect(aiSummaryService.requestSummary).toHaveBeenCalledWith(
      expect.objectContaining({ templateId: 'tarefa-checklist', tipoResumo: 'TAREFA_CHECKLIST' }),
    );
  });

  it('propaga force=true ao AiSummaryService (regeneração)', async () => {
    const { useCase, aiSummaryService } = buildDeps();
    await useCase.execute('escritorio-1', 'PROCESSO', 'processo-1', 'GERAL', user, true);
    expect(aiSummaryService.requestSummary).toHaveBeenCalledWith(
      expect.objectContaining({ force: true }),
    );
  });

  it('propaga falha do ContextBuilder sem chamar AiSummaryService', async () => {
    const { useCase, aiSummaryService, caseContextBuilder } = buildDeps();
    const erro = Result.fail({ code: 'NOT_FOUND', message: 'Processo não encontrado.' } as never);
    caseContextBuilder.build.mockResolvedValue(erro);

    const result = await useCase.execute('escritorio-1', 'PROCESSO', 'processo-1', 'GERAL', user);

    expect(result).toBe(erro);
    expect(aiSummaryService.requestSummary).not.toHaveBeenCalled();
  });
});
