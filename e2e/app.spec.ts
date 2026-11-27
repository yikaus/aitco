import { test, expect } from '@playwright/test';

test('dashboard quick setup, navigation, controls, exports and responsive layout', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');
  await expect(page.getByText('Annual enterprise AI TCO')).toBeVisible();
  await expect(page.getByText('Quick scenario setup')).toBeVisible();

  // First-time user can configure directly on Overview
  await page.getByLabel('Enterprise size').selectOption('Large');
  await page.screenshot({ path: `test-results/${testInfo.project.name}-dashboard.png`, fullPage: true });

  const mobile = testInfo.project.name === 'mobile';
  if (mobile) await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Workloads & adoption' }).click();
  await expect(page.getByRole('heading', { name: 'Workloads & adoption.' })).toBeVisible();
  await expect(page.getByLabel('Total employees')).toHaveValue('20000');

  if (mobile) await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: '5-year forecast' }).click();
  await expect(page.getByText('Unit price vs. total expenditure')).toBeVisible();
  await page.getByLabel('Demand projection').selectOption('responsive');
  await page.getByLabel('Demand price elasticity').fill('1');
  await expect(page.getByText('Forecast ledger')).toBeVisible();

  if (mobile) await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('button', { name: 'Compare scenarios' }).click();
  await expect(page.getByText('One million monthly skill benchmark')).toBeVisible();
  await page.getByRole('button', { name: 'Save current' }).click();
  await expect(page.getByRole('button', { name: 'Load', exact: true })).toBeVisible();
  await page.screenshot({ path: `test-results/${testInfo.project.name}-comparison.png`, fullPage: true });

  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
