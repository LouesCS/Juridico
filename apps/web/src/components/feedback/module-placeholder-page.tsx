import { Breadcrumbs, type Breadcrumb } from '@/components/layout/breadcrumbs';
import { ComingSoon } from './coming-soon';

/**
 * Composição de `Breadcrumbs` + `ComingSoon` para as rotas da nova Sidebar
 * (Prompt 11) cujo módulo de negócio ainda não existe (Contratos,
 * Financeiro, Serviços, ...). Mesma regra de `coming-soon.tsx`: existe só
 * para a árvore de navegação não ter links mortos, nunca para simular uma
 * funcionalidade.
 */
export function ModulePlaceholderPage({
  title,
  description,
  breadcrumbs,
}: {
  title: string;
  description: string;
  breadcrumbs: Breadcrumb[];
}) {
  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />
      <ComingSoon title={title} description={description} />
    </div>
  );
}
