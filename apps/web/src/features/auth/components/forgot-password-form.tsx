'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { useRequestPasswordRecovery } from '../api/mutations';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../schemas/auth.schemas';

/**
 * Reafirma docs/frontend/05-autenticacao.md §5.4: sempre a mesma
 * mensagem de sucesso, exista ou não o e-mail (anti-enumeração,
 * `POST /auth/password-recovery` do backend sempre responde 202).
 */
export function ForgotPasswordForm() {
  const requestRecovery = useRequestPasswordRecovery();

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  function onSubmit(values: ForgotPasswordFormValues) {
    requestRecovery.mutate(values.email);
  }

  if (requestRecovery.isSuccess) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha em
        instantes.
      </p>
    );
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
        <Button type="submit" className="w-full" loading={requestRecovery.isPending}>
          Enviar link de recuperação
        </Button>
      </form>
    </Form>
  );
}
