import * as React from 'react';
import { Breadcrumbs, type Breadcrumb } from './breadcrumbs';

export type { Breadcrumb };

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {(actions || children) && <div className="flex shrink-0 items-center gap-2">{actions ?? children}</div>}
      </div>
    </div>
  );
}
