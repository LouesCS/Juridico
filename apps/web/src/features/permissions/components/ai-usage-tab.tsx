'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceholderTabContent } from '@/components/feedback/placeholder-tab-content';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Coins, Gauge, Layers } from 'lucide-react';
import { useAiUsage } from '@/features/ai';

function formatCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Painel IA (Prompt 12 §Painel IA) — consome `GET /office/ai-usage`
 * (`useAiUsage`, já existia em `features/ai` desde a Sprint 11 mas nunca
 * tinha uma tela própria). Mostra exatamente o que o backend calcula hoje
 * (consumo/custo agregado do mês, por tipo de resumo, cota do plano);
 * detalhamento por provedor e catálogo de prompt templates ficam como
 * pendência explícita — o backend não expõe esses dados agregados ainda
 * (ver docs/backend-implementation/00-status.md).
 */
export function AiUsageTab() {
  const { data, isLoading } = useAiUsage(true);

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
            <Layers className="size-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Resumos gerados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{data.resumosGerados}</p>
            <p className="text-xs text-muted-foreground">no mês de {data.mesReferencia}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
            <Gauge className="size-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Cota mensal do plano</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {data.cotaMensal === null ? 'Ilimitada' : `${data.resumosGerados} / ${data.cotaMensal}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
            <Coins className="size-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Custo estimado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCentavos(data.custoEstimadoCentavosTotal)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <BarChart3 className="size-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-base">Consumo por tipo de resumo</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(data.porTipo).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum resumo gerado este mês ainda.</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(data.porTipo).map(([tipo, quantidade]) => (
                <li key={tipo} className="flex items-center justify-between text-sm">
                  <span>{tipo}</span>
                  <span className="font-medium tabular-nums">{quantidade}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <PlaceholderTabContent
        icon={Layers}
        title="Detalhamento por provedor e catálogo de prompts"
        description="Consumo por provedor (OpenAI/Anthropic/Gemini/Ollama) e o catálogo de prompt templates aparecerão aqui quando o backend expuser esses dados agregados — hoje `GET /office/ai-usage` só retorna o total do escritório."
      />
    </div>
  );
}
