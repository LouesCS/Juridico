import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface Breadcrumb {
  label: string;
  href?: string;
}

/**
 * Reusado por `PageHeader` (páginas com título) e `ModulePlaceholderPage`
 * (rotas ainda sem módulo real) — mesma trilha em toda a árvore de
 * navegação (Prompt 11 §Breadcrumbs). Cada nível com `href` é clicável;
 * o último nível (ou um nível intermediário sem página própria, ex.: um
 * grupo da Sidebar como "Financeiro") fica como texto estático.
 */
export function Breadcrumbs({ items }: { items: Breadcrumb[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-2">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="size-3.5" aria-hidden="true" />}
            {crumb.href ? (
              <Link href={crumb.href} className="transition-colors hover:text-foreground hover:underline">
                {crumb.label}
              </Link>
            ) : index === items.length - 1 ? (
              <span aria-current="page" className="font-medium text-foreground">
                {crumb.label}
              </span>
            ) : (
              <span>{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
