'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import {
  configurationApi,
  type CargoDTO,
  type EntidadeConfiguravel,
  type ExtraFieldDTO,
  type FinancialSettingsDTO,
  type GeneralSettingsDTO,
  type HolidayDTO,
  type AiSettingsDTO,
  type RequiredFieldDTO,
  type TaskCategoryDTO,
  type TaskTemplateDTO,
} from './configuration.api';
import { configurationKeys } from './keys';

function useInvalidate(key: (officeId: string) => readonly unknown[]) {
  const queryClient = useQueryClient();
  const { escritorioAtivoId } = useOffice();
  return () => queryClient.invalidateQueries({ queryKey: key(escritorioAtivoId ?? '') });
}

export function useUpdateGeneralSettings() {
  const invalidate = useInvalidate(configurationKeys.general);
  return useMutation({
    mutationFn: (input: Partial<GeneralSettingsDTO>) => configurationApi.updateGeneral(input),
    onSuccess: invalidate,
  });
}

export function useUpdateFinancialSettings() {
  const invalidate = useInvalidate(configurationKeys.financial);
  return useMutation({
    mutationFn: (input: Partial<FinancialSettingsDTO>) => configurationApi.updateFinancial(input),
    onSuccess: invalidate,
  });
}

export function useUpdateAiSettings() {
  const invalidate = useInvalidate(configurationKeys.ai);
  return useMutation({
    mutationFn: (input: Partial<Omit<AiSettingsDTO, 'providersDisponiveis'>>) =>
      configurationApi.updateAi(input),
    onSuccess: invalidate,
  });
}

export function useCreateExtraField() {
  const invalidate = useInvalidate(configurationKeys.extraFields);
  const invalidateDashboard = useInvalidate(configurationKeys.dashboard);
  return useMutation({
    mutationFn: (input: Omit<ExtraFieldDTO, 'id' | 'ativo'>) => configurationApi.createExtraField(input),
    onSuccess: () => {
      invalidate();
      invalidateDashboard();
    },
  });
}

export function useUpdateExtraField() {
  const invalidate = useInvalidate(configurationKeys.extraFields);
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Omit<ExtraFieldDTO, 'id' | 'entidade' | 'chave'>> }) =>
      configurationApi.updateExtraField(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteExtraField() {
  const invalidate = useInvalidate(configurationKeys.extraFields);
  const invalidateDashboard = useInvalidate(configurationKeys.dashboard);
  return useMutation({
    mutationFn: (id: string) => configurationApi.deleteExtraField(id),
    onSuccess: () => {
      invalidate();
      invalidateDashboard();
    },
  });
}

export function useBulkUpdateRequiredFields() {
  const invalidate = useInvalidate(configurationKeys.requiredFields);
  return useMutation({
    mutationFn: (itens: RequiredFieldDTO[]) => configurationApi.bulkUpdateRequiredFields(itens),
    onSuccess: invalidate,
  });
}

function useValueSetsInvalidation() {
  const invalidate = useInvalidate(configurationKeys.valueSets);
  const invalidateDashboard = useInvalidate(configurationKeys.dashboard);
  return () => {
    invalidate();
    invalidateDashboard();
  };
}

export function useCreateValueSet() {
  const invalidate = useValueSetsInvalidation();
  return useMutation({
    mutationFn: (input: { nome: string; descricao?: string }) => configurationApi.createValueSet(input),
    onSuccess: invalidate,
  });
}

export function useUpdateValueSet() {
  const invalidate = useValueSetsInvalidation();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { nome?: string; descricao?: string; ativo?: boolean } }) =>
      configurationApi.updateValueSet(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteValueSet() {
  const invalidate = useValueSetsInvalidation();
  return useMutation({
    mutationFn: (id: string) => configurationApi.deleteValueSet(id),
    onSuccess: invalidate,
  });
}

export function useAddValueSetItem() {
  const invalidate = useValueSetsInvalidation();
  return useMutation({
    mutationFn: ({ conjuntoId, valor }: { conjuntoId: string; valor: string }) =>
      configurationApi.addValueSetItem(conjuntoId, { valor }),
    onSuccess: invalidate,
  });
}

export function useRemoveValueSetItem() {
  const invalidate = useValueSetsInvalidation();
  return useMutation({
    mutationFn: ({ conjuntoId, itemId }: { conjuntoId: string; itemId: string }) =>
      configurationApi.removeValueSetItem(conjuntoId, itemId),
    onSuccess: invalidate,
  });
}

function useTaskCategoriesInvalidation() {
  const invalidate = useInvalidate(configurationKeys.taskCategories);
  const invalidateDashboard = useInvalidate(configurationKeys.dashboard);
  return () => {
    invalidate();
    invalidateDashboard();
  };
}

export function useCreateTaskCategory() {
  const invalidate = useTaskCategoriesInvalidation();
  return useMutation({
    mutationFn: (input: { nome: string; cor?: string }) => configurationApi.createTaskCategory(input),
    onSuccess: invalidate,
  });
}

export function useUpdateTaskCategory() {
  const invalidate = useTaskCategoriesInvalidation();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Omit<TaskCategoryDTO, 'id'>> }) =>
      configurationApi.updateTaskCategory(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteTaskCategory() {
  const invalidate = useTaskCategoriesInvalidation();
  return useMutation({
    mutationFn: (id: string) => configurationApi.deleteTaskCategory(id),
    onSuccess: invalidate,
  });
}

function useCollaboratorGroupsInvalidation() {
  const invalidate = useInvalidate(configurationKeys.collaboratorGroups);
  const invalidateDashboard = useInvalidate(configurationKeys.dashboard);
  return () => {
    invalidate();
    invalidateDashboard();
  };
}

export function useCreateCollaboratorGroup() {
  const invalidate = useCollaboratorGroupsInvalidation();
  return useMutation({
    mutationFn: (input: { nome: string; descricao?: string }) => configurationApi.createCollaboratorGroup(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCollaboratorGroup() {
  const invalidate = useCollaboratorGroupsInvalidation();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: { nome?: string; descricao?: string; ativo?: boolean };
    }) => configurationApi.updateCollaboratorGroup(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteCollaboratorGroup() {
  const invalidate = useCollaboratorGroupsInvalidation();
  return useMutation({
    mutationFn: (id: string) => configurationApi.deleteCollaboratorGroup(id),
    onSuccess: invalidate,
  });
}

export function useAddCollaboratorGroupMember() {
  const invalidate = useCollaboratorGroupsInvalidation();
  return useMutation({
    mutationFn: ({ grupoId, membroId }: { grupoId: string; membroId: string }) =>
      configurationApi.addCollaboratorGroupMember(grupoId, membroId),
    onSuccess: invalidate,
  });
}

export function useRemoveCollaboratorGroupMember() {
  const invalidate = useCollaboratorGroupsInvalidation();
  return useMutation({
    mutationFn: ({ grupoId, membroId }: { grupoId: string; membroId: string }) =>
      configurationApi.removeCollaboratorGroupMember(grupoId, membroId),
    onSuccess: invalidate,
  });
}

function useCargosInvalidation() {
  const invalidate = useInvalidate(configurationKeys.cargos);
  const invalidateDashboard = useInvalidate(configurationKeys.dashboard);
  return () => {
    invalidate();
    invalidateDashboard();
  };
}

export function useCreateCargo() {
  const invalidate = useCargosInvalidation();
  return useMutation({
    mutationFn: (input: { nome: string; descricao?: string; ordem?: number }) =>
      configurationApi.createCargo(input),
    onSuccess: invalidate,
  });
}

export function useUpdateCargo() {
  const invalidate = useCargosInvalidation();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Omit<CargoDTO, 'id'>> }) =>
      configurationApi.updateCargo(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteCargo() {
  const invalidate = useCargosInvalidation();
  return useMutation({
    mutationFn: (id: string) => configurationApi.deleteCargo(id),
    onSuccess: invalidate,
  });
}

function useTaskTemplatesInvalidation() {
  const invalidate = useInvalidate(configurationKeys.taskTemplates);
  const invalidateDashboard = useInvalidate(configurationKeys.dashboard);
  return () => {
    invalidate();
    invalidateDashboard();
  };
}

export function useCreateTaskTemplate() {
  const invalidate = useTaskTemplatesInvalidation();
  return useMutation({
    mutationFn: (input: {
      nome: string;
      categoriaId?: string;
      prazoDiasPadrao: number;
      prioridadePadrao: TaskTemplateDTO['prioridadePadrao'];
      checklist: string[];
    }) => configurationApi.createTaskTemplate(input),
    onSuccess: invalidate,
  });
}

export function useUpdateTaskTemplate() {
  const invalidate = useTaskTemplatesInvalidation();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Omit<TaskTemplateDTO, 'id' | 'categoria'>> }) =>
      configurationApi.updateTaskTemplate(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteTaskTemplate() {
  const invalidate = useTaskTemplatesInvalidation();
  return useMutation({
    mutationFn: (id: string) => configurationApi.deleteTaskTemplate(id),
    onSuccess: invalidate,
  });
}

function useHolidaysInvalidation() {
  const invalidate = useInvalidate(configurationKeys.holidays);
  const invalidateDashboard = useInvalidate(configurationKeys.dashboard);
  return () => {
    invalidate();
    invalidateDashboard();
  };
}

export function useCreateHoliday() {
  const invalidate = useHolidaysInvalidation();
  return useMutation({
    mutationFn: (input: { nome: string; data: string; tipo: HolidayDTO['tipo']; uf?: string; recorrenteAnual: boolean }) =>
      configurationApi.createHoliday(input),
    onSuccess: invalidate,
  });
}

export function useUpdateHoliday() {
  const invalidate = useHolidaysInvalidation();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<Omit<HolidayDTO, 'id'>> }) =>
      configurationApi.updateHoliday(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteHoliday() {
  const invalidate = useHolidaysInvalidation();
  return useMutation({
    mutationFn: (id: string) => configurationApi.deleteHoliday(id),
    onSuccess: invalidate,
  });
}

export type { EntidadeConfiguravel };
