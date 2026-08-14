'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExtraFields, useRequiredFields } from '@/features/configuration/api/queries';
import type { ExtraFieldDTO } from '@/features/configuration/api/configuration.api';
import { isApiError } from '@/lib/api/errors';
import { useCreateClient, useUpdateClient } from '../api/mutations';
import type { ClientDetailDTO, UpsertClientInput } from '../api/clients.api';
import {
  CLIENT_FORM_DEFAULTS,
  clientFormSchema,
  type ClientFormValues,
} from '../schemas/client.schemas';

/**
 * O backend modela `emails`/`telefones` como listas (`Cliente.emails: string[]`
 * — reafirma docs/api/18-dtos.md §18.4); o formulário simplifica para um
 * campo de e-mail e dois de telefone (Telefone/Celular, terminologia do
 * Prompt "Clientes e Contatos" — mesma convenção de posição já usada pelos
 * filtros de listagem) e remonta as listas ao enviar — decisão de UX
 * explícita, não uma limitação do contrato.
 */
function toUpsertInput(values: ClientFormValues): UpsertClientInput {
  const emails = [values.email, values.emailAdicional].filter((v): v is string => !!v);
  const telefones = [values.telefone, values.celular].filter((v): v is string => !!v);

  return {
    tipo: values.tipo,
    nome: values.nome,
    nomeSocial: values.nomeSocial || undefined,
    razaoSocial: values.razaoSocial || undefined,
    cpf: values.cpf || undefined,
    cnpj: values.cnpj || undefined,
    rg: values.tipo === 'PESSOA_FISICA' ? values.rg || undefined : undefined,
    avatarUrl: values.avatarUrl || undefined,
    emails,
    telefones,
    telefoneResidencial:
      values.tipo === 'PESSOA_FISICA' ? values.telefoneResidencial || undefined : undefined,
    telefoneResponsavel:
      values.tipo === 'PESSOA_JURIDICA' ? values.telefoneResponsavel || undefined : undefined,
    enderecoCep: values.enderecoCep ? values.enderecoCep.replace(/\D/g, '') : undefined,
    enderecoLogradouro: values.enderecoLogradouro || undefined,
    enderecoNumero: values.enderecoNumero || undefined,
    enderecoComplemento: values.enderecoComplemento || undefined,
    enderecoBairro: values.enderecoBairro || undefined,
    enderecoCidade: values.enderecoCidade || undefined,
    enderecoUf: values.enderecoUf || undefined,
    observacoes: values.observacoes || undefined,
    responsavelNome:
      values.tipo === 'PESSOA_JURIDICA' ? values.responsavelNome || undefined : undefined,
    nomeMae: values.tipo === 'PESSOA_FISICA' ? values.nomeMae || undefined : undefined,
    nomePai: values.tipo === 'PESSOA_FISICA' ? values.nomePai || undefined : undefined,
    estadoCivil:
      values.tipo === 'PESSOA_FISICA' && values.estadoCivil ? values.estadoCivil : undefined,
    profissao: values.tipo === 'PESSOA_FISICA' ? values.profissao || undefined : undefined,
    dataNascimento:
      values.tipo === 'PESSOA_FISICA' && values.dataNascimento ? values.dataNascimento : undefined,
    camposExtrasValores: Object.keys(values.camposExtras).length ? values.camposExtras : undefined,
  };
}

function fromClientDetail(client: ClientDetailDTO): ClientFormValues {
  return {
    tipo: client.tipo,
    nome: client.nome,
    nomeSocial: client.nomeSocial ?? '',
    razaoSocial: client.razaoSocial ?? '',
    cpf: client.cpf ?? '',
    cnpj: client.cnpj ?? '',
    rg: client.rg ?? '',
    avatarUrl: client.avatarUrl ?? '',
    email: client.emails[0] ?? '',
    emailAdicional: client.emails[1] ?? '',
    telefone: client.telefones[0] ?? '',
    celular: client.telefones[1] ?? '',
    telefoneResidencial: client.telefoneResidencial ?? '',
    telefoneResponsavel: client.telefoneResponsavel ?? '',
    enderecoCep: client.enderecoCep ?? '',
    enderecoLogradouro: client.enderecoLogradouro ?? '',
    enderecoNumero: client.enderecoNumero ?? '',
    enderecoComplemento: client.enderecoComplemento ?? '',
    enderecoBairro: client.enderecoBairro ?? '',
    enderecoCidade: client.enderecoCidade ?? '',
    enderecoUf: client.enderecoUf ?? '',
    observacoes: client.observacoes ?? '',
    responsavelId: client.responsavel?.id ?? '',
    responsavelNome: client.responsavelNome ?? '',
    nomeMae: client.nomeMae ?? '',
    nomePai: client.nomePai ?? '',
    estadoCivil: client.estadoCivil ?? '',
    profissao: client.profissao ?? '',
    dataNascimento: client.dataNascimento ? client.dataNascimento.slice(0, 10) : '',
    camposExtras: client.camposExtrasValores ?? {},
  };
}

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function ExtraFieldInput({
  field,
  value,
  onChange,
}: {
  field: ExtraFieldDTO;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.tipo === 'SELECT' || field.tipo === 'BOOLEANO') {
    return (
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger aria-label={field.nome}>
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          {(field.tipo === 'BOOLEANO' ? ['true', 'false'] : field.opcoes).map((opcao) => (
            <SelectItem key={opcao} value={opcao}>
              {field.tipo === 'BOOLEANO' ? (opcao === 'true' ? 'Sim' : 'Não') : opcao}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      type={field.tipo === 'NUMERO' ? 'number' : field.tipo === 'DATA' ? 'date' : 'text'}
      placeholder={field.tipo === 'MULTISELECT' ? 'Valores separados por vírgula' : undefined}
      aria-label={field.nome}
    />
  );
}

function ClientFormFields({
  form,
  isEditing,
}: {
  form: ReturnType<typeof useForm<ClientFormValues>>;
  isEditing: boolean;
}) {
  const tipo = form.watch('tipo');
  const avatarUrl = form.watch('avatarUrl');
  const nome = form.watch('nome');
  const camposExtras = form.watch('camposExtras');
  const { data: extraFields } = useExtraFields('CLIENTE');

  return (
    <Tabs defaultValue="dados" className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-5">
        <TabsTrigger value="dados">Dados</TabsTrigger>
        {tipo === 'PESSOA_FISICA' && <TabsTrigger value="pessoal">Pessoal</TabsTrigger>}
        <TabsTrigger value="contato">Contato</TabsTrigger>
        <TabsTrigger value="endereco">Endereço</TabsTrigger>
        <TabsTrigger value="extras">Campos Extras</TabsTrigger>
      </TabsList>

      <TabsContent value="dados" className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-14">
            <AvatarImage src={avatarUrl || undefined} alt="" />
            <AvatarFallback>{nome ? initials(nome) : '?'}</AvatarFallback>
          </Avatar>
          <FormField
            control={form.control}
            name="avatarUrl"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Foto (URL)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="tipo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={isEditing}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="PESSOA_FISICA">Pessoa Física</SelectItem>
                    <SelectItem value="PESSOA_JURIDICA">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
                {isEditing && (
                  <p className="text-xs text-muted-foreground">
                    Não é possível mudar Pessoa Física/Jurídica após o cadastro.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {tipo === 'PESSOA_JURIDICA' ? 'Nome fantasia' : 'Nome completo'}
              </FormLabel>
              <FormControl>
                <Input {...field} autoFocus />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {tipo === 'PESSOA_JURIDICA' ? (
          <>
            <FormField
              control={form.control}
              name="razaoSocial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razão social</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="responsavelNome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cnpj"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="00.000.000/0000-00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : (
          <>
            <FormField
              control={form.control}
              name="nomeSocial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome social (opcional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="000.000.000-00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RG</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </TabsContent>

      {tipo === 'PESSOA_FISICA' && (
        <TabsContent value="pessoal" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="nomeMae"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da mãe</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nomePai"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do pai</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="estadoCivil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado civil</FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SOLTEIRO">Solteiro(a)</SelectItem>
                      <SelectItem value="CASADO">Casado(a)</SelectItem>
                      <SelectItem value="DIVORCIADO">Divorciado(a)</SelectItem>
                      <SelectItem value="VIUVO">Viúvo(a)</SelectItem>
                      <SelectItem value="UNIAO_ESTAVEL">União estável</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dataNascimento"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de nascimento</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="profissao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profissão</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </TabsContent>
      )}

      <TabsContent value="contato" className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="emailAdicional"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail adicional</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="telefone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl>
                <Input {...field} placeholder="(00) 0000-0000" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {tipo === 'PESSOA_FISICA' && (
          <FormField
            control={form.control}
            name="telefoneResidencial"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone residencial</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="(00) 0000-0000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        {tipo === 'PESSOA_JURIDICA' && (
          <FormField
            control={form.control}
            name="telefoneResponsavel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone do responsável</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="(00) 00000-0000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="celular"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Celular</FormLabel>
              <FormControl>
                <Input {...field} placeholder="(00) 00000-0000" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="observacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </TabsContent>

      <TabsContent value="endereco" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="enderecoCep"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CEP</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="00000-000" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="enderecoUf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={2} placeholder="SP" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="enderecoLogradouro"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="enderecoNumero"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="enderecoComplemento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Complemento</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="enderecoBairro"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bairro</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="enderecoCidade"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cidade</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </TabsContent>

      <TabsContent value="extras" className="space-y-4">
        {!extraFields || extraFields.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum campo extra configurado para Clientes. Configure em Configurações → Campos
            Extras.
          </p>
        ) : (
          extraFields
            .filter((f) => f.ativo)
            .map((extraField) => (
              <div key={extraField.id} className="space-y-2">
                <Label>
                  {extraField.nome}
                  {extraField.obrigatorio && ' *'}
                </Label>
                <ExtraFieldInput
                  field={extraField}
                  value={camposExtras[extraField.id] ?? ''}
                  onChange={(value) =>
                    form.setValue(
                      'camposExtras',
                      { ...form.getValues('camposExtras'), [extraField.id]: value },
                      { shouldDirty: true },
                    )
                  }
                />
              </div>
            ))
        )}
        {form.formState.errors.camposExtras?.message && (
          <p className="text-sm font-medium text-destructive">
            {String(form.formState.errors.camposExtras.message)}
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}

export function ClientFormDialog({
  client,
  open,
  onOpenChange,
}: {
  client?: ClientDetailDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEditing = !!client;
  const createClient = useCreateClient();
  const updateClient = useUpdateClient(client?.id ?? '');
  const { data: extraFields } = useExtraFields('CLIENTE');
  const { data: requiredFields } = useRequiredFields('CLIENTE');
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: client ? fromClientDetail(client) : CLIENT_FORM_DEFAULTS,
  });

  React.useEffect(() => {
    if (open) {
      const defaults = Object.fromEntries(
        (extraFields ?? [])
          .filter((field) => field.ativo && field.valorPadrao)
          .map((field) => [field.id, field.valorPadrao ?? '']),
      );
      form.reset(
        client ? fromClientDetail(client) : { ...CLIENT_FORM_DEFAULTS, camposExtras: defaults },
      );
    }
  }, [open, client, extraFields, form]);

  function onSubmit(values: ClientFormValues) {
    let invalid = false;
    const onlyPf = new Set([
      'cpf',
      'rg',
      'nomeSocial',
      'nomeMae',
      'nomePai',
      'estadoCivil',
      'profissao',
      'dataNascimento',
      'telefoneResidencial',
    ]);
    const onlyPj = new Set(['cnpj', 'razaoSocial', 'responsavelNome', 'telefoneResponsavel']);
    for (const required of requiredFields?.filter((field) => field.obrigatorio) ?? []) {
      if (values.tipo === 'PESSOA_FISICA' ? onlyPj.has(required.campo) : onlyPf.has(required.campo))
        continue;
      const formField =
        required.campo === 'emails'
          ? 'email'
          : required.campo === 'telefones'
            ? 'telefone'
            : required.campo;
      const value = values[formField as keyof ClientFormValues];
      if (!value || (Array.isArray(value) && value.length === 0)) {
        form.setError(formField as keyof ClientFormValues, {
          message: 'Campo obrigatório para este escritório.',
        });
        invalid = true;
      }
    }
    for (const extra of extraFields?.filter((field) => field.ativo && field.obrigatorio) ?? []) {
      if (!values.camposExtras[extra.id]?.trim()) {
        form.setError('camposExtras', { message: `${extra.nome} é obrigatório.` });
        invalid = true;
      }
    }
    if (invalid) return;
    const input = toUpsertInput(values);
    const mutation = isEditing ? updateClient : createClient;

    mutation.mutate(input, {
      onSuccess: (result) => {
        toast.success(isEditing ? 'Cliente atualizado.' : 'Cliente cadastrado.');
        if (result?.avisos?.length) {
          toast.warning('Já existe um cliente com este documento — cadastro criado mesmo assim.');
        }
        onOpenChange(false);
      },
      onError: (error) => {
        if (isApiError(error) && error.fieldErrors) {
          for (const fieldError of error.fieldErrors) {
            form.setError(fieldError.field as keyof ClientFormValues, {
              message: fieldError.message,
            });
          }
          return;
        }
        toast.error('Não foi possível salvar o cliente. Tente novamente.');
      },
    });
  }

  const isPending = createClient.isPending || updateClient.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[calc(100vw_-_2rem)] max-w-2xl flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEditing ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do cliente.'
              : 'Apenas nome e tipo são obrigatórios — complete os demais dados quando fizer sentido.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogBody>
              <ClientFormFields form={form} isEditing={isEditing} />
            </DialogBody>
            <DialogFooter className="shrink-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={isPending}>
                <Plus className="size-4" aria-hidden="true" />
                {isEditing ? 'Salvar alterações' : 'Cadastrar cliente'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
