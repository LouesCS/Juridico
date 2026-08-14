'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useNotificationsPreview } from '../api/queries';
import { DashboardCard } from './dashboard-card';

export function NotificationsCard() {
  const { data, isLoading, isError, refetch } = useNotificationsPreview();

  return (
    <DashboardCard
      title="Notificações"
      source="mock"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      isEmpty={!data || data.recentes.length === 0}
      emptyIcon={Bell}
      emptyTitle="Nenhuma notificação"
    >
      {data && (
        <div className="space-y-3">
          <p className="text-sm font-medium">{data.naoLidas} não lidas</p>
          <ul className="space-y-2">
            {data.recentes.map((notification) => (
              <li key={notification.id} className="text-sm text-muted-foreground">
                {notification.titulo}
              </li>
            ))}
          </ul>
          <Link href="/notificacoes" className="inline-block text-sm font-medium text-primary hover:underline">
            Ver todas →
          </Link>
        </div>
      )}
    </DashboardCard>
  );
}
