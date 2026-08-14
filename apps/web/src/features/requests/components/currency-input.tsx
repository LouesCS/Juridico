'use client';
import * as React from 'react';
import { Input } from '@/components/ui/input';
import { decimalToCents, formatBRLCurrency } from '../domain/money';

export function CurrencyInput({
  value,
  onValueChange,
  ...props
}: Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> & {
  value: string;
  onValueChange: (cents: string) => void;
}) {
  const [focused, setFocused] = React.useState(false);
  const digits = value.replace(/^0+(?=\d)/, '');
  return (
    <Input
      {...props}
      inputMode="numeric"
      value={value || focused ? formatBRLCurrency(digits || '0') : ''}
      onFocus={(e) => {
        setFocused(true);
        e.currentTarget.select();
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      onChange={() => undefined}
      onPaste={(e) => {
        e.preventDefault();
        const cents = decimalToCents(e.clipboardData.getData('text'));
        if (cents != null) onValueChange(cents);
      }}
      onKeyDown={(e) => {
        if (/^\d$/.test(e.key)) {
          e.preventDefault();
          onValueChange(`${digits}${e.key}`.replace(/^0+(?=\d)/, ''));
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          onValueChange(digits.slice(0, -1));
        } else if (e.key === 'Delete') {
          e.preventDefault();
          onValueChange('');
        }
      }}
    />
  );
}
