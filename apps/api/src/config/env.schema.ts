import { z } from 'zod';

/**
 * Fail fast: o processo não sobe se a env estiver inválida.
 * Reafirma docs/05-arquitetura-backend.md §5.1 e docs/backend/01-arquitetura.md.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    API_PREFIX: z.string().default('api/v1'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),

    REDIS_URL: z.string().min(1, 'REDIS_URL é obrigatória'),

    JWT_PRIVATE_KEY_BASE64: z.string().optional().default(''),
    JWT_PUBLIC_KEY_BASE64: z.string().optional().default(''),
    JWT_KID: z.string().default('dev-key-1'),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
    JWT_REFRESH_TTL_REMEMBER_SECONDS: z.coerce.number().int().positive().default(2592000),

    COOKIE_DOMAIN: z.string().default('localhost'),
    COOKIE_SECURE: z.coerce.boolean().default(false),

    CORS_ORIGIN: z.string().default('http://localhost:3001'),

    GOOGLE_CLIENT_ID: z.string().optional().default(''),
    GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
    GOOGLE_CALLBACK_URL: z.string().optional().default(''),
    MICROSOFT_CLIENT_ID: z.string().optional().default(''),
    MICROSOFT_CLIENT_SECRET: z.string().optional().default(''),
    MICROSOFT_CALLBACK_URL: z.string().optional().default(''),

    STORAGE_PROVIDER: z.enum(['s3', 'local']).default('local'),
    STORAGE_S3_ENDPOINT: z.string().optional().default(''),
    STORAGE_S3_BUCKET: z.string().optional().default(''),
    STORAGE_S3_ACCESS_KEY: z.string().optional().default(''),
    STORAGE_S3_SECRET_KEY: z.string().optional().default(''),
    STORAGE_S3_REGION: z.string().optional().default('us-east-1'),
    // Base para as URLs assinadas que o LocalAdapter serve de si mesmo (ver
    // docs/backend/07-storage.md §7.3) — nunca usado pelo S3Adapter, que
    // gera URLs do provedor real.
    API_PUBLIC_URL: z.string().default('http://localhost:3000'),
    LOCAL_STORAGE_DIR: z.string().default('./storage-data'),
    LOCAL_STORAGE_SECRET: z.string().optional().default(''),

    MAIL_PROVIDER: z.enum(['smtp', 'ses', 'sendgrid']).default('smtp'),
    MAIL_SMTP_HOST: z.string().optional().default('localhost'),
    MAIL_SMTP_PORT: z.coerce.number().int().positive().default(1025),
    MAIL_FROM: z.string().default('naoresponda@quilombodev.com.br'),
    MAIL_SES_REGION: z.string().optional().default(''),
    MAIL_SENDGRID_API_KEY: z.string().optional().default(''),

    // Sprint 11 (Assistente Jurídico Inteligente) — `AI_PROVIDER`/`AI_API_KEY`
    // já existiam desde o bootstrap (Prompt 6A), nunca consumidos por nenhum
    // módulo até agora; estendidos aqui em vez de recriados (reafirma "não
    // recriar arquitetura"). `fake` (já era o default) passa a selecionar o
    // `MockAiProvider` real desta rodada — mesmo nome, agora com dono.
    AI_PROVIDER: z.enum(['fake', 'openai', 'anthropic', 'gemini', 'ollama']).default('fake'),
    AI_API_KEY: z.string().optional().default(''),
    AI_DEFAULT_MODEL: z.string().optional().default(''),
    AI_OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
    // Cota mensal de resumos de IA por plano do escritório (docs/api/14-ai.md
    // §14.1/§14.7) — placeholder de produto razoável, nenhum documento fixa
    // os números exatos; ajustável sem migração (config, não coluna).
    AI_MONTHLY_QUOTA_TRIAL: z.coerce.number().int().positive().default(20),
    AI_MONTHLY_QUOTA_ESSENCIAL: z.coerce.number().int().positive().default(100),
    AI_MONTHLY_QUOTA_PROFISSIONAL: z.coerce.number().int().positive().default(500),

    DATAJUD_API_KEY: z.string().optional().default(''),
    DATAJUD_BASE_URL: z.string().url().default('https://api-publica.datajud.cnj.jus.br'),
    JUDICIAL_CAPTURE_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),

    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.STORAGE_PROVIDER === 'local') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'STORAGE_PROVIDER=local não é permitido em produção (docs/backend/07-storage.md §7.3)',
        path: ['STORAGE_PROVIDER'],
      });
    }
    if (env.NODE_ENV === 'production' && !env.COOKIE_SECURE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'COOKIE_SECURE deve ser true em produção',
        path: ['COOKIE_SECURE'],
      });
    }
  });

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Configuração de ambiente inválida:\n${issues}`);
  }
  return parsed.data;
}
