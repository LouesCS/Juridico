'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { isApiError } from '@/lib/api/errors';
import { useInviteMember } from '../api/mutations';
import { inviteMemberSchema, type InviteMemberFormValues } from '../schemas/team.schemas';
import { RoleSelect } from './role-select';

export function InviteMemberDialog() {
  const [open, setOpen] = React.useState(false);
  const invite = useInviteMember();
  const form = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: '', papelId: '' },
  });

  function onSubmit(values: InviteMemberFormValues) {
    invite.mutate(values, {
      onSuccess: () => {
        toast.success(`Convite enviado para ${values.email}.`);
        form.reset();
        setOpen(false);
      },
      onError: (error) => {
        if (isApiError(error) && error.fieldErrors) {
          for (const fieldError of error.fieldErrors) {
            form.setError(fieldError.field as keyof InviteMemberFormValues, {
              message: fieldError.message,
            });
          }
          return;
        }
        toast.error('Não foi possível enviar o convite. Tente novamente.');
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4" aria-hidden="true" />
          Convidar membro
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convidar membro</DialogTitle>
          <DialogDescription>
            Um e-mail com o link de convite será enviado. O convite expira em 7 dias.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="papelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Papel</FormLabel>
                  <FormControl>
                    <RoleSelect value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={invite.isPending}>
                Enviar convite
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
