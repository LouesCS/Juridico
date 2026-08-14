'use client';

/**
 * Falha catastrófica no próprio root layout — reafirma
 * docs/frontend/04-app-router.md §4.8 e docs/frontend/23-errors.md §23.2.
 * Única tela sem Sidebar/Topbar disponível nesse caso; precisa do próprio
 * `<html>`/`<body>` porque substitui o root layout inteiro.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-neutral-50">
        <div className="max-w-sm space-y-4 text-center">
          <h1 className="text-xl font-semibold">Algo deu errado</h1>
          <p className="text-sm text-neutral-400">
            Não foi possível carregar a aplicação. Nossa equipe já foi notificada.
          </p>
          {error.digest && <p className="text-xs text-neutral-500">Referência: {error.digest}</p>}
          <button
            onClick={reset}
            className="rounded-md bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-950"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
