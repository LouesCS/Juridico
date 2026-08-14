import type { FolderDTO } from '../api/folders.api';

export interface FolderTreeNode extends FolderDTO {
  children: FolderTreeNode[];
}

/** Monta a árvore a partir da lista plana (`pastaPaiId`) devolvida por `GET /folders` — a hierarquia real é sempre `pastaPaiId`, nunca um campo calculado. */
export function buildFolderTree(folders: FolderDTO[]): FolderTreeNode[] {
  const byId = new Map<string, FolderTreeNode>(folders.map((f) => [f.id, { ...f, children: [] }]));
  const roots: FolderTreeNode[] = [];

  for (const folder of byId.values()) {
    if (folder.pastaPaiId && byId.has(folder.pastaPaiId)) {
      byId.get(folder.pastaPaiId)!.children.push(folder);
    } else {
      roots.push(folder);
    }
  }

  const sortByOrdem = (a: FolderTreeNode, b: FolderTreeNode) => a.ordem - b.ordem || a.nome.localeCompare(b.nome);
  const sortRecursive = (nodes: FolderTreeNode[]) => {
    nodes.sort(sortByOrdem);
    nodes.forEach((node) => sortRecursive(node.children));
  };
  sortRecursive(roots);

  return roots;
}
