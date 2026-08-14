import Link from 'next/link';
import { Button } from '@/components/ui/button';

/**
 * Reafirma docs/frontend/06-autorizacao.md §6.4: mesma tela e mesmo texto
 * para rota inexistente, recurso de outro tenant e recurso sem acesso
 * (segredo de justiça/confidencialidade) — nenhuma variação que revele a
 * causa real.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-lg font-semibold">Não encontramos o que você procurava</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        O item pode ter sido removido ou o endereço pode estar incorreto.
      </p>
      <Button asChild>
        <Link href="/">Voltar ao Dashboard</Link>
      </Button>
    </div>
  );
}
