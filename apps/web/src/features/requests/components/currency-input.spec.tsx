import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CurrencyInput } from './currency-input';

function Field() {
  const [value, setValue] = useState('');
  return <CurrencyInput aria-label="Valor pedido" value={value} onValueChange={setValue} />;
}

describe('CurrencyInput', () => {
  it('desloca dígitos em centavos e permite apagar', async () => {
    const user = userEvent.setup();
    render(<Field />);
    const input = screen.getByLabelText('Valor pedido');
    await user.click(input);
    expect(input).toHaveValue('R$ 0,00');
    await user.keyboard('1000');
    expect(input).toHaveValue('R$ 10,00');
    await user.keyboard('{Backspace}');
    expect(input).toHaveValue('R$ 1,00');
    await user.keyboard('{Delete}');
    expect(input).toHaveValue('R$ 0,00');
  });
  it('cola valor brasileiro sem perda', async () => {
    const user = userEvent.setup();
    render(<Field />);
    const input = screen.getByLabelText('Valor pedido');
    await user.click(input);
    await user.paste('R$ 81.213,14');
    expect(input).toHaveValue('R$ 81.213,14');
  });
});
