'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { isApiError } from '@/lib/api/errors';
import { useChangePassword } from '../api/mutations';
import { changePasswordSchema, type ChangePasswordFormValues } from '../schemas/profile.schemas';

export function ChangePasswordForm() {
  const changePassword = useChangePassword();
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { senhaAtual: '', novaSenha: '', confirmarSenha: '' },
  });

  function onSubmit(values: ChangePasswordFormValues) {
    changePassword.mutate(
      { senhaAtual: values.senhaAtual, novaSenha: values.novaSenha },
      {
        onSuccess: () => {
          toast.success('Senha alterada. Todas as suas outras sessões foram encerradas.');
          form.reset();
        },
        onError: (error) => {
          if (isApiError(error) && error.code === 'INVALID_CREDENTIALS') {
            form.setError('senhaAtual', { message: 'Senha atual incorreta.' });
            return;
          }
          if (isApiError(error) && error.fieldErrors) {
            for (const fieldError of error.fieldErrors) {
              form.setError(fieldError.field as keyof ChangePasswordFormValues, {
                message: fieldError.message,
              });
            }
            return;
          }
          toast.error('Não foi possível alterar a senha. Tente novamente.');
        },
      },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="max-w-sm space-y-4">
        <FormField
          control={form.control}
          name="senhaAtual"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha atual</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
        <Button type="submit" loading={changePassword.isPending}>
          Alterar senha
        </Button>
      </form>
    </Form>
  );
}
