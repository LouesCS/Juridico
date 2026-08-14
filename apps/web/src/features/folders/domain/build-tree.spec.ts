import { describe, expect, it } from 'vitest';
import { buildFolderTree } from './build-tree';
import type { FolderDTO } from '../api/folders.api';

function folder(overrides: Partial<FolderDTO>): FolderDTO {
  return {
    id: 'id',
    nome: 'Pasta',
    pastaPaiId: null,
    processoId: null,
    ordem: 0,
    totalDocumentos: 0,
    favorito: false,
    criadoEm: '2026-01-01T00:00:00Z',
    atualizadoEm: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('buildFolderTree', () => {
  it('agrupa subpastas dentro do pai correto', () => {
    const flat = [
      folder({ id: 'raiz', nome: 'Contratos', pastaPaiId: null }),
      folder({ id: 'filha', nome: '2026', pastaPaiId: 'raiz' }),
      folder({ id: 'neta', nome: 'Janeiro', pastaPaiId: 'filha' }),
    ];

    const tree = buildFolderTree(flat);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('raiz');
    expect(tree[0].children[0].id).toBe('filha');
    expect(tree[0].children[0].children[0].id).toBe('neta');
  });

  it('ordena por ordem e depois por nome', () => {
    const flat = [
      folder({ id: 'b', nome: 'Beta', ordem: 1 }),
      folder({ id: 'a', nome: 'Alfa', ordem: 0 }),
    ];

    const tree = buildFolderTree(flat);

    expect(tree.map((n) => n.id)).toEqual(['a', 'b']);
  });

  it('trata pastaPaiId órfão (pai não presente na lista) como raiz', () => {
    const flat = [folder({ id: 'orfa', pastaPaiId: 'inexistente' })];

    const tree = buildFolderTree(flat);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('orfa');
  });
});
