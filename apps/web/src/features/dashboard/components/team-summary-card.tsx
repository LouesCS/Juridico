'use client';

import Link from 'next/link';
import { Users2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useMembers } from '@/features/team';
import { DashboardCard } from './dashboard-card';

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/** Real — reaproveita `useMembers()` de `features/team` (`GET /members`). */
export function TeamSummaryCard() {
  const { data: members, isLoading, isError, refetch } = useMembers();
  const active = (members ?? []).filter((m) => m.status === 'ATIVO');

  return (
    <DashboardCard
      title="Equipe"
      source="real"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      isEmpty={active.length === 0}
      emptyIcon={Users2}
      emptyTitle="Nenhum membro ativo"
    >
      <div className="space-y-3">
        <div className="flex -space-x-2">
          {active.slice(0, 6).map((member) => (
            <Avatar key={member.id} className="border-2 border-card">
              <AvatarFallback>{initials(member.usuario.nome)}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {active.length} {active.length === 1 ? 'membro ativo' : 'membros ativos'}
        </p>
        <Link href="/admin/usuarios" className="text-sm font-medium text-primary hover:underline">
          Ver equipe →
        </Link>
      </div>
    </DashboardCard>
  );
}
