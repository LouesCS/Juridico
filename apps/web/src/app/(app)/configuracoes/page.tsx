'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PageHeader } from '@/components/layout/page-header';
import { useCurrentUser } from '@/features/auth';
import { ConfigurationDashboardPage, GeneralSettingsPage } from '@/features/configuration';
import { useAnyPermission } from '@/hooks/use-permission';

/**
 * "Geral" (landing do grupo CONFIGURAÇÕES, Prompt 13) — combina o
 * "Dashboard das Configurações" pedido pelo Prompt (métricas de Campos
 * Extras/Categorias/Conjuntos/Modelos/Grupos/Usuários/Providers IA/
 * Consumo IA/Últimas Alterações) com o formulário de configurações gerais
 * (fuso horário, idioma, formato de data, moeda, dia de início da semana).
 * Rota já existia desde o Prompt 11 (`ModulePlaceholderPage`) e passou a
 * render real no Prompt 12 (Permission Engine — Perfis/IA/Simulador);
 * aquele conteúdo agora vive em rotas próprias (`/configuracoes/permissoes`,
 * `/configuracoes/ia`), listadas no menu ao lado desta.
 */
export default function ConfiguracoesPage() {
  const router = useRouter();
  const { isLoading } = useCurrentUser();
  const allowed = useAnyPermission(['configuration:read']);

  React.useEffect(() => {
    if (isLoading || allowed) return;
    toast.error('Você não tem permissão para acessar as configurações do escritório.');
    router.replace('/');
  }, [isLoading, allowed, router]);

  if (isLoading || !allowed) return null;

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Visão geral do Configuration Engine e configurações gerais do escritório."
        breadcrumbs={[{ label: 'Configurações' }]}
      />
      <div className="space-y-6">
        <ConfigurationDashboardPage />
        <GeneralSettingsPage />
      </div>
    </div>
  );
}
