'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { isApiError } from '@/lib/api/errors';
import { useResetPassword } from '../api/mutations';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../schemas/auth.schemas';

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const resetPassword = useResetPassword();
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { novaSenha: '', confirmarSenha: '' },
  });

  function onSubmit(values: ResetPasswordFormValues) {
    setFormError(null);
    resetPassword.mutate(
      { token, novaSenha: values.novaSenha },
      {
        onSuccess: () => router.push('/login?reason=password-reset'),
        onError: (error) => {
          if (isApiError(error) && error.code === 'MALFORMED_REQUEST') {
            setFormError('Este link de redefinição é inválido ou já expirou.');
            return;
          }
          setFormError(
            'Não foi possível completar a ação. Verifique sua conexão e tente novamente.',
          );
        },
      },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        <FormField
          control={form.control}
          name="novaSenha"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nova senha</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmarSenha"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar nova senha</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {formError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" className="w-full" loading={resetPassword.isPending}>
          Redefinir senha
        </Button>
      </form>
    </Form>
  );
}
