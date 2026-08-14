import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@/providers/theme-provider';
import { renderWithProviders } from '@/test/render';
import { ThemePreference } from './theme-preference';

function renderPreference() {
  return renderWithProviders(
    <ThemeProvider>
      <ThemePreference />
    </ThemeProvider>,
  );
}

async function chooseTheme(label: 'Sistema' | 'Claro' | 'Escuro') {
  const user = userEvent.setup();
  await user.click(screen.getByLabelText('Tema'));
  await user.click(await screen.findByRole('option', { name: label }));
}

describe('ThemePreference', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it.each([
    ['Claro', 'light'],
    ['Escuro', 'dark'],
  ] as const)('ativa %s imediatamente', async (label, value) => {
    renderPreference();
    await chooseTheme(label);

    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', value));
    expect(localStorage.getItem('theme')).toBe(value);
  });

  it('usa e acompanha a preferência do sistema', async () => {
    let prefersDark = false;
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    window.matchMedia = ((query: string) => ({
      matches: prefersDark,
      media: query,
      onchange: null,
      addListener: (listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
      removeListener: (listener: (event: MediaQueryListEvent) => void) =>
        listeners.delete(listener),
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
        listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
        listeners.delete(listener),
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    renderPreference();

    await chooseTheme('Sistema');
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'light'));

    prefersDark = true;
    listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent));

    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'dark'));
  });

  it('mantém a escolha após remontagem', async () => {
    const firstRender = renderPreference();
    await chooseTheme('Escuro');
    await waitFor(() => expect(localStorage.getItem('theme')).toBe('dark'));

    firstRender.unmount();
    document.documentElement.removeAttribute('data-theme');
    renderPreference();

    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'dark'));
    expect(screen.getByLabelText('Tema')).toHaveTextContent('Escuro');
  });
});
