'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMembers } from '@/features/team';
import { useClients } from '@/features/clients/api/queries';
import { isApiError } from '@/lib/api/errors';
import { formatCnj } from '@/lib/validators/cnj';
import { useCreateLegalCase, useUpdateLegalCase } from '../api/mutations';
import type { LegalCaseDetailDTO } from '../api/legal-cases.api';
import {
  LEGAL_CASE_FORM_DEFAULTS,
  legalCaseFormSchema,
  type LegalCaseFormValues,
} from '../schemas/legal-case.schemas';
import { ExtrajudicialLegalCaseForm } from './extrajudicial-legal-case-form';
import { JudicialLegalCaseForm } from './judicial-legal-case-form';

/**
 * `trigger`/`fixedClienteId` (Prompt 11 §Ações rápidas) — permitem abrir
 * este mesmo formulário a partir da página de um Cliente já com o campo
 * Cliente pré-preenchido e travado, sem duplicar o formulário.
 */
export function LegalCaseFormDialog({
  trigger,
  fixedClienteId,
  fixedPastaJuridicaId,
  fixedTipo,
  legalCase,
  defaultOpen = false,
}: {
  trigger?: React.ReactNode;
  fixedClienteId?: string;
  fixedPastaJuridicaId?: string;
  fixedTipo?: 'JUDICIAL' | 'EXTRAJUDICIAL';
  legalCase?: LegalCaseDetailDTO;
  defaultOpen?: boolean;
} = {}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const createCase = useCreateLegalCase();
  const updateCase = useUpdateLegalCase(legalCase?.id ?? '');
  const { data: clients } = useClients({ limit: 100, sort: 'nome' });
  const { data: members } = useMembers();
  const form = useForm<LegalCaseFormValues>({
    resolver: zodResolver(legalCaseFormSchema),
    defaultValues: legalCase
      ? {
          ...LEGAL_CASE_FORM_DEFAULTS,
          titulo: legalCase.titulo,
          clienteId: legalCase.cliente.id,
          responsavelPrincipalId: legalCase.responsavel?.id ?? '',
          area: legalCase.area,
          numeroCnj: legalCase.numeroCnj ?? '',
          tipo: legalCase.tipo,
          poloCliente: legalCase.poloCliente,
          tribunal: legalCase.tribunal ?? '',
          comarca: legalCase.comarca ?? '',
          vara: legalCase.vara ?? '',
          uf: legalCase.uf ?? '',
          instancia: legalCase.instancia ?? '',
          prioridade: legalCase.prioridade,
          status: legalCase.status,
          segredoJustica: legalCase.segredoJustica,
          valorCausa: legalCase.valorCausaCentavos
            ? String(Number(legalCase.valorCausaCentavos) / 100)
            : '',
          descricao: legalCase.descricao ?? '',
          observacoes: legalCase.observacoes ?? '',
        }
      : fixedClienteId
        ? { ...LEGAL_CASE_FORM_DEFAULTS, clienteId: fixedClienteId }
        : LEGAL_CASE_FORM_DEFAULTS,
  });

  function onSubmit(values: LegalCaseFormValues) {
    const input = {
      titulo: values.titulo,
      clienteId: values.clienteId,
      pastaJuridicaId: fixedPastaJuridicaId,
      responsavelPrincipalId: values.responsavelPrincipalId,
      area: values.area,
      numeroCnj: values.numeroCnj || undefined,
      tipo: fixedTipo ?? values.tipo,
      poloCliente: values.poloCliente,
      tribunal: values.tribunal || undefined,
      comarca: values.comarca || undefined,
      vara: values.vara || undefined,
      uf: values.uf || undefined,
      instancia: values.instancia || undefined,
      prioridade: values.prioridade,
      status: values.status,
      segredoJustica: values.segredoJustica,
      valorCausaCentavos: values.valorCausa
        ? Math.round(Number(values.valorCausa) * 100)
        : undefined,
      descricao: values.descricao || undefined,
      observacoes: values.observacoes || undefined,
    };
    const mutationOptions = {
      onSuccess: () => {
        toast.success(legalCase ? 'Processo atualizado.' : 'Processo cadastrado.');
        form.reset(
          fixedClienteId
            ? { ...LEGAL_CASE_FORM_DEFAULTS, clienteId: fixedClienteId }
            : LEGAL_CASE_FORM_DEFAULTS,
        );
        setOpen(false);
      },
      onError: (error: Error) => {
        if (isApiError(error) && error.code === 'DUPLICATE_CNJ') {
          form.setError('numeroCnj', { message: 'Já existe um processo com este número CNJ.' });
          return;
        }
        if (isApiError(error) && error.code === 'INVALID_CHECK_DIGIT') {
          form.setError('numeroCnj', { message: 'Número CNJ com dígito verificador inválido.' });
          return;
        }
        if (isApiError(error) && error.fieldErrors) {
          for (const fieldError of error.fieldErrors) {
            form.setError(fieldError.field as keyof LegalCaseFormValues, {
              message: fieldError.message,
            });
          }
          return;
        }
        if (isApiError(error) && error.code === 'LEGAL_FOLDER_PROCESS_LIMIT') {
          toast.error(error.message);
          return;
        }
        toast.error('Não foi possível cadastrar o processo. Tente novamente.');
      },
    };
    if (legalCase) updateCase.mutate({ versaoAtual: legalCase.versao, input }, mutationOptions);
    else createCase.mutate(input, mutationOptions);
  }

  if (legalCase?.tipo === 'EXTRAJUDICIAL') {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger ?? <Button>Editar</Button>}</DialogTrigger>
        <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>Editar Processo Extrajudicial</DialogTitle>
            <DialogDescription>
              Atualize os dados específicos e participantes do Processo Extrajudicial.
            </DialogDescription>
          </DialogHeader>
          <div className="scrollbar-fade min-w-0 flex-1 overflow-y-auto px-6 py-4">
            <ExtrajudicialLegalCaseForm legalCase={legalCase} onSaved={() => setOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (legalCase?.tipo === 'JUDICIAL') {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger ?? <Button>Editar</Button>}</DialogTrigger>
        <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-6 py-4">
            <DialogTitle>Editar Processo Judicial</DialogTitle>
            <DialogDescription>
              Atualize os dados judiciais, partes e advogados do Processo.
            </DialogDescription>
          </DialogHeader>
          <div className="scrollbar-fade min-w-0 flex-1 overflow-y-auto px-6 py-4">
            <JudicialLegalCaseForm legalCase={legalCase} onSaved={() => setOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" aria-hidden="true" />
            Novo processo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="scrollbar-fade max-h-[85vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{legalCase ? 'Editar processo' : 'Novo processo'}</DialogTitle>
          <DialogDescription>
            Apenas título, cliente e advogado responsável são obrigatórios.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            <FormField
              control={form.control}
              name="titulo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoFocus
                      placeholder="Ex.: Ação de cobrança — Silva vs. Acme"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="clienteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!!fixedClienteId || Boolean(legalCase)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients?.items.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.nome}
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
                name="responsavelPrincipalId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Advogado responsável</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {members
                          ?.filter((m) => m.status === 'ATIVO')
                          .map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.usuario.nome}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="area"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Área</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Cível, Trabalhista, ..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numeroCnj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número CNJ (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        maxLength={25}
                        inputMode="numeric"
                        onChange={(event) => field.onChange(formatCnj(event.target.value))}
                        placeholder="0000000-00.0000.0.00.0000"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select
                      value={fixedTipo ?? legalCase?.tipo ?? field.value}
                      onValueChange={field.onChange}
                      disabled={Boolean(fixedTipo) || Boolean(legalCase)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="JUDICIAL">Judicial</SelectItem>
                        <SelectItem value="ADMINISTRATIVO">Administrativo</SelectItem>
                        <SelectItem value="CONSULTIVO">Consultivo</SelectItem>
                        <SelectItem value="EXTRAJUDICIAL">Extrajudicial</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="poloCliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Polo do cliente</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ATIVO">Ativo</SelectItem>
                        <SelectItem value="PASSIVO">Passivo</SelectItem>
                        <SelectItem value="TERCEIRO">Terceiro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="tribunal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tribunal</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="comarca"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comarca</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="vara"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vara</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="prioridade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="BAIXA">Baixa</SelectItem>
                        <SelectItem value="MEDIA">Média</SelectItem>
                        <SelectItem value="ALTA">Alta</SelectItem>
                        <SelectItem value="CRITICA">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valorCausa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor da causa (R$)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={0} step="0.01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="segredoJustica"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <FormLabel>Segredo de justiça</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Restringe a visualização a quem tem permissão para conteúdo confidencial.
                    </p>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                      aria-label="Segredo de justiça"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={createCase.isPending || updateCase.isPending}>
                {legalCase ? 'Salvar alterações' : 'Cadastrar processo'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
