'use client';

import { useQuery } from '@tanstack/react-query';
import { useOffice } from '@/features/office';
import { configurationApi, type EntidadeConfiguravel } from './configuration.api';
import { configurationKeys } from './keys';

function useOfficeId() {
  return useOffice().escritorioAtivoId ?? '';
}

export function useConfigurationDashboard() {
  const officeId = useOfficeId();
  return useQuery({
    queryKey: configurationKeys.dashboard(officeId),
    queryFn: () => configurationApi.dashboardSummary(),
    enabled: !!officeId,
  });
}

export function useGeneralSettings() {
  const officeId = useOfficeId();
  return useQuery({
    queryKey: configurationKeys.general(officeId),
    queryFn: () => configurationApi.getGeneral(),
    enabled: !!officeId,
  });
}

export function useFinancialSettings(enabled = true) {
  const officeId = useOfficeId();
  return useQuery({
    queryKey: configurationKeys.financial(officeId),
    queryFn: () => configurationApi.getFinancial(),
    enabled: !!officeId && enabled,
  });
}

export function useAiSettings() {
  const officeId = useOfficeId();
  return useQuery({
    queryKey: configurationKeys.ai(officeId),
    queryFn: () => configurationApi.getAi(),
    enabled: !!officeId,
  });
}

export function useExtraFields(entidade?: EntidadeConfiguravel) {
  const officeId = useOfficeId();
  return useQuery({
    queryKey: [...configurationKeys.extraFields(officeId), entidade ?? 'all'],
    queryFn: () => configurationApi.listExtraFields(entidade),
    enabled: !!officeId,
  });
}

export function useRequiredFields(entidade?: EntidadeConfiguravel) {
  const officeId = useOfficeId();
  return useQuery({
    queryKey: [...configurationKeys.requiredFields(officeId), entidade ?? 'all'],
    queryFn: () => configurationApi.listRequiredFields(entidade),
    enabled: !!officeId,
  });
}

export function useValueSets() {
  const officeId = useOfficeId();
  return useQuery({
    queryKey: configurationKeys.valueSets(officeId),
    queryFn: () => configurationApi.listValueSets(),
    enabled: !!officeId,
  });
}

export function useTaskCategories() {
  const officeId = useOfficeId();
  return useQuery({
    queryKey: configurationKeys.taskCategories(officeId),
    queryFn: () => configurationApi.listTaskCategories(),
    enabled: !!officeId,
  });
}

export function useCollaboratorGroups() {
  const officeId = useOfficeId();
  return useQuery({
    queryKey: configurationKeys.collaboratorGroups(officeId),
    queryFn: () => configurationApi.listCollaboratorGroups(),
    enabled: !!officeId,
  });
}

export function useCargos() {
  const officeId = useOfficeId();
  return useQuery({
    queryKey: configurationKeys.cargos(officeId),
    queryFn: () => configurationApi.listCargos(),
    enabled: !!officeId,
  });
}

export function useTaskTemplates() {
  const officeId = useOfficeId();
  return useQuery({
    queryKey: configurationKeys.taskTemplates(officeId),
    queryFn: () => configurationApi.listTaskTemplates(),
    enabled: !!officeId,
  });
}

export function useHolidays() {
  const officeId = useOfficeId();
  return useQuery({
    queryKey: configurationKeys.holidays(officeId),
    queryFn: () => configurationApi.listHolidays(),
    enabled: !!officeId,
  });
}
