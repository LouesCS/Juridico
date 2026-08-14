'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { useGeneralSettings } from '../api/queries';
import { useUpdateGeneralSettings } from '../api/mutations';
import type { GeneralSettingsDTO } from '../api/configuration.api';

/**
 * "Geral" — landing das Configurações além do Dashboard (Prompt 13).
 * Formulário simples com `useState` local (mesmo padrão leve de
 * `CreateRoleDialog`, não `react-hook-form`+zod — reservado a formulários
 * de domínio maiores como Cliente/Processo).
 */
export function GeneralSettingsPage() {
  const { data, isLoading, isError, refetch } = useGeneralSettings();
  const update = useUpdateGeneralSettings();
  const [draft, setDraft] = React.useState<GeneralSettingsDTO | null>(null);

  React.useEffect(() => {
    if (data && !draft) setDraft(data);
  }, [data, draft]);

  if (isLoading || !draft) {
    if (isError) return <ErrorState onRetry={() => refetch()} />;
    return <Skeleton className="h-64 w-full" />;
  }

  function handleSave() {
    if (!draft) return;
    update.mutate(draft, {
      onSuccess: () => toast.success('Configurações gerais atualizadas.'),
      onError: () => toast.error('Não foi possível salvar as configurações.'),
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fuso-horario">Fuso horário</Label>
            <Input
              id="fuso-horario"
              value={draft.fusoHorario}
              onChange={(e) => setDraft({ ...draft, fusoHorario: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="idioma">Idioma</Label>
            <Input id="idioma" value={draft.idioma} onChange={(e) => setDraft({ ...draft, idioma: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Formato de data</Label>
            <Select
              value={draft.formatoData}
              onValueChange={(v) => setDraft({ ...draft, formatoData: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/YYYY">DD/MM/AAAA</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/AAAA</SelectItem>
                <SelectItem value="YYYY-MM-DD">AAAA-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="moeda">Moeda padrão (ISO 4217)</Label>
            <Input
              id="moeda"
              value={draft.moedaPadrao}
              maxLength={3}
              onChange={(e) => setDraft({ ...draft, moedaPadrao: e.target.value.toUpperCase() })}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="notificacoes-padrao"
            checked={draft.notificacoesPadrao}
            onCheckedChange={(checked) => setDraft({ ...draft, notificacoesPadrao: checked === true })}
          />
          <Label htmlFor="notificacoes-padrao" className="font-normal">
            Novos membros recebem notificações por padrão
          </Label>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} loading={update.isPending}>
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
