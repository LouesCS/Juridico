'use client';

import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useMembers } from '@/features/team';
import { useSimulationStore } from '@/stores/simulation.store';

/**
 * "Simulador" (Prompt 12 §Simulador) — "OWNER navega exatamente como
 * aquele usuário, sem logout, sem troca de sessão". A troca de sessão de
 * verdade não acontece: a MESMA sessão continua ativa, e cada requisição
 * passa a levar `X-Simulate-Membro-Id` (ver `lib/api/client.ts`); o
 * backend (`SimulationGuard`) resolve as permissões REAIS do membro
 * simulado e as aplica à requisição — não é um efeito visual só no
 * frontend, os dados que voltam são exatamente os que aquele membro veria.
 */
export function SimulatorTab() {
  const { data: members, isLoading } = useMembers();
  const { simulatingMembroId, simulatingLabel, start, stop } = useSimulationStore();
  const [selectedId, setSelectedId] = React.useState('');
  const queryClient = useQueryClient();

  const activeMembers = members?.filter((m) => m.status === 'ATIVO') ?? [];

  // Trocar (ou sair de) simulação muda a identidade efetiva de praticamente
  // toda query em cache (permissões, dados escopados por membro) — limpar
  // tudo é mais seguro do que invalidar seletivamente e arriscar deixar
  // uma tela mostrando dados da identidade anterior.
  function handleStart() {
    const membro = activeMembers.find((m) => m.id === selectedId);
    if (!membro) return;
    start(membro.id, `${membro.usuario.nome} (${membro.papel})`);
    queryClient.clear();
  }

  function handleStop() {
    stop();
    queryClient.clear();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Simulador</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Veja o sistema exatamente como um membro específico veria — mesma sessão, sem logout. Os
          dados mostrados passam a respeitar as permissões reais daquele membro.
        </p>

        {simulatingMembroId ? (
          <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/5 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Eye className="size-4 text-primary" aria-hidden="true" />
              Simulando <span className="font-medium">{simulatingLabel}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleStop}>
              Sair da simulação
            </Button>
          </div>
        ) : isLoading ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <div className="flex items-center gap-2">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-72" aria-label="Selecionar membro para simular">
                <SelectValue placeholder="Selecione um membro" />
              </SelectTrigger>
              <SelectContent>
                {activeMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.usuario.nome} — {member.papel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleStart} disabled={!selectedId}>
              <Eye className="size-4" aria-hidden="true" />
              Simular
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
