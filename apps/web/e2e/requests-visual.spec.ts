import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  await page.goto('http://localhost:3000/login');
  await page.getByLabel('E-mail').fill('demo@quilombodev.com');
  await page.getByLabel('Senha').fill('Demo@123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).not.toBe('/login');
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`${viewport.name}: grid e formulário de Pedidos`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    await login(page);
    await page.goto('http://localhost:3000/pedidos');
    await expect(page.getByRole('heading', { name: /Pedidos \(\d+\)/ })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: `test-results/pedidos-grid-${viewport.name}.png`,
      fullPage: true,
    });
    await page.goto('http://localhost:3000/pedidos/request-1');
    await page.getByRole('button', { name: 'Editar' }).click();
    await expect(page.getByRole('combobox', { name: 'Processo judicial' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Processo extrajudicial' })).toBeVisible();
    const judicial = page.getByRole('combobox', { name: 'Processo judicial' });
    const initialHeight = await judicial.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    await judicial.click();
    await page.getByRole('option', { name: /CNJ 1234567/ }).click();
    expect(await judicial.evaluate((element) => element.getBoundingClientRect().height)).toBe(
      initialHeight,
    );
    await judicial.hover();
    await expect(page.getByRole('tooltip')).toContainText('Ação de indenização por danos morais');
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: `test-results/pedidos-form-${viewport.name}.png`,
      fullPage: true,
    });
  });
}
