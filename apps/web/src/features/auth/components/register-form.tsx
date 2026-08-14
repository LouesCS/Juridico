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
import { isApiError } from '@/lib/api/errors';
import { useRegister } from '../api/mutations';
import { registerSchema, type RegisterFormValues } from '../schemas/auth.schemas';

/**
 * Reafirma docs/frontend/05-autenticacao.md §5.4: sucesso mostra tela de
 * "verifique seu e-mail", SEM login automático — verificação de e-mail é
 * pré-requisito documentado, mesmo o endpoint de verificação ainda não
 * existindo no backend (docs/frontend-implementation/19-decisions.md).
 */
export function RegisterForm() {
  const registerMutation = useRegister();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = React.useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { nome: '', sobrenome: '', email: '', senha: '', nomeEscritorio: '' },
  });

  function onSubmit(values: RegisterFormValues) {
    setFormError(null);
    registerMutation.mutate(values, {
      onSuccess: () => setRegisteredEmail(values.email),
      onError: (error) => {
        if (isApiError(error) && error.code === 'EMAIL_ALREADY_EXISTS') {
          form.setError('email', { type: 'server', message: 'Este e-mail já está em uso.' });
          return;
        }
        if (isApiError(error) && error.fieldErrors) {
          error.fieldErrors.forEach((fieldError) => {
            form.setError(fieldError.field as keyof RegisterFormValues, {
              type: 'server',
              message: fieldError.message,
            });
          });
          return;
        }
        setFormError('Não foi possível completar a ação. Verifique sua conexão e tente novamente.');
      },
    });
  }

  if (registeredEmail) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Enviamos um link de confirmação para <strong>{registeredEmail}</strong>. Verifique sua caixa
        de entrada para ativar sua conta.
      </p>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input autoComplete="given-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sobrenome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sobrenome</FormLabel>
                <FormControl>
                  <Input autoComplete="family-name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nomeEscritorio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do escritório</FormLabel>
              <FormControl>
                <Input {...field} />
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

        <Button type="submit" className="w-full" loading={registerMutation.isPending}>
          Criar conta
        </Button>
      </form>
    </Form>
  );
}
