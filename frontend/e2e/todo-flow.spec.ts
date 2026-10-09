import { test, expect } from '@playwright/test';

test('signup -> add todo -> complete -> delete', async ({ page }) => {
  const email = `e2e_${Date.now()}@example.com`;

  await page.goto('/signup');
  await page.getByLabel('Name').fill('E2E User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('secret123');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/dashboard/);
  await expect(page.getByText('Nothing here yet')).toBeVisible();

  await page.getByRole('button', { name: 'New todo' }).click();
  await page.getByLabel('Title').fill('Buy gas pipe');
  await page.getByRole('radio', { name: 'High' }).click();
  await page.getByLabel('Tags').fill('home');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Add todo' }).click();

  const card = page.getByRole('article').filter({ hasText: 'Buy gas pipe' });
  await expect(card).toBeVisible();
  await expect(card.getByText('high')).toBeVisible();

  await card.getByRole('button', { name: 'Mark as done' }).click();
  await expect(card.getByRole('button', { name: 'Mark as pending' })).toBeVisible();

  await page.getByLabel('Search todos').fill('does-not-exist');
  await expect(page.getByText('No matching todos')).toBeVisible();
  await page.getByLabel('Search todos').fill('');

  await card.getByRole('button', { name: 'Delete todo' }).click();
  await expect(card).toHaveCount(0);
});

test('rejects wrong password', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('nobody@example.com');
  await page.getByLabel('Password').fill('wrongpass');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByText('Invalid credentials')).toBeVisible();
});
