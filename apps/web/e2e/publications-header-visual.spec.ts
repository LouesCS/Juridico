import { expect, test } from '@playwright/test';

async function login(page: import('@playwright/test').Page) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.goto('http://localhost:3000/login');
    await page.getByLabel('E-mail').fill('demo@quilombodev.com');
    await page.getByLabel('Senha').fill('Demo@123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    const authenticated = await page
      .waitForURL((url) => url.pathname !== '/login', { timeout: 30_000 })
      .then(() => true)
      .catch(() => false);
    if (authenticated) return;
  }
  throw new Error('Não foi possível autenticar no ambiente visual mockado.');
}

test('cabeçalho e linhas da grid de Publicações', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page);
  await page.goto('http://localhost:3000/publicacoes');

  const table = page.getByRole('table');
  await expect(table).toBeVisible();
  await expect(table.getByRole('columnheader')).toHaveCount(5);
  await expect(table.getByText('Publicação', { exact: true })).toHaveCount(0);
  await expect(table.getByText('Origem', { exact: true })).toHaveCount(0);
  await expect(table.getByText('Vínculos', { exact: true })).toHaveCount(0);

  for (const label of [
    'DATA DA PUBLICAÇÃO',
    'DATA DE CADASTRO',
    'DESCRIÇÃO',
    'DIÁRIO',
    'CIDADE',
    'ÓRGÃO',
    'VARA',
    'NOME DE VÍNCULO',
    'PROCESSO NA PUBLICAÇÃO',
    'PASTA',
    'PROCESSO VINCULADO',
    'TAREFAS',
    'AÇÕES',
  ]) {
    await expect(table.getByText(label, { exact: true })).toHaveCount(1);
  }

  const completeRow = table.getByRole('row').filter({ hasText: '1234567-19.2024.8.26.0001' });
  await expect(completeRow.getByRole('link', { name: 'MARIA/1' })).toBeVisible();
  await expect(completeRow.getByRole('link', { name: 'Ação de indenização' })).toBeVisible();
  await completeRow.getByRole('button', { name: 'Ações da publicação' }).click();
  await expect(page.getByRole('menuitem', { name: 'Visualizar' })).toBeVisible();
  await page.keyboard.press('Escape');

  const incompleteRow = table.getByRole('row').filter({ hasText: '7654321-88.2025.8.26.0002' });
  await expect(incompleteRow.getByText('--').first()).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true);

  await page.screenshot({ path: 'test-results/publications-header-desktop.png', fullPage: true });
});

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'desktop-1024', width: 1024, height: 900 },
  { name: 'tablet-768', width: 768, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`${viewport.name}: topo compacto e filtros de Publicações`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    await login(page);
    await page.goto('http://localhost:3000/publicacoes');
    await expect(page.getByRole('heading', { name: 'Publicações', exact: true })).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByLabel('Buscar publicações')).toBeVisible();
    await expect(page.getByLabel('Visualização')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mais filtros' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Consultar' })).toBeVisible();
    await expect(page.getByText('Total de publicações', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Cidade')).toHaveCount(0);

    await page.getByRole('button', { name: 'Mais filtros' }).click();
    const panel = page.getByRole('dialog', { name: 'Mais filtros' });
    await expect(panel.getByLabel('Cidade')).toBeVisible();
    await expect(panel.getByLabel('Visualização')).toHaveCount(0);
    const panelBox = await panel.boundingBox();
    expect(panelBox?.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(panelBox?.width).toBeGreaterThan(viewport.name === 'desktop' ? 700 : 380);
    expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: `test-results/publications-advanced-filters-${viewport.name}.png`,
      fullPage: true,
    });
    await panel.getByRole('button', { name: 'Cancelar' }).click();
    await expect(panel).not.toBeVisible();

    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: `test-results/publications-filters-${viewport.name}.png`,
      fullPage: true,
    });
  });
}

test('barra de Publicações reutiliza as proporções de Movimentações Extrajudiciais', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page);

  await page.goto('http://localhost:3000/movimentacoes-extrajudiciais');
  const movementSearch = page.getByLabel('Buscar movimentações');
  const movementSelect = page.getByLabel('Leitura');
  await expect(movementSearch).toBeVisible({ timeout: 30_000 });
  const movementSearchBox = await movementSearch.boundingBox();
  const movementSelectBox = await movementSelect.boundingBox();
  const movementHeaderStyle = await page
    .getByRole('columnheader')
    .first()
    .locator('span')
    .first()
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
      };
    });
  const movementSecondaryHeaderStyle = await page
    .getByRole('columnheader')
    .first()
    .locator('span')
    .nth(1)
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
      };
    });

  await page.goto('http://localhost:3000/publicacoes');
  const publicationSearch = page.getByLabel('Buscar publicações');
  const publicationSelect = page.getByLabel('Visualização');
  await expect(publicationSearch).toBeVisible({ timeout: 30_000 });
  const publicationSearchBox = await publicationSearch.boundingBox();
  const publicationSelectBox = await publicationSelect.boundingBox();
  const moreFiltersBox = await page.getByRole('button', { name: 'Mais filtros' }).boundingBox();
  const consultBox = await page.getByRole('button', { name: 'Consultar' }).boundingBox();
  const publicationHeaderStyle = await page
    .getByRole('columnheader')
    .first()
    .locator('span')
    .first()
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
      };
    });
  const publicationSecondaryHeaderStyle = await page
    .getByRole('columnheader')
    .first()
    .locator('span')
    .nth(1)
    .evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
      };
    });

  expect(
    Math.abs((publicationSearchBox?.width ?? 0) - (movementSearchBox?.width ?? 0)),
  ).toBeLessThan(2);
  expect(
    Math.abs((publicationSelectBox?.width ?? 0) - (movementSelectBox?.width ?? 0)),
  ).toBeLessThan(2);
  expect(publicationSearchBox?.height).toBe(publicationSelectBox?.height);
  expect(publicationSearchBox?.height).toBe(moreFiltersBox?.height);
  expect(publicationSearchBox?.height).toBe(consultBox?.height);
  expect((consultBox?.x ?? 0) + (consultBox?.width ?? 0)).toBeLessThan(1200);
  expect(publicationHeaderStyle).toEqual(movementHeaderStyle);
  expect(publicationSecondaryHeaderStyle).toEqual(movementSecondaryHeaderStyle);
});
