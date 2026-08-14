import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Reafirma docs/frontend/07-office-context.md §7.6 — "vínculo removido" e
 * "nunca teve escritório" não são distinguidos na UI (mesma lógica de não
 * revelar detalhe de autorização, §6.4). Opção de criar um novo escritório
 * reaproveita o fluxo de `/registro` já existente, conforme o documento.
 */
export function NoOfficeState() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <Building2 className="size-10 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Você não tem um escritório ativo</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Você não pertence a nenhum escritório no momento. Crie um novo escritório para continuar.
        </p>
      </div>
      <Button asChild>
        <Link href="/registro">Criar escritório</Link>
      </Button>
    </div>
  );
}
