'use client';

import { useTheme } from 'next-themes';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const THEME_OPTIONS = [
  { value: 'system', label: 'Sistema' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
] as const;

export function ThemePreference() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-2">
      <Label htmlFor="profile-theme">Tema</Label>
      <Select value={theme ?? 'system'} onValueChange={setTheme}>
        <SelectTrigger id="profile-theme" className="w-full sm:w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {THEME_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
