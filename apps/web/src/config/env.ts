import { z } from 'zod';

/**
 * Valida env em boot — reafirma docs/frontend/04-app-router.md (bootstrap) e
 * o mesmo padrão já usado em apps/api/src/config/env.schema.ts. Falha cedo
 * e explicitamente, em vez de um `undefined` silencioso aparecer no meio de
 * uma chamada de API em produção.
 */
const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_STORAGE_URL: z.string().optional().default(''),
  NEXT_PUBLIC_API_MOCKING: z.enum(['enabled', 'disabled']).default('disabled'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_STORAGE_URL: process.env.NEXT_PUBLIC_STORAGE_URL,
    NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING,
  });

  if (!parsed.success) {
    throw new Error(
      `Variáveis de ambiente inválidas/ausentes:\n${parsed.error.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n')}`,
    );
  }

  return parsed.data;
}

export const env = loadEnv();
