'use client';

import { useRouter } from 'next/navigation';
import { Construction, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/**
 * Stub de navegação — usado só pelas rotas que existem na árvore oficial
 * (docs/frontend/03-rotas.md) mas cujo módulo ainda não foi implementado
 * nesta rodada (ver docs/frontend-implementation/00-status.md). Existe
 * para que o App Shell não tenha links mortos, nunca para simular uma
 * funcionalidade completa.
 */
export function ComingSoon({ title, description }: { title: string; description: string }) {
  const router = useRouter();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <Construction className="size-7 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-xl font-semibold">{title}</h1>
          <Badge variant="outline">Em desenvolvimento</Badge>
        </div>
        <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
      </div>
      <Button variant="outline" onClick={() => router.back()}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar
      </Button>
    </div>
  );
}
