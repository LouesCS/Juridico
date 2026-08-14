import { env } from '@/config/env';

/**
 * Indicador visual obrigatório de que a sessão atual está rodando com MSW
 * ligado — reafirma a regra explícita do Prompt 6B: "identifique
 * visualmente e documentalmente que a integração é mockada". Fixo,
 * discreto, nunca removível via interação do usuário.
 */
export function MockBanner() {
  if (env.NEXT_PUBLIC_API_MOCKING !== 'enabled') return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-0 z-50 bg-warning px-3 py-1 text-center text-xs font-medium text-warning-foreground"
    >
      Modo de desenvolvimento com API mockada (MSW) — nenhuma chamada atinge um backend real.
    </div>
  );
}
