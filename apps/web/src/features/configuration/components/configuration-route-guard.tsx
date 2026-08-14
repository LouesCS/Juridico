'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { useCurrentUser } from '@/features/auth';
import { useAnyPermission } from '@/hooks/use-permission';

/**
 * Mesmo padrão de gate de rota já usado em `(app)/configuracoes/page.tsx`
 * desde o Prompt 12 (`useAnyPermission` + toast + redirect) — extraído aqui
 * porque o Configuration Engine (Prompt 13) transformou uma única rota em
 * 11, e repetir esse bloco 11 vezes seria a duplicação que o Prompt pede
 * para evitar. A rota nunca 404 (sua existência não é segredo); só quem
 * tem a permissão permanece nela.
 */
export function ConfigurationRouteGuard({
  title,
  description,
  requiredPermissions,
  actions,
  children,
}: {
  title: string;
  description?: string;
  requiredPermissions: string[];
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isLoading } = useCurrentUser();
  const allowed = useAnyPermission(requiredPermissions);

  React.useEffect(() => {
    if (isLoading || allowed) return;
    toast.error('Você não tem permissão para acessar esta configuração.');
    router.replace('/');
  }, [isLoading, allowed, router]);

  if (isLoading || !allowed) return null;

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={actions}
        breadcrumbs={[{ label: 'Configurações', href: '/configuracoes' }, { label: title }]}
      />
      {children}
    </div>
  );
}
