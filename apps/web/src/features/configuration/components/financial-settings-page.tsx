'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { usePermission } from '@/hooks/use-permission';
import { useFinancialSettings } from '../api/queries';
import { useUpdateFinancialSettings } from '../api/mutations';
import type { FinancialSettingsDTO } from '../api/configuration.api';

/**
 * Aba "Financeiro" — só chega até aqui quem tem `financeiro:read`
 * (`ConfigurationRouteGuard` na rota), permissão catálogo-apenas desde o
 * Prompt 12 (Permission Engine) que hoje ganha seu primeiro ponto de
 * aplicação real. Editar exige adicionalmente `configuration:manage` — o
 * botão Salvar fica AUSENTE (nunca desabilitado) sem essa permissão,
 * reafirmando a regra literal do Prompt 13.
 */
export function FinancialSettingsPage() {
  const { data, isLoading, isError, refetch } = useFinancialSettings();
  const update = useUpdateFinancialSettings();
  const canManage = usePermission('configuration:manage');
  const [draft, setDraft] = React.useState<FinancialSettingsDTO | null>(null);

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
      onSuccess: () => toast.success('Configurações financeiras atualizadas.'),
      onError: () => toast.error('Não foi possível salvar as configurações.'),
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Forma de cálculo de honorário padrão</Label>
            <Select
              value={draft.formaCalculoHonorarioPadrao}
              onValueChange={(v) => setDraft({ ...draft, formaCalculoHonorarioPadrao: v })}
              disabled={!canManage}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FIXO">Fixo</SelectItem>
                <SelectItem value="PERCENTUAL">Percentual (êxito)</SelectItem>
                <SelectItem value="MISTO">Misto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="percentual-honorario">Percentual padrão (%)</Label>
            <Input
              id="percentual-honorario"
              type="number"
              min={0}
              max={100}
              disabled={!canManage}
              value={draft.percentualHonorarioPadrao ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  percentualHonorarioPadrao: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dias-vencimento">Dias para vencimento padrão</Label>
            <Input
              id="dias-vencimento"
              type="number"
              min={0}
              disabled={!canManage}
              value={draft.diasVencimentoPadrao}
              onChange={(e) => setDraft({ ...draft, diasVencimentoPadrao: Number(e.target.value) })}
            />
          </div>
        </div>

        {canManage && (
          <div className="flex justify-end">
            <Button onClick={handleSave} loading={update.isPending}>
              Salvar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
