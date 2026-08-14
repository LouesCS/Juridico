'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useRoles } from '../api/queries';

export function RoleSelect({
  value,
  onChange,
  disabled,
  placeholder = 'Selecione um papel',
}: {
  value: string | undefined;
  onChange: (papelId: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const { data: roles, isLoading } = useRoles();

  if (isLoading) return <Skeleton className="h-9 w-full" />;

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger aria-label="Papel">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {roles?.map((role) => (
          <SelectItem key={role.id} value={role.id}>
            {role.nome}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
