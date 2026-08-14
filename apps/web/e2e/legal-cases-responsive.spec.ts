import { expect, test } from '@playwright/test';

const judicialVisualBaseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

const routes = [
  '/processos',
  '/processos-judiciais',
  '/processos/demo-case-1',
  '/processos-extrajudiciais',
  '/processos/case-extra-1',
  '/pedidos',
  '/pedidos/request-1',
  '/pastas/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
];

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`${viewport.name}: filtros de data do Judicial mantêm alinhamento responsivo`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto(`${judicialVisualBaseUrl}/login`);
    await page.getByLabel('E-mail').fill('demo@quilombodev.com');
    await page.getByLabel('Senha').fill('Demo@123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).not.toBe('/login');
    await page.goto(`${judicialVisualBaseUrl}/processos-judiciais`);

    const minimum = page.getByLabel('Data de entrada — Mín.');
    const maximum = page.getByLabel('Data de entrada — Máx.');
    const consult = page.getByRole('button', { name: 'Consultar' });
    const clear = page.getByRole('button', { name: 'Limpar' });
    await expect(minimum).toBeVisible();
    await expect(maximum).toBeVisible();

    const boxes = await Promise.all([
      minimum.boundingBox(),
      maximum.boundingBox(),
      consult.boundingBox(),
      clear.boundingBox(),
    ]);
    expect(boxes.every(Boolean)).toBe(true);
    const [minBox, maxBox, consultBox, clearBox] = boxes as NonNullable<(typeof boxes)[number]>[];
    expect(Math.abs(minBox.width - maxBox.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(minBox.height - maxBox.height)).toBeLessThanOrEqual(1);

    if (viewport.name === 'desktop') {
      expect(Math.abs(minBox.y - maxBox.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(minBox.y - consultBox.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(minBox.y - clearBox.y)).toBeLessThanOrEqual(1);
    } else {
      expect(maxBox.y).toBeGreaterThan(minBox.y + minBox.height);
      expect(Math.abs(consultBox.y - clearBox.y)).toBeLessThanOrEqual(1);
    }

    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: `test-results/filtros-judiciais-${viewport.name}.png`,
      fullPage: true,
    });
  });
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`${viewport.name}: Processos e Pasta não causam overflow global`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.setViewportSize(viewport);
    await page.goto('http://localhost:3000/login');
    await page.getByLabel('E-mail').fill('demo@quilombodev.com');
    await page.getByLabel('Senha').fill('Demo@123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).not.toBe('/login');

    for (const route of routes) {
      const url = `http://localhost:3000${route}`;
      await page
        .goto(url, { waitUntil: 'domcontentloaded' })
        .catch(() => page.goto(url, { waitUntil: 'domcontentloaded' }));
      await expect(page.locator('body')).toBeVisible();
      if (route === '/processos/case-extra-1') {
        await expect(page.getByRole('heading', { name: 'Processo extrajudicial' })).toBeVisible();
      }
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: `test-results/processos-${viewport.name}-${route.replaceAll('/', '-') || 'root'}.png`,
        fullPage: true,
      });
    }
  });
}

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  test(`${viewport.name}: edição especializada do Processo Extrajudicial`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.setViewportSize(viewport);
    await page.goto('http://localhost:3000/login');
    await page.getByLabel('E-mail').fill('demo@quilombodev.com');
    await page.getByLabel('Senha').fill('Demo@123');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).not.toBe('/login');
    await page.goto('http://localhost:3000/processos/case-extra-1');
    await page.getByRole('button', { name: 'Editar' }).click();
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Editar Processo Extrajudicial' }),
    ).toBeVisible();
    await page.waitForTimeout(500);
    await expect(dialog.getByText('Número CNJ (opcional)')).toHaveCount(0);
    await expect(dialog.getByText('Número do Benefício')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: `test-results/editar-extrajudicial-${viewport.name}.png`,
      fullPage: true,
    });
  });
}

test('desktop: fecha Partes, criação contextual de Tarefa e Auditoria do Extrajudicial', async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3000/login');
  await page.getByLabel('E-mail').fill('demo@quilombodev.com');
  await page.getByLabel('Senha').fill('Demo@123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).not.toBe('/login');
  await page.goto('http://localhost:3000/processos/case-extra-1');
  await expect(page.getByRole('heading', { name: 'Processo extrajudicial' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Requerentes' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Requeridos' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Outras partes' })).toBeVisible();
  await expect(page.locator('main').getByText('Assistente IA')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Tarefas' }).click();
  await page.getByRole('button', { name: 'Adicionar tarefa' }).click();
  await expect(page.getByRole('heading', { name: 'Nova tarefa' })).toBeVisible();
  await expect(page.getByText('Processo atual')).toBeVisible();
  await page.getByLabel('Título').fill('Tarefa contextual E2E');
  await page.getByRole('button', { name: 'Criar tarefa' }).click();
  await expect(page.getByRole('link', { name: 'Tarefa contextual E2E' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Atividades recentes' })).toBeVisible();
  await page.getByRole('tab', { name: 'Atividades antigas' }).click();
  await expect(page.getByText('Nenhuma atividade de auditoria encontrada.')).toBeVisible();
});

test('desktop: grid delimitada e filtros específicos do Extrajudicial', async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3000/login');
  await page.getByLabel('E-mail').fill('demo@quilombodev.com');
  await page.getByLabel('Senha').fill('Demo@123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).not.toBe('/login');
  await page.goto('http://localhost:3000/processos-extrajudiciais');
  await expect(page.locator('[data-slot="data-table-surface"]')).toBeVisible();
  await page.getByRole('button', { name: /Mais filtros/ }).click();
  await expect(page.getByLabel('Protocolo')).toBeVisible();
  await expect(page.getByLabel('Sem movimentações após')).toBeVisible();
  await expect(page.getByText('Prioridade')).toHaveCount(0);
  await page.getByLabel('Protocolo').fill('700123955');
  await page.getByRole('button', { name: 'Consultar' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('protocolo')).toBe('700123955');
});

test('desktop: adiciona participante, troca principal e persiste pelo agregado', async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://localhost:3000/login');
  await page.getByLabel('E-mail').fill('demo@quilombodev.com');
  await page.getByLabel('Senha').fill('Demo@123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).not.toBe('/login');
  await page.goto('http://localhost:3000/processos/case-extra-1');
  await page.getByRole('button', { name: 'Editar' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input').nth(0).fill('EXT-E2E-1');
  await dialog.locator('input[type="date"]').first().fill('2026-08-12');
  await dialog.getByRole('button', { name: 'Adicionar requerente' }).click();
  const firstClient = page.getByRole('option').first();
  const participantName = (await firstClient.innerText()).split('\n')[0];
  await firstClient.click();
  await dialog.getByRole('button', { name: 'Adicionar', exact: true }).first().click();
  await dialog.getByRole('button', { name: 'Definir como principal' }).first().click();
  await dialog.getByRole('button', { name: 'Adicionar requerido' }).click();
  await page.getByRole('option').first().click();
  await dialog.getByRole('button', { name: 'Adicionar', exact: true }).nth(1).click();
  await dialog.getByRole('button', { name: 'Definir como principal' }).last().click();
  const responsePromise = page.waitForResponse((response) => response.url().includes('/legal-cases/') && response.request().method() === 'PATCH');
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  await expect(dialog).not.toBeVisible();
  await expect(page.getByText(participantName).first()).toBeVisible();
  await page.getByRole('button', { name: 'Editar' }).click();
  await expect(page.getByRole('dialog').getByText(participantName).first()).toBeVisible();
});
