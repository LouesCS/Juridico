'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { isApiError } from '@/lib/api/errors';
import { useAcceptInvitation } from '../api/mutations';
import { acceptInvitationSchema, type AcceptInvitationFormValues } from '../schemas/team.schemas';

/**
 * Reafirma docs/api §aceite de convite — o backend não distingue "token
 * inválido" de "token expirado" (ambos retornam `NOT_FOUND` 404, mesma
 * lógica de não revelar detalhe de autorização, §6.4). Campos
 * nome/sobrenome/senha só são exigidos pelo backend se o e-mail convidado
 * ainda não tiver conta — como o frontend não sabe isso de antemão, o
 * formulário sempre os mostra; se o backend rejeitar por faltarem
 * (`MALFORMED_REQUEST` 422), o erro é mapeado para os campos.
 */
export function AcceptInvitationForm({ token }: { token: string }) {
  const router = useRouter();
  const accept = useAcceptInvitation();
  const [notFound, setNotFound] = React.useState(false);

  const form = useForm<AcceptInvitationFormValues>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { nome: '', sobrenome: '', senha: '' },
  });

  function onSubmit(values: AcceptInvitationFormValues) {
    const input = {
      nome: values.nome || undefined,
      sobrenome: values.sobrenome || undefined,
      senha: values.senha || undefined,
    };
    accept.mutate(
      { token, input },
      {
        onSuccess: () => router.push('/login'),
        onError: (error) => {
          if (isApiError(error) && error.status === 404) {
            setNotFound(true);
            return;
          }
          if (isApiError(error) && error.code === 'MALFORMED_REQUEST') {
            form.setError('nome', { message: 'Preencha nome, sobrenome e senha para criar sua conta.' });
            return;
          }
        },
      },
    );
  }

  if (notFound) {
    return (
      <p role="alert" className="text-sm text-muted-foreground">
        Este convite não é válido. Peça para quem convidou enviar um novo.
      </p>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Se você ainda não tem uma conta, preencha os campos abaixo para criá-la.
        </p>
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} />
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
                <Input {...field} />
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
        <Button type="submit" className="w-full" loading={accept.isPending}>
          Aceitar convite
        </Button>
      </form>
    </Form>
  );
}
