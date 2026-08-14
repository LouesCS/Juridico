import { beforeEach, describe, expect, it } from 'vitest';
import { clearRecentItems, getRecentItems, pushRecentItem } from './recent-items';

describe('recent-items (localStorage)', () => {
  beforeEach(() => {
    clearRecentItems();
  });

  it('começa vazio', () => {
    expect(getRecentItems()).toEqual([]);
  });

  it('adiciona um item recente no topo', () => {
    pushRecentItem({
      id: '1',
      tipo: 'clients',
      titulo: 'Roberto',
      subtitulo: null,
      url: '/clientes/1',
    });
    const items = getRecentItems();
    expect(items).toHaveLength(1);
    expect(items[0].titulo).toBe('Roberto');
    expect(items[0].abertoEm).toBeDefined();
  });

  it('remove duplicata (mesmo id+tipo) antes de reinserir no topo', () => {
    pushRecentItem({
      id: '1',
      tipo: 'clients',
      titulo: 'Roberto',
      subtitulo: null,
      url: '/clientes/1',
    });
    pushRecentItem({
      id: '2',
      tipo: 'clients',
      titulo: 'Maria',
      subtitulo: null,
      url: '/clientes/2',
    });
    pushRecentItem({
      id: '1',
      tipo: 'clients',
      titulo: 'Roberto',
      subtitulo: null,
      url: '/clientes/1',
    });

    const items = getRecentItems();
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe('1');
  });

  it('mantém no máximo 5 itens', () => {
    for (let i = 0; i < 8; i++) {
      pushRecentItem({
        id: `${i}`,
        tipo: 'clients',
        titulo: `Item ${i}`,
        subtitulo: null,
        url: `/clientes/${i}`,
      });
    }
    expect(getRecentItems()).toHaveLength(5);
    expect(getRecentItems()[0].id).toBe('7');
  });
});
