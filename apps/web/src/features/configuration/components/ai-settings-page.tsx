'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/feedback/error-state';
import { usePermission } from '@/hooks/use-permission';
import { AiUsageTab } from '@/features/permissions/components/ai-usage-tab';
import { useAiSettings } from '../api/queries';
import { useUpdateAiSettings } from '../api/mutations';

/**
 * "Inteligência Artificial" — reaproveita `AiUsageTab` (Sprint 11/Prompt 12,
 * componente inalterado) para o consumo já existente, e adiciona aqui a
 * PARAMETRIZAÇÃO nova do Prompt 13 (provider/modelo/cota/revisão humana),
 * gated por `ai:manage` — sem essa permissão, os campos ficam somente
 * leitura e o botão Salvar fica ausente.
 */
export function AiSettingsPage() {
  const { data, isLoading, isError, refetch } = useAiSettings();
  const update = useUpdateAiSettings();
  const canManage = usePermission('ai:manage');
  const [draft, setDraft] = React.useState<{
    providerPadrao: string;
    modeloPadrao: string | null;
    cotaMensalPersonalizada: number | null;
    exigirRevisaoHumana: boolean;
  } | null>(null);

  React.useEffect(() => {
    if (data && !draft) {
      setDraft({
        providerPadrao: data.providerPadrao,
        modeloPadrao: data.modeloPadrao,
        cotaMensalPersonalizada: data.cotaMensalPersonalizada,
        exigirRevisaoHumana: data.exigirRevisaoHumana,
      });
    }
  }, [data, draft]);

  function handleSave() {
    if (!draft) return;
    update.mutate(draft, {
      onSuccess: () => toast.success('Configurações de IA atualizadas.'),
      onError: () => toast.error('Não foi possível salvar as configurações.'),
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parametrização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading || !draft ? (
            isError ? <ErrorState onRetry={() => refetch()} /> : <Skeleton className="h-40 w-full" />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Provider padrão</Label>
                  <Select
                    value={draft.providerPadrao}
                    onValueChange={(v) => setDraft({ ...draft, providerPadrao: v })}
                    disabled={!canManage}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(data?.providersDisponiveis ?? []).map((provider) => (
                        <SelectItem key={provider} value={provider}>
                          {provider}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="modelo-padrao">Modelo padrão (opcional)</Label>
                  <Input
                    id="modelo-padrao"
                    disabled={!canManage}
                    value={draft.modeloPadrao ?? ''}
                    onChange={(e) => setDraft({ ...draft, modeloPadrao: e.target.value || null })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cota-mensal">Cota mensal personalizada (substitui a do plano)</Label>
                  <Input
                    id="cota-mensal"
                    type="number"
                    min={1}
                    disabled={!canManage}
                    value={draft.cotaMensalPersonalizada ?? ''}
                    placeholder="Usar cota do plano"
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        cotaMensalPersonalizada: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="exigir-revisao"
                  disabled={!canManage}
                  checked={draft.exigirRevisaoHumana}
                  onCheckedChange={(checked) => setDraft({ ...draft, exigirRevisaoHumana: checked === true })}
                />
                <Label htmlFor="exigir-revisao" className="font-normal">
                  Exigir revisão humana antes de compartilhar respostas de IA
                </Label>
              </div>
              {canManage && (
                <div className="flex justify-end">
                  <Button onClick={handleSave} loading={update.isPending}>
                    Salvar
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AiUsageTab />
    </div>
  );
}
