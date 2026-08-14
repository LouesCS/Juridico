'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/data-display/status-badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCargos, useCollaboratorGroups } from '@/features/configuration/api/queries';
import { isApiError } from '@/lib/api/errors';
import type { CollaboratorDetailDTO, CreateCollaboratorInput, UpdateCollaboratorInput } from '../api/collaborators.api';
import { useCreateCollaborator, useUpdateCollaborator } from '../api/mutations';
import { useMembers } from '../api/queries';
import {
  COLLABORATOR_FORM_DEFAULTS,
  collaboratorCreateFormSchema,
  collaboratorFormSchema,
  type CollaboratorFormValues,
} from '../schemas/collaborator.schemas';
import { RoleSelect } from './role-select';

function toCreateInput(values: CollaboratorFormValues): CreateCollaboratorInput {
  return {
    nome: values.nome,
    email: values.email,
    nomeSocial: values.nomeSocial || undefined,
    cpf: values.cpf || undefined,
    rg: values.rg || undefined,
    dataNascimento: values.dataNascimento || undefined,
    estadoCivil: values.estadoCivil || undefined,
    profissao: values.profissao || undefined,
    nomeMae: values.nomeMae || undefined,
    nomePai: values.nomePai || undefined,
    anotacoes: values.anotacoes || undefined,
    telefone: values.telefone || undefined,
    celular: values.celular || undefined,
    whatsapp: values.whatsapp || undefined,
    fotoUrl: values.fotoUrl || undefined,
    endereco: {
      cep: values.enderecoCep ? values.enderecoCep.replace(/\D/g, '') : undefined,
      logradouro: values.enderecoLogradouro || undefined,
      numero: values.enderecoNumero || undefined,
      complemento: values.enderecoComplemento || undefined,
      bairro: values.enderecoBairro || undefined,
      cidade: values.enderecoCidade || undefined,
      uf: values.enderecoUf || undefined,
      pais: values.enderecoPais || undefined,
    },
    cargoId: values.cargoId || undefined,
    departamento: values.departamento || undefined,
    numeroOab: values.numeroOab || undefined,
    ufOab: values.ufOab || undefined,
    situacaoOab: values.situacaoOab || undefined,
    observacaoOab: values.observacaoOab || undefined,
    dataEntrada: values.dataEntrada || undefined,
    responsavelId: values.responsavelId || undefined,
    grupoIds: values.grupoIds,
    comAcesso: values.comAcesso,
    papelId: values.comAcesso ? values.papelId || undefined : undefined,
  };
}

function toUpdateInput(values: CollaboratorFormValues): UpdateCollaboratorInput {
  const { comAcesso: _comAcesso, papelId: _papelId, ...rest } = toCreateInput(values);
  void _comAcesso;
  void _papelId;
  return rest;
}

function fromCollaboratorDetail(collaborator: CollaboratorDetailDTO): CollaboratorFormValues {
  return {
    nome: collaborator.nome,
    nomeSocial: collaborator.nomeSocial ?? '',
    cpf: collaborator.cpf ?? '',
    rg: collaborator.rg ?? '',
    dataNascimento: collaborator.dataNascimento ? collaborator.dataNascimento.slice(0, 10) : '',
    estadoCivil: (collaborator.estadoCivil as CollaboratorFormValues['estadoCivil']) ?? '',
    profissao: collaborator.profissao ?? '',
    nomeMae: collaborator.nomeMae ?? '',
    nomePai: collaborator.nomePai ?? '',
    anotacoes: collaborator.anotacoes ?? '',
    fotoUrl: collaborator.fotoUrl ?? '',
    email: collaborator.email,
    telefone: collaborator.telefone ?? '',
    celular: collaborator.celular ?? '',
    whatsapp: collaborator.whatsapp ?? '',
    enderecoCep: collaborator.endereco.cep ?? '',
    enderecoLogradouro: collaborator.endereco.logradouro ?? '',
    enderecoNumero: collaborator.endereco.numero ?? '',
    enderecoComplemento: collaborator.endereco.complemento ?? '',
    enderecoBairro: collaborator.endereco.bairro ?? '',
    enderecoCidade: collaborator.endereco.cidade ?? '',
    enderecoUf: collaborator.endereco.uf ?? '',
    enderecoPais: collaborator.endereco.pais ?? 'Brasil',
    cargoId: collaborator.cargo?.id ?? '',
    grupoIds: collaborator.grupos.map((g) => g.id),
    departamento: collaborator.departamento ?? '',
    numeroOab: collaborator.numeroOab ?? '',
    ufOab: collaborator.ufOab ?? '',
    situacaoOab: collaborator.situacaoOab ?? '',
    observacaoOab: collaborator.observacaoOab ?? '',
    dataEntrada: collaborator.dataEntrada ?? '',
    responsavelId: collaborator.responsavel?.id ?? '',
    comAcesso: collaborator.temAcesso,
    papelId: collaborator.papel?.id ?? '',
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

function CollaboratorFormFields({
  form,
  isEditing,
  currentSituacaoAcesso,
}: {
  form: ReturnType<typeof useForm<CollaboratorFormValues>>;
  isEditing: boolean;
  currentSituacaoAcesso?: string;
}) {
  const fotoUrl = form.watch('fotoUrl');
  const nome = form.watch('nome');
  const comAcesso = form.watch('comAcesso');
  const grupoIds = form.watch('grupoIds');
  const { data: cargos } = useCargos();
  const { data: grupos } = useCollaboratorGroups();
  const { data: members } = useMembers();

  function toggleGrupo(grupoId: string, checked: boolean) {
    const current = form.getValues('grupoIds');
    form.setValue(
      'grupoIds',
      checked ? [...current, grupoId] : current.filter((id) => id !== grupoId),
      { shouldDirty: true },
    );
  }

  return (
    <Tabs defaultValue="pessoal" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="pessoal">Dados pessoais</TabsTrigger>
        <TabsTrigger value="contato">Contato</TabsTrigger>
        <TabsTrigger value="profissional">Dados profissionais</TabsTrigger>
        <TabsTrigger value="acesso">Acesso ao sistema</TabsTrigger>
      </TabsList>

      <TabsContent value="pessoal" className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-14">
            <AvatarImage src={fotoUrl || undefined} alt="" />
            <AvatarFallback>{nome ? initials(nome) : '?'}</AvatarFallback>
          </Avatar>
          <FormField
            control={form.control}
            name="fotoUrl"
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
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome completo</FormLabel>
              <FormControl>
                <Input {...field} autoFocus />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
        <div className="grid grid-cols-2 gap-4">
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
        </div>
        <div className="grid grid-cols-2 gap-4">
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
        <FormField
          control={form.control}
          name="anotacoes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Anotações</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </TabsContent>

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
        <div className="grid grid-cols-2 gap-4">
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
        </div>
        <FormField
          control={form.control}
          name="whatsapp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>WhatsApp</FormLabel>
              <FormControl>
                <Input {...field} placeholder="(00) 00000-0000" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <p className="text-sm font-medium text-muted-foreground">Endereço</p>
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
              <FormLabel>Logradouro</FormLabel>
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
        <div className="grid grid-cols-2 gap-4">
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
        </div>
      </TabsContent>

      <TabsContent value="profissional" className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cargoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cargo</FormLabel>
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {cargos?.map((cargo) => (
                      <SelectItem key={cargo.id} value={cargo.id}>
                        {cargo.nome}
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
            name="departamento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Departamento</FormLabel>
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
          name="responsavelId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Responsável (opcional)</FormLabel>
              <Select value={field.value || undefined} onValueChange={field.onChange}>
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
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="dataEntrada"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de entrada</FormLabel>
                <FormControl>
                  <Input {...field} type="date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div>
          {/* Grupo de checkboxes, não um único campo RHF — `Label` puro (não
             `FormLabel`, que exige contexto de `FormField`/`FormItem`). */}
          <Label>Grupos de colaboradores</Label>
          {!grupos || grupos.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Nenhum grupo cadastrado. Configure em Configurações → Grupos de Colaboradores.
            </p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {grupos.map((grupo) => (
                <label key={grupo.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={grupoIds.includes(grupo.id)}
                    onCheckedChange={(checked) => toggleGrupo(grupo.id, checked === true)}
                    aria-label={grupo.nome}
                  />
                  {grupo.nome}
                </label>
              ))}
            </div>
          )}
        </div>

        <p className="pt-2 text-sm font-medium text-muted-foreground">OAB</p>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="numeroOab"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número OAB</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ufOab"
            render={({ field }) => (
              <FormItem>
                <FormLabel>UF OAB</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={2} placeholder="SP" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="situacaoOab"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Situação OAB</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Regular" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="observacaoOab"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observação OAB</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </TabsContent>

      <TabsContent value="acesso" className="space-y-4">
        {isEditing ? (
          <div className="space-y-3 rounded-md border border-border p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Situação de acesso atual:</span>
              {currentSituacaoAcesso && <StatusBadge status={currentSituacaoAcesso} />}
            </div>
            <p className="text-sm text-muted-foreground">
              Para conceder ou remover acesso ao sistema, bloquear, desbloquear, suspender ou reativar este
              colaborador, use as ações na listagem de Colaboradores ou no menu &ldquo;Ações rápidas&rdquo; da
              página de detalhes — o acesso não é reeditado por este formulário.
            </p>
          </div>
        ) : (
          <>
            <FormField
              control={form.control}
              name="comAcesso"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                  </FormControl>
                  <FormLabel className="!mt-0">Permitir acesso ao sistema</FormLabel>
                </FormItem>
              )}
            />
            {comAcesso && (
              <FormField
                control={form.control}
                name="papelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Papel</FormLabel>
                    <RoleSelect value={field.value || undefined} onChange={field.onChange} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}

export function CollaboratorFormDialog({
  collaborator,
  open,
  onOpenChange,
}: {
  collaborator?: CollaboratorDetailDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEditing = !!collaborator;
  const createCollaborator = useCreateCollaborator();
  const updateCollaborator = useUpdateCollaborator(collaborator?.id ?? '');
  const form = useForm<CollaboratorFormValues>({
    resolver: zodResolver(isEditing ? collaboratorFormSchema : collaboratorCreateFormSchema),
    defaultValues: collaborator ? fromCollaboratorDetail(collaborator) : COLLABORATOR_FORM_DEFAULTS,
  });

  React.useEffect(() => {
    if (open) form.reset(collaborator ? fromCollaboratorDetail(collaborator) : COLLABORATOR_FORM_DEFAULTS);
  }, [open, collaborator, form]);

  function onSubmit(values: CollaboratorFormValues) {
    const mutation = isEditing ? updateCollaborator : createCollaborator;
    const input = isEditing ? toUpdateInput(values) : toCreateInput(values);

    mutation.mutate(input as never, {
      onSuccess: () => {
        toast.success(isEditing ? 'Colaborador atualizado.' : 'Colaborador cadastrado.');
        onOpenChange(false);
      },
      onError: (error) => {
        if (isApiError(error) && error.fieldErrors) {
          for (const fieldError of error.fieldErrors) {
            form.setError(fieldError.field as keyof CollaboratorFormValues, { message: fieldError.message });
          }
          return;
        }
        toast.error('Não foi possível salvar o colaborador. Tente novamente.');
      },
    });
  }

  const isPending = createCollaborator.isPending || updateCollaborator.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-[calc(100vw_-_2rem)] max-w-2xl flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEditing ? 'Editar colaborador' : 'Novo colaborador'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do colaborador.'
              : 'Apenas nome e e-mail são obrigatórios — complete os demais dados quando fizer sentido. Um colaborador pode existir sem nunca ter acesso ao sistema.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="flex min-h-0 flex-1 flex-col">
            <DialogBody>
              <CollaboratorFormFields
                form={form}
                isEditing={isEditing}
                currentSituacaoAcesso={collaborator?.situacaoAcesso}
              />
            </DialogBody>
            <DialogFooter className="shrink-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" loading={isPending}>
                <Plus className="size-4" aria-hidden="true" />
                {isEditing ? 'Salvar alterações' : 'Cadastrar colaborador'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
