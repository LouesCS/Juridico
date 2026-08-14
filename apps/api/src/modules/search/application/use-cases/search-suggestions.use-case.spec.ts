import { SearchSuggestionsUseCase } from './search-suggestions.use-case';

describe('SearchSuggestionsUseCase', () => {
  it('filtra ações rápidas pela permissão do usuário', () => {
    const useCase = new SearchSuggestionsUseCase();
    const result = useCase.execute({ membroId: 'm1', permissions: ['case:create'] } as never);

    expect(result.sugestoes).toEqual([]);
  });

  it('não sugere nada para um usuário sem nenhuma permissão de criação', () => {
    const useCase = new SearchSuggestionsUseCase();
    const result = useCase.execute({ membroId: 'm1', permissions: [] } as never);
    expect(result.sugestoes).toEqual([]);
  });

  it('OWNER (todas as permissões) vê as três sugestões', () => {
    const useCase = new SearchSuggestionsUseCase();
    const result = useCase.execute({
      membroId: 'm1',
      permissions: ['case:create', 'client:create', 'document:create'],
    } as never);
    expect(result.sugestoes).toHaveLength(2);
  });
});
