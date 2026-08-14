'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ErrorState } from '@/components/feedback/error-state';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermission } from '@/hooks/use-permission';
import type { EntidadeConfiguravel } from '../api/configuration.api';
import { useBulkUpdateRequiredFields } from '../api/mutations';
import { useRequiredFields } from '../api/queries';

/**
 * Define QUAIS campos fixos de cada entidade são obrigatórios — não
 * conectado ao formulário real de Cliente/Processo nesta rodada (exigiria
 * alterar o contrato desses módulos, fora do escopo incremental do Prompt
 * 13; ver docs/backend-implementation/22-configuration-engine.md §22.9).
 * Lista de campos por entidade é curada aqui no frontend (os nomes reais
 * dos campos fixos de cada módulo), não inventada pelo backend.
 */
const CAMPOS_POR_ENTIDADE: Record<EntidadeConfiguravel, string[]> = {
  CLIENTE: [
    'nomeSocial',
    'razaoSocial',
    'cpf',
    'cnpj',
    'rg',
    'emails',
    'telefones',
    'telefoneResidencial',
    'telefoneResponsavel',
    'responsavelNome',
    'nomeMae',
    'nomePai',
    'estadoCivil',
    'profissao',
    'dataNascimento',
    'enderecoCep',
    'enderecoLogradouro',
    'enderecoNumero',
    'enderecoComplemento',
    'enderecoBairro',
    'enderecoCidade',
    'enderecoUf',
    'observacoes',
  ],
  PROCESSO: ['numeroCnj', 'vara', 'comarca', 'valorCausa'],
  DOCUMENTO: ['descricao', 'observacoes'],
  TAREFA: ['descricao', 'prazo', 'responsavel'],
  PASTA_JURIDICA: ['prefixo', 'assunto', 'categoria', 'clientePrincipalId', 'encarregadoId'],
  MOVIMENTACAO_EXTRAJUDICIAL: ['clienteId', 'processoId', 'tipo', 'responsavelId', 'descricao'],
};
const ENTIDADE_LABELS: Record<EntidadeConfiguravel, string> = {
  CLIENTE: 'Cliente',
  PROCESSO: 'Processo',
  DOCUMENTO: 'Documento',
  TAREFA: 'Tarefa',
  PASTA_JURIDICA: 'Pasta Jurídica',
  MOVIMENTACAO_EXTRAJUDICIAL: 'Movimentação Extrajudicial',
};

export function RequiredFieldsPage() {
  const { data: salvos, isLoading, isError, refetch } = useRequiredFields();
  const canManage = usePermission('configuration:manage');
  const bulkUpdate = useBulkUpdateRequiredFields();
  const [draft, setDraft] = React.useState<Map<string, boolean> | null>(null);

  React.useEffect(() => {
    if (salvos && !draft) {
      setDraft(new Map(salvos.map((s) => [`${s.entidade}:${s.campo}`, s.obrigatorio])));
    }
  }, [salvos, draft]);

  if (isLoading || !draft) {
    if (isError) return <ErrorState onRetry={() => refetch()} />;
    return <Skeleton className="h-64 w-full" />;
  }

  function toggle(entidade: EntidadeConfiguravel, campo: string, checked: boolean) {
    setDraft((prev) => {
      const next = new Map(prev);
      next.set(`${entidade}:${campo}`, checked);
      return next;
    });
  }

  function handleSave() {
    if (!draft) return;
    const itens = Array.from(draft.entries()).map(([key, obrigatorio]) => {
      const [entidade, campo] = key.split(':') as [EntidadeConfiguravel, string];
      return { entidade, campo, obrigatorio };
    });
    bulkUpdate.mutate(itens, {
      onSuccess: () => toast.success('Campos obrigatórios atualizados.'),
      onError: () => toast.error('Não foi possível salvar.'),
    });
  }

  return (
    <div className="space-y-4">
      {(Object.keys(CAMPOS_POR_ENTIDADE) as EntidadeConfiguravel[]).map((entidade) => (
        <Card key={entidade}>
          <CardHeader>
            <CardTitle className="text-base">{ENTIDADE_LABELS[entidade]}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {CAMPOS_POR_ENTIDADE[entidade].map((campo) => {
              const key = `${entidade}:${campo}`;
              return (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={key}
                    disabled={!canManage}
                    checked={draft.get(key) ?? false}
                    onCheckedChange={(checked) => toggle(entidade, campo, checked === true)}
                  />
                  <Label htmlFor={key} className="font-normal">
                    {campo}
                  </Label>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {canManage && (
        <div className="flex justify-end">
          <Button onClick={handleSave} loading={bulkUpdate.isPending}>
            Salvar
          </Button>
        </div>
      )}
    </div>
  );
}
