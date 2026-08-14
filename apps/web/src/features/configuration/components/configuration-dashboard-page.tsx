'use client';

import { Cog, History, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/feedback/empty-state';
import { ErrorState } from '@/components/feedback/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfigurationDashboard } from '../api/queries';

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

const ACAO_LABELS: Record<string, string> = {
  CREATE_EXTRA_FIELD: 'Campo extra criado',
  UPDATE_EXTRA_FIELD: 'Campo extra atualizado',
  DELETE_EXTRA_FIELD: 'Campo extra excluído',
  CREATE_VALUE_SET: 'Conjunto de valores criado',
  UPDATE_VALUE_SET: 'Conjunto de valores atualizado',
  DELETE_VALUE_SET: 'Conjunto de valores excluído',
  CREATE_TASK_CATEGORY: 'Categoria de tarefa criada',
  UPDATE_TASK_CATEGORY: 'Categoria de tarefa atualizada',
  DELETE_TASK_CATEGORY: 'Categoria de tarefa excluída',
  CREATE_COLLABORATOR_GROUP: 'Grupo de colaboradores criado',
  UPDATE_COLLABORATOR_GROUP: 'Grupo de colaboradores atualizado',
  DELETE_COLLABORATOR_GROUP: 'Grupo de colaboradores excluído',
  CREATE_TASK_TEMPLATE: 'Modelo de tarefa criado',
  UPDATE_TASK_TEMPLATE: 'Modelo de tarefa atualizado',
  DELETE_TASK_TEMPLATE: 'Modelo de tarefa excluído',
  CREATE_HOLIDAY: 'Feriado criado',
  UPDATE_HOLIDAY: 'Feriado atualizado',
  DELETE_HOLIDAY: 'Feriado excluído',
  UPDATE_GENERAL_SETTINGS: 'Configurações gerais atualizadas',
  UPDATE_FINANCIAL_SETTINGS: 'Configurações financeiras atualizadas',
  UPDATE_AI_SETTINGS: 'Configurações de IA atualizadas',
};

/**
 * "Dashboard das Configurações" pedido pelo Prompt 13 — reaproveita
 * exclusivamente componentes já existentes (`Card`, `EmptyState`,
 * `ErrorState`, `Skeleton`), nenhum componente novo de dashboard. Métricas
 * vêm de `GET /configuration/dashboard-summary`, que por sua vez reaproveita
 * `AiUsageUseCase` (Sprint 11) no backend — nenhum cálculo de consumo de
 * IA duplicado aqui.
 */
export function ConfigurationDashboardPage() {
  const { data, isLoading, isError, refetch } = useConfigurationDashboard();

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError || !data) return <ErrorState onRetry={() => refetch()} />;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cog className="size-4" aria-hidden="true" />
            Catálogos
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <Metric label="Campos Extras" value={data.quantidadeCamposExtra} />
          <Metric label="Categorias" value={data.quantidadeCategorias} />
          <Metric label="Conjuntos" value={data.quantidadeConjuntos} />
          <Metric label="Modelos" value={data.quantidadeModelos} />
          <Metric label="Grupos" value={data.quantidadeGrupos} />
          <Metric label="Usuários" value={data.quantidadeUsuarios} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4" aria-hidden="true" />
            Inteligência Artificial
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Metric label="Providers configurados" value={data.quantidadeProvidersIa} />
          <Metric label="Resumos gerados no mês" value={data.consumoIa.resumosGerados} />
          <Metric label="Cota mensal" value={data.consumoIa.cotaMensal ?? 'Ilimitada'} />
          <Metric
            label="Custo estimado (centavos)"
            value={data.consumoIa.custoEstimadoCentavosTotal}
          />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4" aria-hidden="true" />
            Últimas Alterações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.ultimasAlteracoes.length === 0 ? (
            <EmptyState icon={History} title="Nenhuma alteração registrada ainda" />
          ) : (
            <ul className="space-y-2">
              {data.ultimasAlteracoes.map((log) => (
                <li key={log.id} className="flex items-center justify-between text-sm">
                  <span>{ACAO_LABELS[log.acao] ?? log.acao}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.criadoEm).toLocaleString('pt-BR')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
