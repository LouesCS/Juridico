'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { env } from '@/config/env';
import { isApiError } from '@/lib/api/errors';
import { useLogin } from '../api/mutations';
import { loginSchema, type LoginFormValues } from '../schemas/auth.schemas';

/**
 * Reafirma docs/frontend/05-autenticacao.md §5.4/§5.5 — sucesso invalida
 * `['me']` e redireciona para `next` (validado como path relativo, nunca
 * URL absoluta — docs/frontend/25-security.md §25.3) ou `/`.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useLogin();
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', senha: '', lembrarDeMim: false },
  });

  function safeNextPath(): string {
    const next = searchParams.get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) return next;
    return '/';
  }

  function onSubmit(values: LoginFormValues) {
    setFormError(null);
    login.mutate(values, {
      onSuccess: async () => {
        // Ponte exclusiva do modo demonstração — o mock de login (MSW) já
        // devolve 200, mas o navegador ignora `Set-Cookie` de respostas
        // sintetizadas por Service Worker, então o cookie `access_token`
        // que `middleware.ts` verifica nunca seria gravado só com o mock.
        // Sem efeito fora do modo mock (a rota responde 404 e este fetch
        // é ignorado). Ver docs/frontend-implementation/19-decisions.md.
        if (env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
          await fetch('/api/demo/login', { method: 'POST' }).catch(() => undefined);
        }
        router.push(safeNextPath());
      },
      onError: (error) => {
        if (isApiError(error) && error.code === 'INVALID_CREDENTIALS') {
          setFormError('Credenciais inválidas.');
          return;
        }
        if (isApiError(error) && error.code === 'ACCOUNT_LOCKED') {
          setFormError('Esta conta está temporariamente bloqueada.');
          return;
        }
        setFormError('Não foi possível completar a ação. Verifique sua conexão e tente novamente.');
      },
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="senha"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="lembrarDeMim"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  id="lembrar-de-mim"
                />
              </FormControl>
              <FormLabel htmlFor="lembrar-de-mim" className="cursor-pointer font-normal">
                Lembrar de mim
              </FormLabel>
            </FormItem>
          )}
        />

        {formError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" className="w-full" loading={login.isPending}>
          Entrar
        </Button>

        <div className="flex justify-between text-sm text-muted-foreground">
          <Link href="/esqueci-senha" className="underline-offset-4 hover:underline">
            Esqueci minha senha
          </Link>
          <Link href="/registro" className="underline-offset-4 hover:underline">
            Criar conta
          </Link>
        </div>
      </form>
    </Form>
  );
}
