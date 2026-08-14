'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { auditApi, type AuditResourceType } from '../api/audit.api';
import { auditActionLabel, auditResourceLabel } from '../domain/audit-labels';

type Period = 'RECENTES' | 'ANTIGAS';

function changedFields(before: unknown, after: unknown): string {
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return '--';
  const left = before as Record<string, unknown>;
  const right = after as Record<string, unknown>;
  const fields = [...new Set([...Object.keys(left), ...Object.keys(right)])].filter(
    (key) => JSON.stringify(left[key]) !== JSON.stringify(right[key]),
  );
  return fields.length ? fields.join(', ') : '--';
}

export function AuditContextSection({
  resourceType,
  resourceId,
  splitByPeriod = false,
}: {
  resourceType: AuditResourceType;
  resourceId: string;
  splitByPeriod?: boolean;
}) {
  const [period, setPeriod] = React.useState<Period>('RECENTES');
  const [pages, setPages] = React.useState<Record<Period, number>>({ RECENTES: 1, ANTIGAS: 1 });
  const page = pages[period];
  const query = useQuery({
    queryKey: ['audit-context', resourceType, resourceId, period, page],
    queryFn: () => auditApi.context(resourceType, resourceId, page, 10, period),
  });
  const content = query.isLoading ? <Skeleton className="h-40" /> : query.isError ? (
    <ErrorState title="Não foi possível carregar a auditoria." onRetry={() => query.refetch()} />
  ) : !query.data?.items.length ? (
    <EmptyState icon={History} title="Nenhuma atividade de auditoria encontrada." />
  ) : (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="p-3">Atividade</th><th className="p-3">Data e hora / Usuário</th><th className="p-3">Identificador</th><th className="p-3">Recurso</th><th className="p-3">Alteração</th><th className="p-3">Resultado</th></tr></thead>
          <tbody className="divide-y">{query.data.items.map((item) => (
            <tr key={item.id}>
              <td className="max-w-56 p-3 font-medium"><span className="block truncate" title={auditActionLabel(item.acao)}>{auditActionLabel(item.acao)}</span></td>
              <td className="p-3"><span className="block whitespace-nowrap">{new Date(item.criadoEm).toLocaleString('pt-BR')}</span><span className="block max-w-48 truncate text-xs text-muted-foreground" title={item.atorNome ?? item.atorTipo}>{item.atorNome ?? item.atorTipo}</span></td>
              <td className="max-w-44 p-3"><span className="block truncate" title={item.recursoId ?? '--'}>{item.recursoId ?? '--'}</span></td>
              <td className="p-3">{auditResourceLabel(item.recursoTipo)}</td>
              <td className="max-w-52 p-3"><span className="block truncate" title={changedFields(item.dadosAntes, item.dadosDepois)}>{changedFields(item.dadosAntes, item.dadosDepois)}</span></td>
              <td className="p-3">{item.resultado === 'SUCESSO' ? 'Sucesso' : item.resultado === 'FALHA' ? 'Falha' : 'Negado'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {query.data.total > query.data.limit && <div className="mt-3 flex flex-wrap items-center justify-end gap-2"><Button variant="outline" disabled={page === 1} onClick={() => setPages((value) => ({ ...value, [period]: value[period] - 1 }))}>Anterior</Button><span className="text-sm">Página {page} de {Math.ceil(query.data.total / query.data.limit)}</span><Button variant="outline" disabled={page >= Math.ceil(query.data.total / query.data.limit)} onClick={() => setPages((value) => ({ ...value, [period]: value[period] + 1 }))}>Próxima</Button></div>}
    </>
  );

  return (
    <Card className="mt-4 min-w-0">
      <CardHeader><CardTitle>{splitByPeriod ? 'Auditoria de atividades' : 'Auditoria'}</CardTitle></CardHeader>
      <CardContent>
        {splitByPeriod ? <Tabs value={period} onValueChange={(value) => setPeriod(value as Period)}><div className="overflow-x-auto"><TabsList className="w-max"><TabsTrigger value="RECENTES">Atividades recentes</TabsTrigger><TabsTrigger value="ANTIGAS">Atividades antigas</TabsTrigger></TabsList></div><TabsContent value={period} className="space-y-3"><div><h3 className="font-semibold">Auditoria de atividades {period === 'RECENTES' ? 'recentes' : 'antigas'} ({query.data?.total ?? 0})</h3>{query.data?.cutoff && <p className="text-sm text-muted-foreground">{period === 'RECENTES' ? 'Atividades realizadas a partir de' : 'Atividades realizadas antes de'} {new Date(query.data.cutoff).toLocaleDateString('pt-BR')}.</p>}</div>{content}</TabsContent></Tabs> : content}
      </CardContent>
    </Card>
  );
}
