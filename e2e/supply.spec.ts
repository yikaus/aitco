import { test, expect } from '@playwright/test';

test('supply toggles preserve configuration, exclude disabled costs and price adjustment reacts', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'Supply configuration is a wide advanced-modeling page; tested on desktop.');
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await page.getByRole('button', { name: 'Supply & execution' }).click();
  await expect(page.getByRole('heading', { name: 'Global Token Price Adjustment' })).toBeVisible();

  const slider = page.getByRole('slider', { name: 'Global Token Price Adjustment' });
  await expect(slider).toHaveValue('1');
  const baseline = await page.locator('body').innerText();

  await expect(page.getByText('Self-hosted inference capacity', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Student / distilled models', { exact: true })).toHaveCount(0);

  await page.getByLabel('Enable self-hosted inference').check();
  await expect(page.getByRole('heading', { name: 'Self-hosted inference capacity' })).toBeVisible();
  await page.getByLabel('Enable self-hosted inference').uncheck();
  await expect(page.getByRole('heading', { name: 'Self-hosted inference capacity' })).toHaveCount(0);

  await page.getByLabel('Enable enterprise student models / distillation').check();
  await expect(page.getByRole('heading', { name: 'Student / distilled models' })).toBeVisible();
  await page.getByLabel('Enable enterprise student models / distillation').uncheck();
  await expect(page.getByRole('heading', { name: 'Student / distilled models' })).toHaveCount(0);

  await slider.fill('2');
  await expect(page.locator('body')).toContainText('2.00×');
  await expect(page.locator('body')).toContainText('200%');

  expect(errors).toEqual([]);
  expect(baseline).toContain('Saved self-hosted allocations');
});
