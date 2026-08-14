import * as React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

/**
 * Wrapper leve sobre `<table>` semântico — não uma biblioteca de tabela
 * (sem TanStack Table nesta rodada, nenhuma tela ainda precisa de
 * sort/resize client-side; `GET /members` já retorna a lista completa,
 * sem paginação server-side). Ampliar para uma solução mais robusta
 * quando uma tela realmente precisar de paginação por cursor em tabela.
 */
export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  isLoading = false,
  skeletonRows = 3,
  emptyState,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  skeletonRows?: number;
  emptyState?: React.ReactNode;
}) {
  return (
    <div data-slot="data-table-surface" className="overflow-x-auto rounded-lg border">
      {!isLoading && data.length === 0 && emptyState ? (
        <div className="p-6">{emptyState}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: skeletonRows }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    {columns.map((column) => (
                      <TableCell key={column.key}>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : data.map((row) => (
                  <TableRow key={rowKey(row)}>
                    {columns.map((column) => (
                      <TableCell key={column.key} className={column.className}>
                        {column.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
