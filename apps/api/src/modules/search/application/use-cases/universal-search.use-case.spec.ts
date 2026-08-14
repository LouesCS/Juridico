import { UniversalSearchUseCase } from './universal-search.use-case';

function fakeAdapter(type: string, result: unknown) {
  return { type, search: jest.fn().mockResolvedValue(result) };
}

function fakeFailingAdapter(type: string) {
  return { type, search: jest.fn().mockRejectedValue(new Error('boom')) };
}

const user = { membroId: 'm1', permissions: [] } as never;

describe('UniversalSearchUseCase', () => {
  it('devolve os grupos sempre na ordem fixa, incluindo publications', async () => {
    const useCase = new UniversalSearchUseCase(
      fakeAdapter('clients', { type: 'clients', total: 0, items: [] }) as never,
      fakeAdapter('legal-cases', { type: 'legal-cases', total: 0, items: [] }) as never,
      fakeAdapter('documents', { type: 'documents', total: 0, items: [] }) as never,
      fakeAdapter('deadlines', { type: 'deadlines', total: 0, items: [] }) as never,
      fakeAdapter('tasks', { type: 'tasks', total: 0, items: [] }) as never,
      fakeAdapter('team', { type: 'team', total: 0, items: [] }) as never,
      fakeAdapter('folders', { type: 'folders', total: 0, items: [] }) as never,
      fakeAdapter('timeline', { type: 'timeline', total: 0, items: [] }) as never,
      fakeAdapter('tags', { type: 'tags', total: 0, items: [] }) as never,
      fakeAdapter('comments', {
        type: 'comments',
        total: 0,
        items: [],
        disponivel: false,
      }) as never,
      fakeAdapter('publications', { type: 'publications', total: 0, items: [] }) as never,
      fakeAdapter('judicial-movements', {
        type: 'judicial-movements',
        total: 0,
        items: [],
      }) as never,
    );

    const result = await useCase.execute('escritorio-1', user, { q: 'silva', limit: 8 } as never);

    expect(result.groups.map((g) => g.type)).toEqual([
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
    ]);
    expect(result.query).toBe('silva');
  });

  it('isola falha de um adapter — os demais grupos continuam presentes', async () => {
    const useCase = new UniversalSearchUseCase(
      fakeAdapter('clients', { type: 'clients', total: 1, items: [{ id: '1' }] }) as never,
      fakeFailingAdapter('legal-cases') as never,
      fakeAdapter('documents', { type: 'documents', total: 0, items: [] }) as never,
      fakeAdapter('deadlines', { type: 'deadlines', total: 0, items: [] }) as never,
      fakeAdapter('tasks', { type: 'tasks', total: 0, items: [] }) as never,
      fakeAdapter('team', { type: 'team', total: 0, items: [] }) as never,
      fakeAdapter('folders', { type: 'folders', total: 0, items: [] }) as never,
      fakeAdapter('timeline', { type: 'timeline', total: 0, items: [] }) as never,
      fakeAdapter('tags', { type: 'tags', total: 0, items: [] }) as never,
      fakeAdapter('comments', {
        type: 'comments',
        total: 0,
        items: [],
        disponivel: false,
      }) as never,
      fakeAdapter('publications', { type: 'publications', total: 0, items: [] }) as never,
      fakeAdapter('judicial-movements', {
        type: 'judicial-movements',
        total: 0,
        items: [],
      }) as never,
    );

    const result = await useCase.execute('escritorio-1', user, { q: 'silva', limit: 8 } as never);

    const legalCases = result.groups.find((g) => g.type === 'legal-cases');
    expect(legalCases).toEqual({ type: 'legal-cases', total: 0, items: [], disponivel: false });
    const clients = result.groups.find((g) => g.type === 'clients');
    expect(clients?.total).toBe(1);
  });

  it('respeita `types` — só chama os adapters solicitados', async () => {
    const clientsAdapter = fakeAdapter('clients', { type: 'clients', total: 0, items: [] });
    const legalCasesAdapter = fakeAdapter('legal-cases', {
      type: 'legal-cases',
      total: 0,
      items: [],
    });
    const useCase = new UniversalSearchUseCase(
      clientsAdapter as never,
      legalCasesAdapter as never,
      fakeAdapter('documents', { type: 'documents', total: 0, items: [] }) as never,
      fakeAdapter('deadlines', { type: 'deadlines', total: 0, items: [] }) as never,
      fakeAdapter('tasks', { type: 'tasks', total: 0, items: [] }) as never,
      fakeAdapter('team', { type: 'team', total: 0, items: [] }) as never,
      fakeAdapter('folders', { type: 'folders', total: 0, items: [] }) as never,
      fakeAdapter('timeline', { type: 'timeline', total: 0, items: [] }) as never,
      fakeAdapter('tags', { type: 'tags', total: 0, items: [] }) as never,
      fakeAdapter('comments', { type: 'comments', total: 0, items: [] }) as never,
      fakeAdapter('publications', { type: 'publications', total: 0, items: [] }) as never,
      fakeAdapter('judicial-movements', {
        type: 'judicial-movements',
        total: 0,
        items: [],
      }) as never,
    );

    const result = await useCase.execute('escritorio-1', user, {
      q: 'silva',
      limit: 8,
      types: 'clients',
    } as never);

    expect(clientsAdapter.search).toHaveBeenCalled();
    expect(legalCasesAdapter.search).not.toHaveBeenCalled();
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].type).toBe('clients');
  });
});
