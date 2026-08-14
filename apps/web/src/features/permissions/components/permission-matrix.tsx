'use client';

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { PermissionCatalogItem } from '../api/permissions.api';

function groupByCategoria(catalog: PermissionCatalogItem[]): Map<string, PermissionCatalogItem[]> {
  const groups = new Map<string, PermissionCatalogItem[]>();
  for (const item of catalog) {
    const list = groups.get(item.categoria) ?? [];
    list.push(item);
    groups.set(item.categoria, list);
  }
  return groups;
}

/**
 * Matriz de permissões, agrupada por categoria — usada tanto para criar um
 * perfil customizado quanto para editar as permissões de um existente.
 * `atorPermissions` implementa no front o mesmo "teto de privilégio" que o
 * backend já impõe (`assertNoEscalation`, Prompt 12): uma chave que quem
 * está editando não possui aparece desabilitada, nunca escondida — o OWNER
 * vê exatamente por que não pode marcá-la, em vez de descobrir só ao
 * salvar.
 */
export function PermissionMatrix({
  catalog,
  value,
  onChange,
  atorPermissions,
  disabled,
}: {
  catalog: PermissionCatalogItem[];
  value: string[];
  onChange: (next: string[]) => void;
  atorPermissions: string[];
  disabled?: boolean;
}) {
  const grouped = React.useMemo(() => groupByCategoria(catalog), [catalog]);
  const selected = React.useMemo(() => new Set(value), [value]);

  function toggle(chave: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(chave);
    else next.delete(chave);
    onChange(Array.from(next));
  }

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([categoria, items]) => (
        <div key={categoria} className="rounded-md border border-border p-3">
          <p className="mb-2 text-sm font-medium">{categoria}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {items.map((item) => {
              const podeConceder = atorPermissions.includes(item.chave);
              const checkbox = (
                <label
                  key={item.chave}
                  className="flex items-start gap-2 text-sm"
                  aria-disabled={!podeConceder || disabled}
                >
                  <Checkbox
                    checked={selected.has(item.chave)}
                    disabled={disabled || !podeConceder}
                    onCheckedChange={(checked) => toggle(item.chave, checked === true)}
                    aria-label={item.descricao}
                  />
                  <span className={!podeConceder ? 'text-muted-foreground' : undefined}>
                    {item.descricao}
                  </span>
                </label>
              );
              if (podeConceder) return checkbox;
              return (
                <Tooltip key={item.chave}>
                  <TooltipTrigger asChild>{checkbox}</TooltipTrigger>
                  <TooltipContent>Você não tem esta permissão — não pode concedê-la a outro perfil.</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
