'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Pencil } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DocumentDetailDTO } from '../api/documents.api';
import { useUpdateDocument } from '../api/mutations';
import { DOCUMENT_TYPE_LABEL, documentMetadataSchema, type DocumentMetadataFormValues } from '../schemas/document.schemas';

export function DocumentMetadataForm({ document }: { document: DocumentDetailDTO }) {
  const [open, setOpen] = React.useState(false);
  const updateDocument = useUpdateDocument();
  const form = useForm<DocumentMetadataFormValues>({
    resolver: zodResolver(documentMetadataSchema),
    defaultValues: {
      nome: document.nome,
      descricao: document.descricao ?? '',
      tipo: document.tipo,
      categoria: document.categoria ?? '',
      confidencialidade: document.confidencialidade,
    },
  });

  function onSubmit(values: DocumentMetadataFormValues) {
    updateDocument.mutate(
      {
        id: document.id,
        input: {
          nome: values.nome,
          descricao: values.descricao || null,
          tipo: values.tipo,
          categoria: values.categoria || null,
          confidencialidade: values.confidencialidade,
        },
      },
      {
        onSuccess: () => {
          toast.success('Documento atualizado.');
          setOpen(false);
        },
        onError: () => toast.error('Não foi possível atualizar o documento.'),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="size-4" aria-hidden="true" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar documento</DialogTitle>
          <DialogDescription>Atualize os metadados deste documento.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(DOCUMENT_TYPE_LABEL).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex.: Contratual, Societário..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confidencialidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confidencialidade</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PADRAO">Padrão</SelectItem>
                      <SelectItem value="CONFIDENCIAL">Confidencial</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={updateDocument.isPending}>
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
